import 'server-only'
import Stripe from 'stripe'

export const STRIPE_API_VERSION = '2026-07-29.dahlia' as const
export const PAID_PLAN_CODES = ['docaudit_starter', 'docaudit_growth'] as const
export type PaidPlanCode = (typeof PAID_PLAN_CODES)[number]

let stripeClient: Stripe | undefined

export function getStripe() {
  if (process.env.STRIPE_BILLING_ENABLED !== 'true') {
    throw new Error('Stripe billing is disabled.')
  }
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured.')
  stripeClient ??= new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION })
  return stripeClient
}

export function getStripePriceId(planCode: PaidPlanCode) {
  const value = planCode === 'docaudit_starter'
    ? process.env.STRIPE_PRICE_STARTER
    : process.env.STRIPE_PRICE_GROWTH
  if (!value?.startsWith('price_')) throw new Error(`Stripe price is not configured for ${planCode}.`)
  return value
}

export function planCodeForPrice(priceId: string): PaidPlanCode | undefined {
  if (priceId && priceId === process.env.STRIPE_PRICE_STARTER) return 'docaudit_starter'
  if (priceId && priceId === process.env.STRIPE_PRICE_GROWTH) return 'docaudit_growth'
}

export function isPaidPlanCode(value: unknown): value is PaidPlanCode {
  return typeof value === 'string' && PAID_PLAN_CODES.includes(value as PaidPlanCode)
}

export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL
  if (!raw) throw new Error('NEXT_PUBLIC_SITE_URL is not configured.')
  const url = new URL(raw)
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_SITE_URL must use HTTPS in production.')
  }
  return url.origin
}

export function normalizeStripeStatus(status: Stripe.Subscription.Status) {
  switch (status) {
    case 'trialing': return 'trialing' as const
    case 'active': return 'active' as const
    case 'paused': return 'paused' as const
    case 'canceled': return 'canceled' as const
    case 'incomplete_expired': return 'expired' as const
    default: return 'past_due' as const
  }
}

export function subscriptionPeriod(subscription: Stripe.Subscription) {
  const starts = subscription.items.data.map((item) => item.current_period_start).filter(Number.isFinite)
  const ends = subscription.items.data.map((item) => item.current_period_end).filter(Number.isFinite)
  return {
    start: starts.length ? Math.min(...starts) : undefined,
    end: ends.length ? Math.max(...ends) : undefined,
  }
}
