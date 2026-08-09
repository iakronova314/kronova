import { NextResponse } from 'next/server'
import { authorizeModuleDocument } from '@/lib/server/docaudit-access'

const DECISIONS = ['approved', 'rejected', 'needs_review'] as const

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (Number(request.headers.get('content-length') ?? 0) > 32_768) return NextResponse.json({ error: 'Solicitud demasiado grande.' }, { status: 413 })
  const { id } = await context.params
  const access = await authorizeModuleDocument(id)
  if (!access.ok) return NextResponse.json({ error: access.status === 401 ? 'Debes iniciar sesión.' : 'Documento no encontrado.' }, { status: access.status })
  if (!['owner', 'admin', 'analyst'].includes(access.role)) return NextResponse.json({ error: 'No tienes permiso para revisar este reporte.' }, { status: 403 })
  const body = await request.json() as { decision?: unknown; note?: unknown; corrections?: unknown }
  if (typeof body.decision !== 'string' || !DECISIONS.includes(body.decision as typeof DECISIONS[number])) return NextResponse.json({ error: 'Decisión inválida.' }, { status: 400 })
  if (body.note !== undefined && body.note !== null && (typeof body.note !== 'string' || body.note.length > 1000)) return NextResponse.json({ error: 'Nota inválida.' }, { status: 400 })
  const corrections = body.corrections === undefined ? [] : body.corrections
  if (!Array.isArray(corrections) || corrections.length > 150 || corrections.some((entry) => {
    if (!entry || typeof entry !== 'object') return true
    const item = entry as Record<string, unknown>
    return typeof item.path !== 'string' || item.path.length > 120 || (!['string', 'number', 'boolean'].includes(typeof item.value) && item.value !== null)
  })) return NextResponse.json({ error: 'Correcciones inválidas.' }, { status: 400 })
  const { data, error } = await access.supabase.from('document_reviews').upsert({
    tenant_id: access.document.tenant_id, document_id: id, decision: body.decision,
    note: typeof body.note === 'string' ? body.note.trim() || null : null, corrections,
    decided_by: access.userId, decided_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,document_id' }).select('decision,note,corrections,decided_by,decided_at').single()
  if (error) return NextResponse.json({ error: 'No fue posible guardar la revisión.' }, { status: 500 })
  return NextResponse.json({ review: data }, { headers: { 'Cache-Control': 'no-store' } })
}
