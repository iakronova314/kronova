import { Hexagon } from 'lucide-react'
import Link from 'next/link'

const LINKS = [
  { label: 'Privacidad', href: '/privacy' },
  { label: 'Términos', href: '/terms' },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 md:flex-row">
        <a href="#" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/15">
            <Hexagon className="size-5 text-primary" strokeWidth={2} />
          </span>
          <span className="text-lg font-semibold tracking-tight">KRONOVA</span>
        </a>

        <nav className="flex flex-wrap items-center justify-center gap-6" aria-label="Footer">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} KRONOVA
        </p>
      </div>
    </footer>
  )
}
