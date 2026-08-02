'use client'

import { motion } from 'motion/react'
import { Activity, FileCheck2, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react'

const BARS = [42, 58, 47, 70, 63, 88, 76, 94]

export function DashboardMockup() {
  return (
    <div className="glass rounded-3xl p-4 shadow-2xl shadow-primary/10 md:p-5">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-destructive/70" />
          <span className="size-3 rounded-full bg-accent/70" />
          <span className="size-3 rounded-full bg-primary/70" />
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground">
          <Sparkles className="size-3 text-primary" />
          DocAudit · Product preview
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3 py-4">
        {[
          { label: 'Checks', value: '3', icon: ShieldCheck, tone: 'text-primary' },
          { label: 'Input types', value: '4', icon: FileCheck2, tone: 'text-accent' },
          { label: 'Output', value: 'JSON', icon: Activity, tone: 'text-primary' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card/60 p-3">
            <s.icon className={`size-4 ${s.tone}`} />
            <div className="mt-2 text-lg font-semibold tracking-tight">{s.value}</div>
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="size-4 text-primary" />
            Example processing activity
          </div>
          <span className="text-[11px] text-muted-foreground">Illustrative data</span>
        </div>
        <div className="flex h-28 items-end gap-2">
          {BARS.map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0, opacity: 0 }}
              whileInView={{ height: `${h}%`, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.5, ease: 'easeOut' }}
              className="flex-1 rounded-t-md bg-gradient-to-t from-primary/40 to-accent"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
