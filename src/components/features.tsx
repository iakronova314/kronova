'use client'

import { motion } from 'motion/react'
import { Braces, FileCheck2, Languages, ListChecks, MapPinned, ShieldAlert } from 'lucide-react'

const FEATURES = [
  {
    icon: FileCheck2,
    title: 'Working document preview',
    body: 'Upload text-based files and receive a structured summary with key points and risks.',
  },
  {
    icon: Braces,
    title: 'Structured AI output',
    body: 'Gemini responses follow a defined JSON schema that the application can validate and display.',
  },
  {
    icon: ShieldAlert,
    title: 'Transparent limitations',
    body: 'The preview assists document review; it does not replace DIAN, accounting, or legal advice.',
  },
  {
    icon: MapPinned,
    title: 'Colombia-first scope',
    body: 'The first production package will target Colombian electronic invoicing and DIAN UBL 2.1 XML.',
  },
  {
    icon: Languages,
    title: 'Multilingual roadmap',
    body: 'Spanish and English come first, with additional locales added alongside supported jurisdictions.',
  },
  {
    icon: ListChecks,
    title: 'Phased delivery',
    body: 'DocAudit launches first; LeaseReader and ReviewSync remain visible as clearly identified roadmap modules.',
  },
]

export function Features() {
  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Product foundation</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            A focused MVP with a documented path to production
          </h2>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: (index % 3) * 0.08, ease: 'easeOut' }}
              className="group rounded-2xl border border-border bg-card/40 p-6 transition-colors hover:border-primary/40 hover:bg-card/70"
            >
              <div className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/15 transition-colors group-hover:bg-primary/25">
                <feature.icon className="size-5 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
