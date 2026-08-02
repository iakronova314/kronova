'use client'

import { useState } from 'react'
import { Hexagon, Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Modules', href: '#modules' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Trust', href: '#trust' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto mt-4 flex max-w-6xl items-center justify-between gap-4 rounded-2xl border border-border bg-background/70 px-4 py-3 backdrop-blur-xl md:px-6">
        <a href="#" className="flex items-center gap-2">
          <span className="relative grid size-8 place-items-center rounded-lg bg-primary/15">
            <Hexagon className="size-5 text-primary" strokeWidth={2} />
          </span>
          <span className="text-lg font-semibold tracking-tight">KRONOVA</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href="/login"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </a>
          <a
            href="/register"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]"
          >
            Start Free Trial
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="grid size-9 place-items-center rounded-lg border border-border text-foreground md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="mx-auto mt-2 max-w-6xl rounded-2xl border border-border bg-background/90 p-4 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <a href="/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-muted-foreground">Iniciar sesión</a>
            <a
              href="/register"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground"
            >
              Start Free Trial
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
