'use client'

import { motion } from 'motion/react'
import { ArrowRight, PlayCircle, Sparkles } from 'lucide-react'
import { DashboardMockup } from './dashboard-mockup'

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-36 pb-20 md:pt-44 md:pb-28">
      {/* Ambient neon glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 size-[640px] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-40 right-0 -z-10 size-[420px] rounded-full bg-accent/20 blur-[130px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,oklch(1_0_0/0.04)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0/0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 lg:grid-cols-2 lg:gap-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="size-3.5 text-primary" />
            Audit. Reply. Scale.
          </div>

          <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
            Automate Your Business Integrity &amp; Reputation with{' '}
            <span className="text-gradient">Multi-Model AI</span>
          </h1>

          <p className="mt-6 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Streamline contract audits, compliance validation, and review automation in one
            unified ecosystem.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#pricing"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              Start Free Trial
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#modules"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/40 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:bg-card/70"
            >
              <PlayCircle className="size-4 text-primary" />
              Watch Interactive Demo
            </a>
          </div>

          <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground">
            <span>Gemini 2.5 Flash</span>
            <span className="size-1 rounded-full bg-border" />
            <span>DeepSeek</span>
            <span className="size-1 rounded-full bg-border" />
            <span>Enterprise Encryption</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
          className="[perspective:1200px]"
        >
          <DashboardMockup />
        </motion.div>
      </div>
    </section>
  )
}
