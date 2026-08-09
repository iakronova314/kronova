import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeBillingAdmin, readIdempotencyKey } from '@/lib/server/billing/access'
import { getSiteUrl, getStripe, getStripePriceId, isPaidPlanCode } from '@/lib/server/billing/stripe'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { tenantId?: unknown; planCode?: unknown } | null
  const auth = await authorizeBillingAdmin(body?.tenantId)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!isPaidPlanCode(body?.planCode)) return NextResponse.json({ error: 'Plan no disponible.' }, { status: 400 })
  const requestKey = readIdempotencyKey(request)
  if (!requestKey) return NextResponse.json({ error: 'Idempotency-Key es obligatorio.' }, { status: 400 })

  try {
    const admin = createAdminClient()
    const { data: current } = await admin.from('subscriptions').select('id,status').eq('tenant_id', auth.tenantId).eq('provider', 'stripe')
      .in('status', ['trialing', 'active', 'past_due', 'paused']).or(`current_period_end.is.null,current_period_end.gt.${new Date().toISOString()}`).maybeSingle()
    if (current) return NextResponse.json({ error: 'La organizacion ya tiene una suscripcion. Gestionela desde el portal.' }, { status: 409 })
    const stripe = getStripe()
    let { data: billingCustomer } = await admin.from('billing_customers').select('id,external_customer_id')
      .eq('tenant_id', auth.tenantId).eq('provider', 'stripe').maybeSingle()
    if (!billingCustomer) {
      const customer = await stripe.customers.create({ email: auth.email, metadata: { tenant_id: auth.tenantId } }, { idempotencyKey: `customer:${auth.tenantId}` })
      const result = await admin.from('billing_customers').upsert({
        tenant_id: auth.tenantId, provider: 'stripe', external_customer_id: customer.id,
        email: auth.email ?? null, metadata: { source: 'checkout' },
      }, { onConflict: 'tenant_id,provider' }).select('id,external_customer_id').single()
      if (result.error) throw result.error
      billingCustomer = result.data
    }
    const siteUrl = getSiteUrl()
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', customer: billingCustomer.external_customer_id, client_reference_id: auth.tenantId,
      line_items: [{ price: getStripePriceId(body.planCode), quantity: 1 }],
      metadata: { tenant_id: auth.tenantId, plan_code: body.planCode },
      subscription_data: { metadata: { tenant_id: auth.tenantId, plan_code: body.planCode } },
      success_url: `${siteUrl}/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/dashboard?billing=canceled`,
    }, { idempotencyKey: `checkout:${auth.tenantId}:${body.planCode}:${requestKey}` })
    if (!session.url) throw new Error('Stripe did not return a Checkout URL.')
    return NextResponse.json({ url: session.url }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Stripe Checkout failed', error)
    return NextResponse.json({ error: 'No fue posible iniciar el pago.' }, { status: 503 })
  }
}
