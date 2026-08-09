'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileStack, Loader2, RefreshCw } from 'lucide-react'

type Usage = { planName: string; used: number; limit: number; remaining: number; percentage: number; periodEnd: string; blocked: boolean; error?: string }

export function UsageMeter({ tenantId }: { tenantId: string }) {
  const [usage, setUsage] = useState<Usage>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/billing/usage?tenantId=${encodeURIComponent(tenantId)}`)
      const data = await response.json() as Usage
      if (!response.ok) throw new Error(data.error ?? 'No fue posible cargar el consumo.')
      setUsage(data); setError(undefined)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error de conexión.') }
    finally { setLoading(false) }
  }, [tenantId])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    const interval = window.setInterval(() => void load(), 30_000)
    const refresh = () => void load()
    window.addEventListener('kronova:usage-updated', refresh)
    return () => { window.clearTimeout(timer); window.clearInterval(interval); window.removeEventListener('kronova:usage-updated', refresh) }
  }, [load])

  return <section className={`rounded-xl border bg-card p-5 ${usage?.blocked ? 'border-red-500/40' : 'border-border'}`}>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex size-11 items-center justify-center rounded-lg bg-primary/15 text-primary"><FileStack className="size-5" /></div>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">Uso de documentos</h2>{usage && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{usage.planName}</span>}</div>{usage ? <p className="text-sm text-muted-foreground">{usage.used.toLocaleString('es-CO')} de {usage.limit.toLocaleString('es-CO')} documentos · {usage.remaining.toLocaleString('es-CO')} disponibles</p> : <p className="text-sm text-muted-foreground">Calculando consumo del periodo…</p>}</div>
      <button type="button" onClick={() => void load()} aria-label="Actualizar consumo" className="grid size-9 place-items-center rounded-lg border border-border"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button>
    </div>
    {usage && <><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full transition-all ${usage.blocked ? 'bg-red-500' : usage.percentage >= 80 ? 'bg-amber-400' : 'bg-primary'}`} style={{ width: `${usage.percentage}%` }} /></div><div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{usage.percentage}% consumido</span><span>Renueva {new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(usage.periodEnd))}</span></div>{usage.blocked && <p role="alert" className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">Límite alcanzado. Los nuevos documentos no se procesarán hasta el siguiente periodo o un cambio de plan.</p>}</>}
    {loading && !usage && <Loader2 className="mt-4 size-5 animate-spin text-primary" />}
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
  </section>
}
