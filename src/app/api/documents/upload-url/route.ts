import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getTenantEntitlements, type ModuleCode } from '@/lib/server/billing/entitlements'

const TYPES: Record<string, string[]> = { pdf: ['application/pdf'], xml: ['application/xml', 'text/xml'], txt: ['text/plain'], md: ['text/markdown', 'text/plain'], json: ['application/json'], csv: ['text/csv', 'text/plain'] }
const MAX_BYTES = 10 * 1024 * 1024
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
async function hash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map((byte)=>byte.toString(16).padStart(2,'0')).join('')}

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

    const body = await request.json() as { fileName?: unknown; mimeType?: unknown; sizeBytes?: unknown; module?: unknown; processingConsent?: unknown }
    if (body.processingConsent !== true) return reply({ error: 'Debes confirmar la autorización para tratar el documento.', code: 'DOCUMENT_PROCESSING_CONSENT_REQUIRED' }, 422)
    const moduleName = ['docaudit', 'leasereader', 'reviewsync'].includes(String(body.module)) ? String(body.module) as ModuleCode : 'docaudit'
    const entitlements = await getTenantEntitlements(tenantId)
    if (!entitlements || !entitlements.allowedModules.includes(moduleName)) {
      return reply({ error: 'Tu plan no incluye este módulo o la suscripción está vencida.', code: 'MODULE_NOT_ENTITLED', subscriptionStatus: entitlements?.status ?? 'none' }, 402)
    }

    const admin = createAdminClient()
    const ip=request.headers.get('cf-connecting-ip')??request.headers.get('x-real-ip')??request.headers.get('x-forwarded-for')?.split(',')[0]??'unknown'
    const{data:limitRows}=await admin.rpc('consume_api_rate_limit',{actor_user_id:userId,target_tenant_id:tenantId,ip_hash:await hash(ip)})
    const limit=Array.isArray(limitRows)?limitRows[0]:limitRows
    if(!limit?.allowed)return reply({error:'Demasiadas solicitudes.',retryAfter:limit?.retry_after_seconds??60},429)
    const { data: usageRows, error: usageError } = await admin.rpc('get_tenant_document_usage', { target_tenant_id: tenantId })
    const usage = Array.isArray(usageRows) ? usageRows[0] : usageRows
    if (usageError || !usage) return reply({ error: 'No fue posible verificar la cuota.' }, 503)
    if (Number(usage.used_units) >= Number(usage.document_limit)) return reply({ error: 'Alcanzaste el límite de documentos del periodo.', code: 'DOCUMENT_QUOTA_EXCEEDED', usage: { used: Number(usage.used_units), limit: Number(usage.document_limit), periodEnd: usage.period_end } }, 402)

    if (typeof body.fileName !== 'string' || body.fileName.length > 255 || /[\\/\0]/.test(body.fileName)) return reply({ error: 'Nombre de archivo inválido.' }, 400)
    const extension = body.fileName.toLowerCase().split('.').pop() ?? ''
    if (typeof body.mimeType !== 'string' || !TYPES[extension]?.includes(body.mimeType) || !Number.isInteger(body.sizeBytes) || Number(body.sizeBytes) <= 0 || Number(body.sizeBytes) > MAX_BYTES) return reply({ error: 'Tipo o tamaño de archivo no permitido.' }, 415)
    const documentId = crypto.randomUUID()
    const safeName = body.fileName.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120)
    const path = `${tenantId}/${userId}/${documentId}/${safeName}`
    const { data: signed, error: signError } = await admin.storage.from('documents').createSignedUploadUrl(path, { upsert: false })
    if (signError) throw signError
    const { data: privacy } = await admin.from('tenant_privacy_settings').select('document_retention_days').eq('tenant_id',tenantId).maybeSingle()
    const retentionUntil = new Date(Date.now() + Number(privacy?.document_retention_days ?? 30) * 86_400_000).toISOString()
    const { error: insertError } = await admin.from('documents').insert({ id: documentId, tenant_id: tenantId, uploaded_by: userId, module: moduleName, original_name: body.fileName, bucket_name: 'documents', storage_path: path, mime_type: body.mimeType, size_bytes: body.sizeBytes, status: 'pending_upload', retention_until: retentionUntil })
    if (insertError) throw insertError
    await admin.from('legal_acceptances').insert({ user_id:userId,tenant_id:tenantId,document_id:documentId,purpose:'document_processing',policy_version:'2026-08-09',source:'upload',evidence:{authorized_by_organization:true} })
    return reply({ documentId, path: signed.path, token: signed.token, expiresIn: 7200 }, 201)
  } catch (error) {
    console.error('Signed upload creation failed', { errorType: error instanceof Error ? error.name : typeof error })
    return reply({ error: 'No fue posible preparar la carga.' }, 500)
  }
}
