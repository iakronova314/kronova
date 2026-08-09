'use client'

import { useState } from 'react'
import { CreditCard, ExternalLink, Loader2 } from 'lucide-react'

const plans = [
  { code: 'docaudit_starter', name: 'Starter', price: 'USD 29/mes', limit: '300 documentos' },
  { code: 'docaudit_growth', name: 'Growth', price: 'USD 59/mes', limit: '1.000 documentos' },
] as const

export function BillingPanel({ tenantId, role }: { tenantId: string; role: string }) {
  const [pending, setPending] = useState<string>()
  const [error, setError] = useState<string>()
  const allowed = role === 'owner' || role === 'admin'
  async function open(endpoint: 'checkout' | 'portal', planCode?: string) {
    setPending(planCode ?? endpoint); setError(undefined)
    try {
      const response = await fetch(`/api/billing/${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ tenantId, planCode }),
      })
      const result = await response.json() as { url?: string; error?: string }
      if (!response.ok || !result.url) throw new Error(result.error ?? 'No fue posible abrir Stripe.')
      window.location.assign(result.url)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error de conexion.'); setPending(undefined) }
  }
  return <section className="rounded-xl border border-border bg-card p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-lg bg-primary/15 text-primary"><CreditCard className="size-5" /></div><div><h2 className="font-semibold">Planes y facturacion</h2><p className="text-sm text-muted-foreground">Contrata un plan o administra pagos y cancelacion en Stripe.</p></div></div>
      <button disabled={!allowed || Boolean(pending)} onClick={() => void open('portal')} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium disabled:opacity-50">{pending === 'portal' ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />} Gestionar suscripcion</button>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">{plans.map((plan) => <div key={plan.code} className="rounded-lg border border-border p-4"><div className="flex items-start justify-between gap-2"><div><h3 className="font-medium">DocAudit {plan.name}</h3><p className="text-sm text-muted-foreground">{plan.limit}</p></div><span className="text-sm font-semibold text-primary">{plan.price}</span></div><button disabled={!allowed || Boolean(pending)} onClick={() => void open('checkout', plan.code)} className="mt-4 h-8 w-full rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">{pending === plan.code ? 'Abriendo Checkout...' : 'Contratar'}</button></div>)}</div>
    {!allowed && <p className="mt-3 text-xs text-muted-foreground">Solo propietarios y administradores pueden cambiar la facturacion.</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
  </section>
}
