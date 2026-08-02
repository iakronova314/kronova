import Stripe from 'stripe'
import { NextResponse } from 'next/server'

export const maxDuration = 10
const MAX_WEBHOOK_BYTES = 256_000

export async function POST(req: Request) {
  const declaredLength = Number(req.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: 'Payload rejected.' }, { status: 413 })
  }
  const body = await req.text()
  if (new TextEncoder().encode(body).byteLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: 'Payload rejected.' }, { status: 413 })
  }
  const signature = req.headers.get('stripe-signature')

  if (!signature || !process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook configuration is incomplete.' }, { status: 400 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-07-29.dahlia',
  })
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 })
  }

  return NextResponse.json({ received: true, eventType: event.type })
}
