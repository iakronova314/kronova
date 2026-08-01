'use client'

import {
  FileScan,
  ShieldAlert,
  MessageSquareReply,
  Timer,
  ArrowUpRight,
  ArrowDownRight,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCard {
  label: string
  value: string
  delta: string
  trend: 'up' | 'down'
  hint: string
  icon: LucideIcon
  accent: string
}

const cards: KpiCard[] = [
  {
    label: 'Total Documents Scanned',
    value: '1,420',
    delta: '+12%',
    trend: 'up',
    hint: 'this week',
    icon: FileScan,
    accent: 'text-primary',
  },
  {
    label: 'Lease Risk Alerts',
    value: '3',
    delta: 'High Risk',
    trend: 'down',
    hint: 'flags identified',
    icon: ShieldAlert,
    accent: 'text-destructive',
  },
  {
    label: 'Reviews Responded',
    value: '98.5%',
    delta: '+4.2%',
    trend: 'up',
    hint: 'auto-replied',
    icon: MessageSquareReply,
    accent: 'text-success',
  },
  {
    label: 'Saved Operational Hours',
    value: '140 hrs',
    delta: '+18%',
    trend: 'up',
    hint: 'this month',
    icon: Timer,
    accent: 'text-accent',
  },
]

export function KpiCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        const TrendIcon = card.trend === 'up' ? ArrowUpRight : ArrowDownRight
        return (
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
          >
            <div className="flex items-start justify-between">
              <div
                className={cn(
                  'flex size-10 items-center justify-center rounded-lg bg-muted',
                  card.accent,
                )}
              >
                <Icon className="size-5" />
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
                  card.trend === 'up'
                    ? 'bg-success/15 text-success'
                    : 'bg-destructive/15 text-destructive',
                )}
              >
                <TrendIcon className="size-3" />
                {card.delta}
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-card-foreground">
              {card.value}
            </p>
            <p className="mt-1 text-sm font-medium text-muted-foreground">{card.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground/70">{card.hint}</p>
          </div>
        )
      })}
    </div>
  )
}
