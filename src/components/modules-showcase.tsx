'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FileSearch, ScrollText, MessagesSquare, Check } from 'lucide-react'

const MODULES = [
  {
    id: 'docaudit',
    name: 'DocAudit AI',
    tagline: 'Compliance, invoicing & factoring validation',
    icon: FileSearch,
    description:
      'Instant risk scoring for legal and financial documents. Validate invoices, factoring agreements, and compliance requirements in seconds.',
    points: ['Instant risk scoring', 'Invoice & factoring validation', 'Compliance checks'],
  },
  {
    id: 'leasereader',
    name: 'LeaseReader AI',
    tagline: 'Real estate & legal contract analyzer',
    icon: ScrollText,
    description:
      'Clause extraction, risk flags, and summary generation for real estate and legal contracts. Understand any agreement without reading every line.',
    points: ['Clause extraction', 'Automated risk flags', 'Summary generator'],
  },
  {
    id: 'reviewsync',
    name: 'ReviewSync AI',
    tagline: 'Multi-channel reputation management',
    icon: MessagesSquare,
    description:
      'Automatic sentiment analysis and smart automated responses across every channel. Protect and scale your reputation on autopilot.',
    points: ['Sentiment analysis', 'Automated smart responses', 'Multi-channel sync'],
  },
]

export function ModulesShowcase() {
  const [active, setActive] = useState(MODULES[0].id)
  const current = MODULES.find((m) => m.id === active)!

  return (
    <section id="modules" className="relative py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Interactive Modules</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Three AI engines. One unified ecosystem.
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Purpose-built models that audit documents, decode contracts, and manage your
            reputation — all working together.
          </p>
        </div>

        {/* Tabs */}
        <div className="mt-12 flex flex-wrap justify-center gap-2">
          {MODULES.map((m) => {
            const isActive = m.id === active
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActive(m.id)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-primary/50 bg-primary/15 text-foreground'
                    : 'border-border bg-card/40 text-muted-foreground hover:text-foreground'
                }`}
                aria-pressed={isActive}
              >
                <m.icon className={`size-4 ${isActive ? 'text-primary' : ''}`} />
                {m.name}
              </button>
            )
          })}
        </div>

        {/* Panel */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-border glass">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="grid gap-8 p-8 md:grid-cols-2 md:p-12"
            >
              <div className="flex flex-col justify-center">
                <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/15">
                  <current.icon className="size-6 text-primary" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight">{current.name}</h3>
                <p className="mt-1 text-sm font-medium text-accent">{current.tagline}</p>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  {current.description}
                </p>
                <ul className="mt-6 space-y-3">
                  {current.points.map((p) => (
                    <li key={p} className="flex items-center gap-3 text-sm">
                      <span className="grid size-5 place-items-center rounded-full bg-primary/20">
                        <Check className="size-3 text-primary" />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative flex items-center justify-center rounded-2xl border border-border bg-card/40 p-8">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10"
                />
                <current.icon className="size-24 text-primary/40" strokeWidth={1} />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
