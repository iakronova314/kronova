const STATS = [
  { value: '300', label: 'Documents in the planned Starter quota' },
  { value: '2', label: 'Initial interface languages' },
  { value: '3', label: 'Modules in the product roadmap' },
]

const TICKER = [
  'Colombia-first MVP',
  'DIAN UBL 2.1 roadmap',
  'Spanish + English',
  'Structured JSON output',
  'DocAudit first',
  'No unlimited usage claims',
]

export function TrustStats() {
  return (
    <section id="trust" className="relative border-y border-border py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-8 text-center sm:grid-cols-3">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <div className="text-4xl font-semibold tracking-tight text-gradient md:text-5xl">
                {stat.value}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-14 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max animate-ticker gap-4">
          {[...TICKER, ...TICKER].map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="flex items-center gap-2 rounded-full border border-border bg-card/40 px-4 py-2 text-sm text-muted-foreground"
            >
              <span className="size-1.5 rounded-full bg-primary" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
