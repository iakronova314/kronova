import { authorizeDocAuditDocument } from '@/lib/server/docaudit-access'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const access = await authorizeDocAuditDocument(id)
  if (!access.ok) return Response.json({ error: access.status === 401 ? 'Debes iniciar sesión.' : 'Reporte no encontrado.' }, { status: access.status })
  const { data, error } = await access.supabase.from('analysis_results').select('result').eq('document_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) return Response.json({ error: 'No fue posible exportar el reporte.' }, { status: 500 })
  if (!data) return Response.json({ error: 'El reporte aún no está disponible.' }, { status: 404 })
  const baseName = access.document.original_name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100) || 'docaudit'
  return new Response(JSON.stringify(data.result, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${baseName}-docaudit.json"`,
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    },
  })
}
