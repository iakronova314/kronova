import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import Stripe from 'stripe'

test('Stripe verifies the exact raw webhook body and rejects tampering', () => {
  const stripe = new Stripe('sk_test_fixture')
  const secret = 'whsec_automatic_test_secret'
  const payload = JSON.stringify({ id:'evt_test', type:'invoice.paid', data:{object:{id:'in_test'}} })
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret, timestamp: 1_800_000_000 })
  const event = stripe.webhooks.constructEvent(payload, signature, secret, 10_000_000, undefined, 1_800_000_000)
  assert.equal(event.id, 'evt_test')
  assert.throws(() => stripe.webhooks.constructEvent(`${payload} `, signature, secret, 10_000_000, undefined, 1_800_000_000))
})

test('webhook route has an idempotent inbox and bounded payload', async () => {
  const source = await readFile(new URL('../../src/app/api/billing/webhooks/stripe/route.ts', import.meta.url), 'utf8')
  assert.match(source, /MAX_WEBHOOK_BYTES = 256_000/)
  assert.match(source, /constructEvent\(rawBody, signature, secret\)/)
  assert.match(source, /external_event_id: event\.id/)
  assert.match(source, /processed_at/)
  assert.match(source, /duplicate: true/)
  assert.doesNotMatch(source, /request\.json\(\)/)
})
