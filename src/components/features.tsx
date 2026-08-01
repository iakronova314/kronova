'use client'

import { motion } from 'motion/react'
import { Cpu, Layers, LineChart, Lock, Zap, Network } from 'lucide-react'

const FEATURES = [
  {
    icon: Zap,
    title: 'Sub-second processing',
    body: 'Powered by multi-model routing between Gemini 2.5 Flash and DeepSeek for the fastest, most accurate results.',
  },
  {
    icon: Lock,
    title: 'Enterprise-grade encryption',
    body: 'Multi-tenant architecture with isolated data boundaries and encryption at rest and in transit.',
  },
  {
    icon: LineChart,
    title: 'Automated DCA dashboard',
    body: 'A live revenue dashboard preview for real-time ROI tracking across every audited contract.',
  },
  {
    icon: Network,
    title: 'Multi-model routing',
    body: 'Requests are intelligently routed to the optimal model for each task, balancing cost and precision.',
  },
  {
    icon: Layers,
    title: 'Multi-tenant by design',
    body: 'Isolated tenants with dedicated instances available for enterprise deployments.',
  },
  {
    icon: Cpu,
    title: 'Unified API access',
    body: 'One API surface for all three modules — integrate audits, contracts, and reviews anywhere.',
  },
]

export function Features() {
  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Tech Highlights</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Built for speed, security, and scale
          </h2>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.08, ease: 'easeOut' }}
              className="group rounded-2xl border border-border bg-card/40 p-6 transition-colors hover:border-primary/40 hover:bg-card/70"
            >
              <div className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/15 transition-colors group-hover:bg-primary/25">
                <f.icon className="size-5 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
