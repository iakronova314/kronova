import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeBillingAdmin, readIdempotencyKey } from '@/lib/server/billing/access'
import { getSiteUrl, getStripe } from '@/lib/server/billing/stripe'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { tenantId?: unknown } | null
  const auth = await authorizeBillingAdmin(body?.tenantId)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const requestKey = readIdempotencyKey(request)
  if (!requestKey) return NextResponse.json({ error: 'Idempotency-Key es obligatorio.' }, { status: 400 })
  try {
    const admin = createAdminClient()
    const { data: customer } = await admin.from('billing_customers').select('external_customer_id')
      .eq('tenant_id', auth.tenantId).eq('provider', 'stripe').maybeSingle()
    if (!customer) return NextResponse.json({ error: 'La organizacion aun no tiene un cliente de facturacion.' }, { status: 404 })
    const session = await getStripe().billingPortal.sessions.create({
      customer: customer.external_customer_id, return_url: `${getSiteUrl()}/dashboard`,
      configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID || undefined,
    }, { idempotencyKey: `portal:${auth.tenantId}:${requestKey}` })
    return NextResponse.json({ url: session.url }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Stripe portal failed', error)
    return NextResponse.json({ error: 'No fue posible abrir el portal de facturacion.' }, { status: 503 })
  }
}
