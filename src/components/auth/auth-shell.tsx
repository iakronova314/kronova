import Link from 'next/link'
import { Hexagon } from 'lucide-react'

export function AuthShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <main className="grid min-h-dvh place-items-center bg-background px-4 py-10"><section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-black/20 sm:p-8"><Link href="/" className="mb-8 flex items-center gap-2 text-lg font-semibold"><span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Hexagon className="size-5" /></span>KRONOVA</Link><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{description}</p><div className="mt-6">{children}</div></section></main>
}

export function AuthNotice({ error, message }: { error?: string; message?: string }) {
  const text = error ?? message
  if (!text) return null
  return <p role={error ? 'alert' : 'status'} className={`mb-4 rounded-lg border px-3 py-2 text-sm ${error ? 'border-destructive/40 bg-destructive/10 text-red-300' : 'border-primary/30 bg-primary/10 text-primary'}`}>{text}</p>
}

export const inputClass = 'mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'
export const buttonClass = 'w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110'
