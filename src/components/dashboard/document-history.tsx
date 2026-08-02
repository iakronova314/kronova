'use client'

import { useCallback, useDeferredValue, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, FileClock, Loader2, RefreshCw, RotateCcw, Trash2, X } from 'lucide-react'

type HistoryItem = {
  id: string; original_name: string; mime_type: string; size_bytes: number; module: string; status: string; created_at: string
  job: null | { id: string; status: string; progress: number; attempt_count: number; max_attempts: number; error_code: string | null }
  result: null | { result: { resumen?: string; puntos_clave?: string[]; riesgos?: string[] }; summary: string | null }
}
type HistoryResponse = { items: HistoryItem[]; page: number; total: number; totalPages: number; error?: string }

const labels: Record<string, string> = { pending_upload: 'Cargando', uploaded: 'En cola', queued: 'En cola', processing: 'Procesando', retrying: 'Reintentando', completed: 'Completado', failed: 'Falló' }
const colors: Record<string, string> = { completed: 'text-emerald-400 bg-emerald-500/10', failed: 'text-red-300 bg-red-500/10', processing: 'text-primary bg-primary/10', queued: 'text-amber-300 bg-amber-500/10', retrying: 'text-amber-300 bg-amber-500/10' }

export function DocumentHistory({ tenantId }: { tenantId: string }) {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [status, setStatus] = useState('')
  const [moduleName, setModuleName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [selected, setSelected] = useState<HistoryItem>()

  const load = useCallback(async (signal?: AbortSignal) => {
    await Promise.resolve()
    setLoading(true)
    const params = new URLSearchParams({ tenantId, page: String(page), pageSize: '10' })
    if (deferredSearch) params.set('search', deferredSearch)
    if (status) params.set('status', status)
    if (moduleName) params.set('module', moduleName)
    try {
      const response = await fetch(`/api/documents?${params}`, { signal })
      const data = await response.json() as HistoryResponse
      if (!response.ok) throw new Error(data.error ?? 'No fue posible cargar el historial.')
      setItems(data.items); setTotal(data.total); setTotalPages(data.totalPages); setError(undefined)
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) setError(cause instanceof Error ? cause.message : 'Error de conexión.')
    } finally { if (!signal?.aborted) setLoading(false) }
  }, [deferredSearch, moduleName, page, status, tenantId])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => void load(controller.signal), 0)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [load])
  useEffect(() => {
    const timer = window.setInterval(() => void load(), 15_000)
    return () => window.clearInterval(timer)
  }, [items, load])

  const action = async (item: HistoryItem, kind: 'retry' | 'delete') => {
    if (kind === 'delete' && !window.confirm(`¿Eliminar definitivamente el archivo "${item.original_name}"?`)) return
    setError(undefined)
    const response = await fetch(`/api/documents/${item.id}${kind === 'retry' ? '/retry' : ''}`, { method: kind === 'retry' ? 'POST' : 'DELETE' })
    const data = await response.json() as { error?: string }
    if (!response.ok) { setError(data.error ?? 'No fue posible completar la acción.'); return }
    if (selected?.id === item.id) setSelected(undefined)
    await load()
  }

  return <section className="rounded-xl border border-border bg-card">
    <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
      <div className="mr-auto"><h2 className="flex items-center gap-2 font-semibold"><FileClock className="size-5 text-primary" />Historial documental</h2><p className="text-xs text-muted-foreground">{total} documento(s) de la organización</p></div>
      <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Buscar por nombre" className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      <select value={moduleName} onChange={(event) => { setModuleName(event.target.value); setPage(1) }} className="rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="">Todos los módulos</option><option value="docaudit">DocAudit</option><option value="leasereader">LeaseReader</option><option value="reviewsync">ReviewSync</option></select>
      <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} className="rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="">Todos los estados</option><option value="queued">En cola</option><option value="processing">Procesando</option><option value="completed">Completados</option><option value="failed">Fallidos</option></select>
      <button type="button" onClick={() => void load()} aria-label="Actualizar" className="grid size-9 place-items-center rounded-lg border border-border"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button>
    </div>
    {error && <p role="alert" className="m-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-red-300">{error}</p>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr className="border-b border-border"><th className="p-3">Documento</th><th className="p-3">Módulo</th><th className="p-3">Estado</th><th className="p-3">Fecha</th><th className="p-3 text-right">Acciones</th></tr></thead><tbody>
      {!loading && items.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No hay documentos para estos filtros.</td></tr>}
      {items.map((item) => { const currentStatus = item.job?.status ?? item.status; return <tr key={item.id} className="border-b border-border/60 last:border-0"><td className="max-w-xs p-3"><p className="truncate font-medium">{item.original_name}</p><p className="text-xs text-muted-foreground">{(item.size_bytes / 1024).toFixed(1)} KB</p></td><td className="p-3 capitalize">{item.module}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs ${colors[currentStatus] ?? 'bg-muted text-muted-foreground'}`}>{labels[currentStatus] ?? currentStatus}{currentStatus === 'processing' ? ` ${item.job?.progress ?? 0}%` : ''}</span></td><td className="p-3 text-muted-foreground">{new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.created_at))}</td><td className="p-3"><div className="flex justify-end gap-1">{item.result && <button type="button" onClick={() => setSelected(item)} title="Abrir resultado" className="grid size-8 place-items-center rounded-md hover:bg-muted"><Eye className="size-4" /></button>}{currentStatus === 'failed' && <button type="button" onClick={() => void action(item, 'retry')} title="Reintentar" className="grid size-8 place-items-center rounded-md hover:bg-muted"><RotateCcw className="size-4" /></button>}<button type="button" onClick={() => void action(item, 'delete')} title="Eliminar" className="grid size-8 place-items-center rounded-md text-destructive hover:bg-destructive/10"><Trash2 className="size-4" /></button></div></td></tr> })}
    </tbody></table></div>
    <div className="flex items-center justify-between border-t border-border p-3 text-sm"><span className="text-muted-foreground">Página {page} de {totalPages}</span><div className="flex gap-1"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="grid size-8 place-items-center rounded-md border border-border disabled:opacity-40"><ChevronLeft className="size-4" /></button><button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="grid size-8 place-items-center rounded-md border border-border disabled:opacity-40"><ChevronRight className="size-4" /></button></div></div>
    {loading && items.length === 0 && <div className="grid place-items-center p-10"><Loader2 className="size-6 animate-spin text-primary" /></div>}
    {selected?.result && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onMouseDown={() => setSelected(undefined)}><div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-5" onMouseDown={(event) => event.stopPropagation()}><div className="mb-4 flex items-start justify-between"><div><h3 className="font-semibold">{selected.original_name}</h3><p className="text-xs text-muted-foreground">Resultado persistente</p></div><button type="button" onClick={() => setSelected(undefined)}><X className="size-5" /></button></div><h4 className="text-sm font-semibold text-primary">Resumen</h4><p className="mt-1 text-sm">{selected.result.result.resumen ?? selected.result.summary}</p><h4 className="mt-4 text-sm font-semibold">Puntos clave</h4><ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{selected.result.result.puntos_clave?.map((point) => <li key={point}>{point}</li>)}</ul><h4 className="mt-4 text-sm font-semibold text-amber-300">Riesgos</h4><ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{selected.result.result.riesgos?.map((risk) => <li key={risk}>{risk}</li>)}</ul></div></div>}
  </section>
}
