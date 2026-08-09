import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DOCAUDIT_SCHEMA_VERSION } from '@/modules/docaudit/colombia/schemas/v1'
import { createClient } from '@/lib/supabase/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
async function hash(value: string) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map((byte) => byte.toString(16).padStart(2, '0')).join('') }

export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get('content-length') ?? 0) > 4096) return reply({ error: 'Solicitud demasiado grande.' }, 413)
    const tenantId = request.headers.get('x-kronova-tenant-id') ?? ''
    if (!UUID.test(tenantId)) return reply({ error: 'Organización inválida.' }, 400)
    const supabase = await createClient()
    const { data: claims } = await supabase.auth.getClaims()
    const userId = String(claims?.claims?.sub ?? '')
    if (!userId) return reply({ error: 'Debes iniciar sesión.' }, 401)
    const body = await request.json() as { documentId?: unknown }
    if (typeof body.documentId !== 'string' || !UUID.test(body.documentId)) return reply({ error: 'Documento inválido.' }, 400)
    const { data: document } = await supabase.from('documents').select('id,status').eq('id', body.documentId).eq('tenant_id', tenantId).is('deleted_at', null).maybeSingle()
    if (!document) return reply({ error: 'Documento no encontrado.' }, 404)
    const admin = createAdminClient()
    const ip = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const { data: limits } = await admin.rpc('consume_api_rate_limit', { actor_user_id: userId, target_tenant_id: tenantId, ip_hash: await hash(ip) })
    const limit = Array.isArray(limits) ? limits[0] : limits
    if (!limit?.allowed) return reply({ error: 'Demasiadas solicitudes.' }, 429)
    const idempotencyKey = `document:${body.documentId}:pipeline:v1`
    const { data: reservations, error } = await admin.rpc('create_analysis_job_with_quota', {
      target_tenant_id: tenantId, target_document_id: body.documentId, requesting_user_id: userId,
      target_idempotency_key: idempotencyKey, target_schema_version: DOCAUDIT_SCHEMA_VERSION,
    })
    const reservation = Array.isArray(reservations) ? reservations[0] : reservations
    if (error) return reply({ error: 'No fue posible reservar la cuota y crear el trabajo.' }, 500)
    if (!reservation?.allowed) return reply({ error: 'Alcanzaste el límite de documentos del periodo.', code: 'DOCUMENT_QUOTA_EXCEEDED', usage: { used: reservation?.used_units ?? 0, limit: reservation?.document_limit ?? 300, periodEnd: reservation?.period_end } }, 402)
    return reply({ success: true, job: { id: reservation.job_id, status: reservation.job_status, progress: reservation.progress }, usage: { used: reservation.used_units, limit: reservation.document_limit, periodEnd: reservation.period_end } }, 202)
  } catch (error) {
    console.error('Queue request failed', { errorType: error instanceof Error ? error.name : typeof error })
    return reply({ error: 'No fue posible encolar el documento.' }, 500)
  }
}
