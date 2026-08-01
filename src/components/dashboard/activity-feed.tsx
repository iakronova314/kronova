'use client'

import { Activity, ShieldCheck, AlertTriangle, ShieldX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { activityFeed, type ActivityStatus } from '@/lib/dashboard-data'

const statusConfig: Record<
  ActivityStatus,
  { label: string; icon: typeof ShieldCheck; badge: string; dot: string }
> = {
  safe: {
    label: 'Safe',
    icon: ShieldCheck,
    badge: 'bg-success/15 text-success',
    dot: 'bg-success',
  },
  review: {
    label: 'Review',
    icon: AlertTriangle,
    badge: 'bg-warning/15 text-warning',
    dot: 'bg-warning',
  },
  risk: {
    label: 'High Risk',
    icon: ShieldX,
    badge: 'bg-destructive/15 text-destructive',
    dot: 'bg-destructive',
  },
}

export function ActivityFeed() {
  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border p-5">
        <div className="flex items-center gap-2">
          <Activity className="size-4.5 text-accent" />
          <h2 className="text-base font-semibold text-card-foreground">Live Activity Feed</h2>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-2 animate-ping rounded-full bg-success opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          Live
        </span>
      </div>

      <ul className="flex-1 divide-y divide-border overflow-y-auto">
        {activityFeed.map((item) => {
          const cfg = statusConfig[item.status]
          const Icon = cfg.icon
          return (
            <li
              key={item.id}
              className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/40"
            >
              <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', cfg.dot)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium text-card-foreground">
                    {item.title}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.detail}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      cfg.badge,
                    )}
                  >
                    <Icon className="size-3" />
                    {cfg.label}
                  </span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                    {item.module}
                  </span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {item.score}
                  </span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="border-t border-border p-3">
        <button
          type="button"
          className="w-full rounded-lg py-2 text-center text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          View all activity
        </button>
      </div>
    </section>
  )
}
