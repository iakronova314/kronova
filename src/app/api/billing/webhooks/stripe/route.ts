import type Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/server/billing/stripe'
import { processStripeEvent } from '@/lib/server/billing/sync-stripe'

export const maxDuration = 10
const MAX_WEBHOOK_BYTES = 256_000

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_WEBHOOK_BYTES) return NextResponse.json({ error: 'Payload rejected.' }, { status: 413 })
  const rawBody = await request.text()
  if (new TextEncoder().encode(rawBody).byteLength > MAX_WEBHOOK_BYTES) return NextResponse.json({ error: 'Payload rejected.' }, { status: 413 })
  const signature = request.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !secret) return NextResponse.json({ error: 'Webhook configuration is incomplete.' }, { status: 400 })
  let event: Stripe.Event
  try { event = getStripe().webhooks.constructEvent(rawBody, signature, secret) }
  catch { return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 }) }

  const admin = createAdminClient()
  const object = event.data.object as { id?: string }
  const inserted = await admin.from('billing_events').insert({
    provider: 'stripe', external_event_id: event.id, event_type: event.type,
    payload: { object_id: object.id ?? null, created: event.created, livemode: event.livemode, api_version: event.api_version },
  }).select('id,processed_at').single()
  let inbox = inserted.data
  if (inserted.error) {
    const existing = await admin.from('billing_events').select('id,processed_at').eq('provider', 'stripe').eq('external_event_id', event.id).maybeSingle()
    if (!existing.data) return NextResponse.json({ error: 'Webhook inbox unavailable.' }, { status: 503 })
    if (existing.data.processed_at) return NextResponse.json({ received: true, duplicate: true })
    inbox = existing.data
  }
  try {
    const result = await processStripeEvent(event)
    const { error } = await admin.from('billing_events').update({ tenant_id: result.tenantId ?? null,
      subscription_id: result.subscriptionId ?? null, processing_error: null, processed_at: new Date().toISOString() }).eq('id', inbox!.id)
    if (error) throw error
    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : 'Unknown processing error.'
    await admin.from('billing_events').update({ processing_error: message }).eq('id', inbox!.id)
    console.error('Stripe webhook processing failed', event.id, message)
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 503 })
  }
}
