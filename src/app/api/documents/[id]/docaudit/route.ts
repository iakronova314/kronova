import { NextResponse } from 'next/server'
import { authorizeDocAuditDocument } from '@/lib/server/docaudit-access'

const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const access = await authorizeDocAuditDocument(id)
  if (!access.ok) return reply({ error: access.status === 401 ? 'Debes iniciar sesión.' : 'Reporte no encontrado.' }, access.status)
  const [{ data: result, error: resultError }, { data: extraction }, { data: review }] = await Promise.all([
    access.supabase.from('analysis_results').select('id,result,summary,schema_version,model_name,model_version,prompt_version,rules_version,created_at').eq('document_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    access.supabase.from('document_extractions').select('pages,page_count,extraction_method').eq('document_id', id).maybeSingle(),
    access.supabase.from('document_reviews').select('decision,note,decided_by,decided_at').eq('document_id', id).maybeSingle(),
  ])
  if (resultError) return reply({ error: 'No fue posible cargar el reporte.' }, 500)
  if (!result) return reply({ error: 'El documento todavía no tiene un reporte.' }, 404)
  return reply({ document: access.document, result, pages: extraction?.pages ?? [], pageCount: extraction?.page_count ?? 0, extractionMethod: extraction?.extraction_method ?? null, review: review ?? null, canReview: ['owner', 'admin', 'analyst'].includes(access.role) })
}
