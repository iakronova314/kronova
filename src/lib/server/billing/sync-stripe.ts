import 'server-only'
import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe, isPaidPlanCode, normalizeStripeStatus, planCodeForPrice, subscriptionPeriod } from './stripe'

type Admin = ReturnType<typeof createAdminClient>
type SyncResult = { tenantId?: string; subscriptionId?: string }
function idOf(value: string | { id: string } | null) { return typeof value === 'string' ? value : value?.id }

async function resolveTenant(admin: Admin, customerId: string, metadataTenant?: string) {
  const { data: mapped } = await admin.from('billing_customers').select('tenant_id').eq('provider', 'stripe').eq('external_customer_id', customerId).maybeSingle()
  if (mapped?.tenant_id) return String(mapped.tenant_id)
  if (!metadataTenant) return undefined
  const { data: tenant } = await admin.from('tenants').select('id').eq('id', metadataTenant).maybeSingle()
  return tenant?.id ? String(tenant.id) : undefined
}

export async function syncStripeSubscription(subscription: Stripe.Subscription) {
  const admin = createAdminClient()
  const customerId = idOf(subscription.customer)
  if (!customerId) throw new Error('Subscription has no customer.')
  const tenantId = await resolveTenant(admin, customerId, subscription.metadata.tenant_id)
  if (!tenantId) throw new Error('Stripe customer is not associated with a tenant.')
  const item = subscription.items.data[0]
  const planCode = planCodeForPrice(item?.price.id ?? '') ?? (isPaidPlanCode(subscription.metadata.plan_code) ? subscription.metadata.plan_code : undefined)
  if (!planCode || !item) throw new Error('Subscription price is not mapped to an application plan.')
  if (['trialing', 'active', 'past_due', 'paused'].includes(normalizeStripeStatus(subscription.status))) {
    const { error: retireTrialError } = await admin.from('subscriptions').update({
      status: 'canceled', canceled_at: new Date().toISOString(), cancel_at_period_end: false,
    }).eq('tenant_id', tenantId).eq('provider', 'manual').eq('status', 'trialing')
    if (retireTrialError) throw retireTrialError
  }
  const { data: customer, error: customerError } = await admin.from('billing_customers').upsert({
    tenant_id: tenantId, provider: 'stripe', external_customer_id: customerId, metadata: { synchronized_from: 'stripe_webhook' },
  }, { onConflict: 'tenant_id,provider' }).select('id').single()
  if (customerError) throw customerError
  const period = subscriptionPeriod(subscription)
  const values = {
    tenant_id: tenantId, plan_code: planCode, billing_customer_id: customer.id, provider: 'stripe' as const,
    external_subscription_id: subscription.id, status: normalizeStripeStatus(subscription.status),
    currency: item.price.currency.toUpperCase(), unit_amount: item.price.unit_amount ?? 0,
    current_period_start: period.start ? new Date(period.start * 1000).toISOString() : null,
    current_period_end: period.end ? new Date(period.end * 1000).toISOString() : null,
    trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    provider_state: { stripe_status: subscription.status, price_id: item.price.id, livemode: subscription.livemode },
  }
  const { data: existing } = await admin.from('subscriptions').select('id').eq('provider', 'stripe').eq('external_subscription_id', subscription.id).maybeSingle()
  const query = existing ? admin.from('subscriptions').update(values).eq('id', existing.id).select('id').single() : admin.from('subscriptions').insert(values).select('id').single()
  const { data: saved, error } = await query
  if (error) throw error
  return { tenantId, subscriptionId: saved.id }
}

export async function processStripeEvent(event: Stripe.Event): Promise<SyncResult> {
  const object = event.data.object
  if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
    return syncStripeSubscription(object as Stripe.Subscription)
  }
  let subscriptionId: string | undefined
  if (event.type === 'checkout.session.completed') subscriptionId = idOf((object as Stripe.Checkout.Session).subscription)
  if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
    const reference = (object as Stripe.Invoice).parent?.subscription_details?.subscription
    subscriptionId = typeof reference === 'string' ? reference : reference?.id
  }
  if (!subscriptionId) return {}
  return syncStripeSubscription(await getStripe().subscriptions.retrieve(subscriptionId))
}
