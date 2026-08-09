import assert from 'node:assert/strict'
import Stripe from 'stripe'

const key=process.env.STRIPE_SECRET_KEY??''
assert.ok(key.startsWith('sk_live_'),'A live Stripe restricted/secret key is required')
const expectedWebhook=new URL('/api/billing/webhooks/stripe',process.env.PRODUCTION_URL).toString()
const stripe=new Stripe(key,{apiVersion:'2026-07-29.dahlia'})
const priceIds=[process.env.STRIPE_PRICE_STARTER,process.env.STRIPE_PRICE_GROWTH]
for(const id of priceIds){assert.ok(id?.startsWith('price_'),'Both live price IDs are required');const price=await stripe.prices.retrieve(id);assert.equal(price.livemode,true);assert.equal(price.active,true);assert.equal(price.type,'recurring')}
const endpoints=await stripe.webhookEndpoints.list({limit:100})
const endpoint=endpoints.data.find((item)=>item.url===expectedWebhook && item.status==='enabled')
assert.ok(endpoint,`Enabled live webhook not found at ${expectedWebhook}`)
for(const event of ['checkout.session.completed','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed'])assert.ok(endpoint.enabled_events.includes('*')||endpoint.enabled_events.includes(event),`Webhook missing ${event}`)
console.log(JSON.stringify({ok:true,prices:2,webhook:expectedWebhook,checkedAt:new Date().toISOString()}))
