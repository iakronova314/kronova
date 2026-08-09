import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY
if (!key) throw new Error('STRIPE_SECRET_KEY is required.')
if (key.startsWith('sk_live_') && process.env.STRIPE_ALLOW_LIVE_SYNC !== 'true') {
  throw new Error('Live catalog sync is blocked. Set STRIPE_ALLOW_LIVE_SYNC=true only after PD-001 is resolved.')
}
const stripe = new Stripe(key, { apiVersion: '2026-07-29.dahlia' })
const catalog = [
  { code: 'docaudit_starter', name: 'DocAudit Starter', amount: 2900, limit: 300 },
  { code: 'docaudit_growth', name: 'DocAudit Growth', amount: 5900, limit: 1000 },
]

for (const plan of catalog) {
  const matches = await stripe.products.search({ query: `metadata['kronova_plan_code']:'${plan.code}'`, limit: 1 })
  const product = matches.data[0] ?? await stripe.products.create({
    name: plan.name, description: `${plan.limit} documentos por mes`,
    metadata: { kronova_plan_code: plan.code, document_limit: String(plan.limit) },
  }, { idempotencyKey: `catalog:product:${plan.code}:v1` })
  const prices = await stripe.prices.list({ product: product.id, active: true, type: 'recurring', limit: 100 })
  const price = prices.data.find((candidate) => candidate.currency === 'usd' && candidate.unit_amount === plan.amount && candidate.recurring?.interval === 'month')
    ?? await stripe.prices.create({ product: product.id, currency: 'usd', unit_amount: plan.amount,
      recurring: { interval: 'month' }, metadata: { kronova_plan_code: plan.code } },
    { idempotencyKey: `catalog:price:${plan.code}:usd:${plan.amount}:month:v1` })
  console.log(`${plan.code}: product=${product.id} price=${price.id}`)
}
