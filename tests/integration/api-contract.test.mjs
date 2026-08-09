import assert from 'node:assert/strict'
import test from 'node:test'
import Stripe from 'stripe'

const base = process.env.TEST_BASE_URL
const deploymentHeaders = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : {}
test('protected APIs reject anonymous access and expose no secrets', { skip: !base }, async () => {
  for (const path of ['/api/dashboard/overview?tenantId=00000000-0000-4000-8000-000000000001','/api/operations/overview?tenantId=00000000-0000-4000-8000-000000000001','/api/api-keys?tenantId=00000000-0000-4000-8000-000000000001']) {
    const response = await fetch(`${base}${path}`, { headers: deploymentHeaders })
    assert.ok([401,403].includes(response.status), `${path}: ${response.status}`)
    assert.doesNotMatch(await response.text(), /service_role|SUPABASE_SERVICE|STRIPE_SECRET|stack/i)
  }
})

test('Stripe webhook rejects oversized input before parsing', { skip: !base }, async () => {
  const response = await fetch(`${base}/api/billing/webhooks/stripe`, { method:'POST', headers:{...deploymentHeaders,'content-length':'256001','stripe-signature':'invalid'}, body:'{}' })
  assert.equal(response.status, 413)
})

test('Stripe webhook accepts a valid signature and deduplicates the event', { skip: !base || !process.env.STRIPE_WEBHOOK_SECRET }, async () => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_fixture')
  const payload = JSON.stringify({ id:`evt_ci_${Date.now()}`, object:'event', api_version:'2026-07-29.dahlia', created:Math.floor(Date.now()/1000), livemode:false, pending_webhooks:1, request:null, type:'customer.created', data:{object:{id:'cus_ci_fixture',object:'customer'}} })
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret:process.env.STRIPE_WEBHOOK_SECRET })
  const send = () => fetch(`${base}/api/billing/webhooks/stripe`, { method:'POST', headers:{...deploymentHeaders,'content-type':'application/json','stripe-signature':signature}, body:payload })
  const first = await send()
  assert.equal(first.status, 200)
  assert.deepEqual(await first.json(), { received:true })
  const duplicate = await send()
  assert.equal(duplicate.status, 200)
  assert.deepEqual(await duplicate.json(), { received:true, duplicate:true })
})
