'use client'

import { ArrowUpRight } from 'lucide-react'
import { navModules, type ModuleId } from '@/lib/dashboard-data'
import { Button } from '@/components/ui/button'

const moduleCopy: Record<
  Exclude<ModuleId, 'overview'>,
  { headline: string; body: string; stats: { label: string; value: string }[] }
> = {
  docaudit: {
    headline: 'Audit every invoice for compliance in seconds',
    body: 'DocAudit extracts line items, validates tax fields, and reconciles totals against your policy — flagging anomalies before they reach approval.',
    stats: [
      { label: 'Invoices processed', value: '842' },
      { label: 'Compliance rate', value: '96.4%' },
      { label: 'Anomalies caught', value: '31' },
    ],
  },
  leasereader: {
    headline: 'Understand any real estate contract instantly',
    body: 'LeaseReader parses lease agreements, surfaces renewal terms, and scores clauses by risk so your team never misses a hidden liability.',
    stats: [
      { label: 'Contracts read', value: '318' },
      { label: 'High-risk clauses', value: '3' },
      { label: 'Avg. read time', value: '11s' },
    ],
  },
  reviewsync: {
    headline: 'Respond to every review with the right tone',
    body: 'ReviewSync monitors your reputation across platforms, scores sentiment, and drafts on-brand replies for one-click approval.',
    stats: [
      { label: 'Reviews synced', value: '1,204' },
      { label: 'Auto-reply rate', value: '98.5%' },
      { label: 'Avg. sentiment', value: '+0.71' },
    ],
  },
}

export function ModuleView({ moduleId }: { moduleId: Exclude<ModuleId, 'overview'> }) {
  const mod = navModules.find((m) => m.id === moduleId)!
  const copy = moduleCopy[moduleId]
  const Icon = mod.icon

  return (
    <div className="rounded-xl border border-border bg-card p-8">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="size-6" />
      </div>
      <div className="mt-5 max-w-xl">
        <span className="text-xs font-medium tracking-wider text-primary uppercase">
          {mod.label}
        </span>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance text-card-foreground">
          {copy.headline}
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">{copy.body}</p>
        <Button className="mt-5" data-icon="inline-end">
          Open {mod.label}
          <ArrowUpRight className="size-4" />
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {copy.stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-2xl font-semibold tracking-tight text-card-foreground">
              {s.value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
