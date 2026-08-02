import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const TYPES: Record<string, string[]> = { pdf: ['application/pdf'], xml: ['application/xml', 'text/xml'], txt: ['text/plain'], md: ['text/markdown', 'text/plain'], json: ['application/json'], csv: ['text/csv', 'text/plain'] }
const MAX_BYTES = 10 * 1024 * 1024
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })

export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get('content-length') ?? 0) > 4096) return reply({ error: 'Solicitud demasiado grande.' }, 413)
    const tenantId = request.headers.get('x-kronova-tenant-id') ?? ''
    if (!UUID.test(tenantId)) return reply({ error: 'Organización inválida.' }, 400)
    const supabase = await createClient()
    const { data: claims } = await supabase.auth.getClaims()
    const userId = String(claims?.claims?.sub ?? '')
    if (!userId) return reply({ error: 'Debes iniciar sesión.' }, 401)
    const { data: member } = await supabase.from('tenant_members').select('user_id').eq('tenant_id', tenantId).eq('user_id', userId).eq('status', 'active').maybeSingle()
    if (!member) return reply({ error: 'No tienes acceso a esta organización.' }, 403)

    const body = await request.json() as { fileName?: unknown; mimeType?: unknown; sizeBytes?: unknown; module?: unknown }
    if (typeof body.fileName !== 'string' || body.fileName.length > 255 || /[\\/\0]/.test(body.fileName)) return reply({ error: 'Nombre de archivo inválido.' }, 400)
    const extension = body.fileName.toLowerCase().split('.').pop() ?? ''
    if (typeof body.mimeType !== 'string' || !TYPES[extension]?.includes(body.mimeType) || !Number.isInteger(body.sizeBytes) || Number(body.sizeBytes) <= 0 || Number(body.sizeBytes) > MAX_BYTES) return reply({ error: 'Tipo o tamaño de archivo no permitido.' }, 415)
    const documentId = crypto.randomUUID()
    const safeName = body.fileName.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120)
    const path = `${tenantId}/${userId}/${documentId}/${safeName}`
    const admin = createAdminClient()
    const { data: signed, error: signError } = await admin.storage.from('documents').createSignedUploadUrl(path, { upsert: false })
    if (signError) throw signError
    const moduleName = ['docaudit', 'leasereader', 'reviewsync'].includes(String(body.module)) ? String(body.module) : 'docaudit'
    const { error: insertError } = await admin.from('documents').insert({ id: documentId, tenant_id: tenantId, uploaded_by: userId, module: moduleName, original_name: body.fileName, bucket_name: 'documents', storage_path: path, mime_type: body.mimeType, size_bytes: body.sizeBytes, status: 'pending_upload' })
    if (insertError) throw insertError
    return reply({ documentId, path: signed.path, token: signed.token, expiresIn: 7200 }, 201)
  } catch (error) {
    console.error('Signed upload creation failed', { errorType: error instanceof Error ? error.name : typeof error })
    return reply({ error: 'No fue posible preparar la carga.' }, 500)
  }
}
