'use client'

const STATS = [
  { value: '$10M+', label: 'Contract Volume Audited' },
  { value: '99.4%', label: 'Extraction Accuracy' },
  { value: '< 2s', label: 'Average Latency' },
]

const TICKER = [
  '$10M+ Contract Volume Audited',
  '99.4% Extraction Accuracy',
  '< 2s Average Latency',
  'SOC 2 Ready',
  'Multi-Tenant Isolation',
  'Gemini 2.5 Flash + DeepSeek',
]

export function TrustStats() {
  return (
    <section id="trust" className="relative border-y border-border py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-8 text-center sm:grid-cols-3">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="text-4xl font-semibold tracking-tight text-gradient md:text-5xl">
                {s.value}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ticker */}
      <div className="relative mt-14 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max animate-ticker gap-4">
          {[...TICKER, ...TICKER].map((item, i) => (
            <span
              key={i}
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
