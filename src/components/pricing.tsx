import { Check } from 'lucide-react'

const PLANS = [
  {
    name: 'Free trial',
    price: '$0',
    description: 'Planned evaluation access for the DocAudit Colombia MVP.',
    features: ['14 days', '20 documents', '1 organization', 'Up to 2 users'],
    featured: false,
  },
  {
    name: 'DocAudit Starter',
    price: '$29',
    description: 'Planned launch plan for small Colombian teams.',
    features: [
      '300 documents / month',
      '1 organization',
      'Up to 3 users',
      'XML, ZIP and PDF roadmap',
      'Report history and export',
    ],
    featured: true,
  },
  {
    name: 'DocAudit Growth',
    price: '$59',
    description: 'Planned higher-volume plan with integration access.',
    features: [
      '1,000 documents / month',
      '1 organization',
      'Up to 10 users',
      'Planned API and webhooks',
      'Priority email support',
    ],
    featured: false,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="relative py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 left-1/2 -z-10 size-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-[150px]"
      />
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Planned launch pricing</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Clear document limits with no unlimited usage claims
          </h2>
          <p className="mt-4 text-muted-foreground">
            These plans define the approved MVP scope. Billing is not active yet.
          </p>
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
                  Initial MVP plan
                </span>
              )}
              <h3 className="text-lg font-semibold tracking-tight">{plan.name}</h3>
              <p className="mt-2 min-h-10 text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-6 flex items-end gap-1">
                <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                {plan.price !== '$0' && (
                  <span className="mb-1 text-sm text-muted-foreground">/month</span>
                )}
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/20">
                      <Check className="size-3 text-primary" />
                    </span>
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/dashboard"
                className={`mt-8 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-transform hover:scale-[1.02] ${
                  plan.featured
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-card/60 text-foreground hover:bg-card'
                }`}
              >
                Open product preview
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
