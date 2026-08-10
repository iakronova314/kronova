'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, CheckCircle2, ChevronRight, Clock3, Download, FileSearch, Loader2, RefreshCw, ShieldCheck, X, XCircle } from 'lucide-react'
import type { DocAuditResultV1, Evidence, Fact, FindingSeverity, Money } from '@/modules/docaudit/colombia/schemas/v1/types'
import { UploadWorkspace } from './upload-workspace'

type ReviewDecision = 'approved' | 'rejected' | 'needs_review'
type Review = { decision: ReviewDecision; note: string | null; decided_by: string; decided_at: string }
type ListItem = { id: string; original_name: string; status: string; created_at: string; result: null | { result: DocAuditResultV1; summary: string | null } }
type PageEvidence = { page: number; text: string; characterCount: number }
type Detail = { document: ListItem & { mime_type: string; size_bytes: number }; result: { result: DocAuditResultV1 }; pages: PageEvidence[]; pageCount: number; review: Review | null; canReview: boolean; error?: string }

const severityStyle: Record<FindingSeverity, string> = {
  critical: 'border-red-500/40 bg-red-500/10 text-red-300',
  error: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  info: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
}
const severityLabel: Record<FindingSeverity, string> = { critical: 'Crítico', error: 'Error', warning: 'Advertencia', info: 'Informativo' }
const decisionLabel: Record<ReviewDecision, string> = { approved: 'Aprobado', rejected: 'Rechazado', needs_review: 'Revisión requerida' }

function factValue<T>(fact: Fact<T>, formatter?: (value: T) => string) {
  if (fact.value === null) return <span className="text-muted-foreground">No observado</span>
  return formatter ? formatter(fact.value) : String(fact.value)
}
const money = (value: Money) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: value.currency, maximumFractionDigits: 2 }).format(Number(value.amount))

