'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'

type Cycle = 'monthly' | 'yearly'

const PLANS = [
  {
    name: 'Starter',
    monthly: 29,
    description: 'Perfect for small teams needing single-module access.',
    features: ['1 module of your choice', '1,000 documents / mo', 'Standard risk scoring', 'Email support'],
    featured: false,
    cta: 'Start Free Trial',
  },
  {
    name: 'Pro / Scale',
    monthly: 79,
    description: 'Everything you need to scale across all modules.',
    features: [
      'All 3 modules included',
      'Unlimited documents',
      'Full API access',
      'DCA revenue dashboard',
      'Priority support',
    ],
    featured: true,
    cta: 'Start Free Trial',
  },
  {
    name: 'Enterprise',
    monthly: null,
    description: 'Dedicated instance and multi-tenant isolation.',
    features: [
      'Dedicated instance',
      'Multi-tenant isolation',
      'Custom model routing',
      'SLA & SSO',
      'Dedicated success manager',
    ],
    featured: false,
    cta: 'Contact Sales',
  },
]

function priceLabel(monthly: number | null, cycle: Cycle) {
  if (monthly === null) return 'Custom'
  const value = cycle === 'yearly' ? Math.round(monthly * 0.8) : monthly
  return `$${value}`
}

export function Pricing() {
  const [cycle, setCycle] = useState<Cycle>('monthly')

  return (
    <section id="pricing" className="relative py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 size-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-[150px]"
      />
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Pricing</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Simple pricing that scales with you
          </h2>

          {/* Toggle */}
          <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-border bg-card/50 p-1">
            {(['monthly', 'yearly'] as Cycle[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCycle(c)}
                className={`relative rounded-full px-5 py-2 text-sm font-medium capitalize transition-colors ${
                  cycle === c ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-pressed={cycle === c}
              >
                {cycle === c && (
                  <motion.span
                    layoutId="cycle-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                {c}
                {c === 'yearly' && (
                  <span className="ml-1.5 text-xs opacity-80">-20%</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-3xl border p-8 ${
                plan.featured
                  ? 'border-primary/50 bg-card/70 shadow-2xl shadow-primary/10'
                  : 'border-border bg-card/40'
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-semibold tracking-tight">{plan.name}</h3>
              <p className="mt-2 min-h-10 text-sm text-muted-foreground">{plan.description}</p>

              <div className="mt-6 flex items-end gap-1">
                <span className="text-4xl font-semibold tracking-tight">
                  {priceLabel(plan.monthly, cycle)}
                </span>
                {plan.monthly !== null && (
                  <span className="mb-1 text-sm text-muted-foreground">/mo</span>
                )}
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/20">
                      <Check className="size-3 text-primary" />
                    </span>
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#"
                className={`mt-8 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-transform hover:scale-[1.02] ${
                  plan.featured
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-card/60 text-foreground hover:bg-card'
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