export function DocAuditWorkspace({ tenantId, role }: { tenantId: string; role: string }) {
  const [items, setItems] = useState<ListItem[]>([])
  const [selectedId, setSelectedId] = useState<string>()
  const [detail, setDetail] = useState<Detail>()
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [severity, setSeverity] = useState<'all' | FindingSeverity>('all')
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence>()
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ tenantId, module: 'docaudit', page: '1', pageSize: '20' })
      const response = await fetch(`/api/documents?${params}`)
      const data = await response.json() as { items?: ListItem[]; error?: string }
      if (!response.ok) throw new Error(data.error ?? 'No fue posible cargar DocAudit.')
      const next = data.items ?? []
      setItems(next)
      setSelectedId((current) => current && next.some((item) => item.id === current) ? current : next.find((item) => item.result)?.id)
      setError(undefined)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error de conexión.') }
    finally { setLoading(false) }
  }, [tenantId])

  useEffect(() => { const timer = window.setTimeout(() => void loadList(), 0); return () => window.clearTimeout(timer) }, [loadList])
  useEffect(() => {
    if (!selectedId) return
    const controller = new AbortController()
    const load = async () => {
      setDetailLoading(true); setSelectedEvidence(undefined)
      try {
        const response = await fetch(`/api/documents/${selectedId}/docaudit`, { signal: controller.signal })
        const data = await response.json() as Detail
        if (!response.ok) throw new Error(data.error ?? 'No fue posible abrir el reporte.')
        setDetail(data); setNote(data.review?.note ?? ''); setError(undefined)
      } catch (cause) { if (!(cause instanceof DOMException && cause.name === 'AbortError')) setError(cause instanceof Error ? cause.message : 'Error de conexión.') }
      finally { if (!controller.signal.aborted) setDetailLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [selectedId])

  const report = detail && detail.document.id === selectedId ? detail.result.result : undefined
  const filteredFindings = useMemo(() => report?.findings.filter((finding) => severity === 'all' || finding.severity === severity) ?? [], [report, severity])
  const evidenceMap = useMemo(() => new Map(report?.evidence.map((entry) => [entry.id, entry]) ?? []), [report])
  const review = async (decision: ReviewDecision) => {
    if (!selectedId) return
    setSaving(true); setError(undefined)
    try {
      const response = await fetch(`/api/documents/${selectedId}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, note }) })
      const data = await response.json() as { review?: Review; error?: string }
      if (!response.ok || !data.review) throw new Error(data.error ?? 'No fue posible guardar la decisión.')
      setDetail((current) => current ? { ...current, review: data.review! } : current)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error de conexión.') }
    finally { setSaving(false) }
  }

  return <div className="space-y-5">
    <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 md:flex-row md:items-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary"><ShieldCheck className="size-6" /></div>
      <div className="min-w-0 flex-1"><p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">DocAudit Colombia</p><h1 className="text-2xl font-semibold tracking-tight">Centro de auditoría de facturas</h1><p className="text-sm text-muted-foreground">Datos extraídos, reglas deterministas, evidencia y decisión humana en un solo flujo.</p></div>
      <button type="button" onClick={() => void loadList()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</button>
    </header>
    {error && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
    <UploadWorkspace tenantId={tenantId} />
    <div className="grid min-h-[680px] gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4"><h2 className="font-semibold">Facturas procesadas</h2><p className="text-xs text-muted-foreground">{items.length} documentos recientes</p></div>
        <div className="max-h-[760px] overflow-y-auto p-2">
          {loading && !items.length && <div className="grid place-items-center py-12"><Loader2 className="size-5 animate-spin text-primary" /></div>}
          {!loading && !items.length && <p className="p-6 text-center text-sm text-muted-foreground">Carga una factura para comenzar.</p>}
          {items.map((item) => {
            const result = item.result?.result
            const counts = result?.conclusion.findingCounts
            return <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`mb-1 w-full rounded-lg border p-3 text-left transition-colors ${selectedId === item.id ? 'border-primary/50 bg-primary/10' : 'border-transparent hover:bg-muted/60'}`}>
              <div className="flex items-start gap-2"><FileSearch className="mt-0.5 size-4 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.original_name}</p><p className="mt-1 text-xs text-muted-foreground">{new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(item.created_at))}</p></div><ChevronRight className="size-4 text-muted-foreground" /></div>
              {result ? <div className="mt-2 flex gap-2 text-[11px]"><span className="rounded bg-red-500/10 px-1.5 py-0.5 text-red-300">{(counts?.critical ?? 0) + (counts?.error ?? 0)} errores</span><span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-300">{counts?.warning ?? 0} alertas</span></div> : <span className="mt-2 inline-block rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{item.status}</span>}
            </button>
          })}
        </div>
      </aside>
      <main className="min-w-0">
        {detailLoading && <div className="grid min-h-[500px] place-items-center rounded-xl border border-border bg-card"><Loader2 className="size-7 animate-spin text-primary" /></div>}
        {!detailLoading && !report && <div className="grid min-h-[500px] place-items-center rounded-xl border border-dashed border-border bg-card/40 p-8 text-center"><div><FileSearch className="mx-auto size-10 text-muted-foreground" /><h2 className="mt-3 font-semibold">Selecciona un reporte</h2><p className="text-sm text-muted-foreground">Aquí aparecerán los datos, hallazgos y evidencia.</p></div></div>}
        {!detailLoading && report && detail && <div className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{report.facts.document.kind.value ?? 'Documento'}</span><span className="text-xs text-muted-foreground">Esquema {report.schema.version} · Reglas {report.trace.rules.version}</span></div><h2 className="mt-2 text-xl font-semibold">{factValue(report.facts.document.number)}</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{report.conclusion.summary}</p></div><div className="flex flex-wrap gap-2"><a href={`/api/documents/${detail.document.id}/report`} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"><Download className="size-4" />Exportar JSON</a>{detail.review && <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-sm"><Check className="size-4 text-primary" />{decisionLabel[detail.review.decision]}</span>}</div></div>
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">{(['critical', 'error', 'warning', 'info'] as FindingSeverity[]).map((level) => <button key={level} type="button" onClick={() => setSeverity(level)} className={`rounded-lg border p-3 text-left ${severityStyle[level]} ${severity === level ? 'ring-2 ring-current/30' : ''}`}><p className="text-2xl font-semibold">{report.conclusion.findingCounts[level]}</p><p className="text-xs">{severityLabel[level]}</p></button>)}</div>
          </section>
          <section className="grid gap-4 lg:grid-cols-3">
            <FactCard title="Documento" rows={[["Número", report.facts.document.number], ["Fecha", report.facts.document.issueDate], ["Moneda", report.facts.document.currency], ["CUFE/CUDE", report.facts.document.uniqueCode]]} onEvidence={(fact) => fact.evidenceIds[0] && setSelectedEvidence(evidenceMap.get(fact.evidenceIds[0]))} />
            <FactCard title="Emisor" rows={[["Razón social", report.facts.supplier.name], ["Identificación", report.facts.supplier.taxId], ["DV", report.facts.supplier.verificationDigit], ["Correo", report.facts.supplier.email]]} onEvidence={(fact) => fact.evidenceIds[0] && setSelectedEvidence(evidenceMap.get(fact.evidenceIds[0]))} />
            <FactCard title="Adquirente" rows={[["Razón social", report.facts.customer.name], ["Identificación", report.facts.customer.taxId], ["DV", report.facts.customer.verificationDigit], ["Correo", report.facts.customer.email]]} onEvidence={(fact) => fact.evidenceIds[0] && setSelectedEvidence(evidenceMap.get(fact.evidenceIds[0]))} />
          </section>
          <section className="overflow-hidden rounded-xl border border-border bg-card"><div className="border-b border-border p-4"><h3 className="font-semibold">Líneas y totales</h3></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="p-3">Descripción</th><th className="p-3 text-right">Cantidad</th><th className="p-3 text-right">Precio</th><th className="p-3 text-right">Descuento</th><th className="p-3 text-right">Total línea</th></tr></thead><tbody>{report.facts.lines.map((line) => <tr key={line.id} className="border-t border-border/60"><td className="p-3">{factValue(line.description)}</td><td className="p-3 text-right">{factValue(line.quantity)}</td><td className="p-3 text-right">{factValue(line.unitPrice, money)}</td><td className="p-3 text-right">{factValue(line.discounts, money)}</td><td className="p-3 text-right font-medium">{factValue(line.lineExtensionAmount, money)}</td></tr>)}</tbody><tfoot className="border-t border-border bg-muted/30"><tr><td colSpan={4} className="p-3 text-right text-muted-foreground">Subtotal</td><td className="p-3 text-right font-medium">{factValue(report.facts.totals.lineExtension, money)}</td></tr><tr><td colSpan={4} className="p-3 text-right text-muted-foreground">Impuestos incluidos</td><td className="p-3 text-right font-medium">{factValue(report.facts.totals.taxInclusive, money)}</td></tr><tr><td colSpan={4} className="p-3 text-right font-semibold">Total pagadero</td><td className="p-3 text-right text-base font-semibold text-primary">{factValue(report.facts.totals.payable, money)}</td></tr></tfoot></table></div></section>
          <section className="rounded-xl border border-border bg-card"><div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center"><div className="mr-auto"><h3 className="font-semibold">Inconsistencias</h3><p className="text-xs text-muted-foreground">Reglas deterministas con explicación y evidencia</p></div><select value={severity} onChange={(event) => setSeverity(event.target.value as typeof severity)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="all">Todas las severidades</option>{(['critical', 'error', 'warning', 'info'] as FindingSeverity[]).map((level) => <option key={level} value={level}>{severityLabel[level]}</option>)}</select></div><div className="divide-y divide-border">{filteredFindings.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No hay hallazgos para este filtro.</p>}{filteredFindings.map((finding) => <article key={finding.id} className="p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start"><span className={`w-fit rounded-full border px-2 py-1 text-[11px] font-semibold ${severityStyle[finding.severity]}`}>{severityLabel[finding.severity]}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="font-medium">{finding.title}</h4><code className="text-[11px] text-muted-foreground">{finding.code}</code></div><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{finding.description}</p><div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><div className="rounded bg-muted/50 p-2"><span className="text-muted-foreground">Observado: </span>{String(finding.observed ?? 'No disponible')}</div><div className="rounded bg-muted/50 p-2"><span className="text-muted-foreground">Esperado: </span>{String(finding.expected ?? 'No disponible')}</div></div><p className="mt-2 text-xs"><span className="text-muted-foreground">Recomendación: </span>{finding.recommendation}</p><div className="mt-3 flex flex-wrap gap-2">{finding.evidenceIds.map((id) => { const evidence = evidenceMap.get(id); return evidence ? <button key={id} type="button" onClick={() => setSelectedEvidence(evidence)} className="rounded-md border border-border px-2 py-1 text-xs text-primary hover:bg-primary/10">Ver evidencia {id}</button> : null })}</div></div></div></article>)}</div></section>
          <section className="rounded-xl border border-border bg-card p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end"><div className="min-w-0 flex-1"><h3 className="font-semibold">Decisión humana</h3><p className="text-xs text-muted-foreground">La decisión no modifica el reporte original y queda registrada.</p><textarea value={note} onChange={(event) => setNote(event.target.value.slice(0, 1000))} disabled={!detail.canReview || saving} placeholder="Nota opcional para el equipo" className="mt-3 min-h-20 w-full rounded-lg border border-input bg-background p-3 text-sm disabled:opacity-50" /><p className="mt-1 text-right text-[11px] text-muted-foreground">{note.length}/1000</p></div><div className="flex flex-wrap gap-2"><DecisionButton disabled={!detail.canReview || saving} onClick={() => void review('approved')} icon={CheckCircle2} label="Aprobar" className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10" /><DecisionButton disabled={!detail.canReview || saving} onClick={() => void review('needs_review')} icon={Clock3} label="Revisar" className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10" /><DecisionButton disabled={!detail.canReview || saving} onClick={() => void review('rejected')} icon={XCircle} label="Rechazar" className="border-red-500/40 text-red-300 hover:bg-red-500/10" /></div></div>{role === 'viewer' && <p className="mt-3 text-xs text-muted-foreground">Tu rol permite consultar y exportar, pero no registrar decisiones.</p>}</section>
        </div>}
      </main>
    </div>
    {selectedEvidence && report && <EvidenceDialog evidence={selectedEvidence} pages={detail?.pages ?? []} onClose={() => setSelectedEvidence(undefined)} />}
  </div>
}

function FactCard({ title, rows, onEvidence }: { title: string; rows: Array<[string, Fact<unknown>]>; onEvidence: (fact: Fact<unknown>) => void }) {
  return <section className="rounded-xl border border-border bg-card p-4"><h3 className="font-semibold">{title}</h3><dl className="mt-3 space-y-3">{rows.map(([label, fact]) => <div key={label} className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="max-w-[65%] break-all text-right text-sm">{factValue(fact)}{fact.evidenceIds.length > 0 && <button type="button" onClick={() => onEvidence(fact)} className="ml-1 text-xs text-primary" title="Ver evidencia">↗</button>}</dd></div>)}</dl></section>
}

function DecisionButton({ icon: Icon, label, className, ...props }: { icon: typeof CheckCircle2; label: string; className: string; disabled: boolean; onClick: () => void }) {
  return <button type="button" {...props} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-40 ${className}`}><Icon className="size-4" />{label}</button>
}

function EvidenceDialog({ evidence, pages, onClose }: { evidence: Evidence; pages: PageEvidence[]; onClose: () => void }) {
  const pageNumber = Number(evidence.locator.match(/page:(\d+)/)?.[1] ?? 0)
  const page = pages.find((entry) => entry.page === pageNumber)
  const locationLabel = pageNumber ? `Página ${pageNumber}` : evidence.kind === 'calculation' ? 'Cálculo derivado' : evidence.kind === 'xml_path' ? 'Ubicación XML' : 'Ubicación no disponible'
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" onMouseDown={onClose}><div role="dialog" aria-modal="true" aria-label="Evidencia del hallazgo" className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-5" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold tracking-wider text-primary uppercase">Evidencia {evidence.id}</p><h3 className="mt-1 font-semibold">{locationLabel}</h3></div><button type="button" onClick={onClose} aria-label="Cerrar evidencia"><X className="size-5" /></button></div><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div className="rounded-lg bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">Tipo</dt><dd className="mt-1">{evidence.kind}</dd></div><div className="rounded-lg bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">Localizador</dt><dd className="mt-1 break-all font-mono text-xs">{evidence.locator}</dd></div></dl>{evidence.excerpt && <div className="mt-4"><h4 className="text-xs font-semibold text-muted-foreground">Fragmento</h4><pre className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-background p-3 text-xs">{evidence.excerpt}</pre></div>}{page && <div className="mt-4"><h4 className="text-xs font-semibold text-muted-foreground">Texto extraído de la página {page.page}</h4><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-3 text-xs leading-relaxed">{page.text}</pre></div>}</div></div>
}
