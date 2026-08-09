import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DOCAUDIT_SCHEMA_VERSION } from '@/modules/docaudit/colombia/schemas/v1'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 20

const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })

async function sha256(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function validContent(bytes: Uint8Array, mime: string) {
  if (mime === 'application/pdf') return new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-'
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  if (text.includes('\0')) return false
  if (mime === 'application/json') { try { JSON.parse(text); return true } catch { return false } }
  if (mime === 'application/xml' || mime === 'text/xml') return text.trimStart().startsWith('<?xml') || text.trimStart().startsWith('<')
  return true
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = String(claims?.claims?.sub ?? '')
  if (!userId) return reply({ error: 'Debes iniciar sesión.' }, 401)
  const { data: document } = await supabase.from('documents')
    .select('id,tenant_id,uploaded_by,bucket_name,storage_path,original_name,mime_type,size_bytes,status')
    .eq('id', id).eq('uploaded_by', userId).eq('status', 'pending_upload').is('deleted_at', null).maybeSingle()
  if (!document) return reply({ error: 'Carga pendiente no encontrada.' }, 404)

  const admin = createAdminClient()
  const { data: blob, error: downloadError } = await admin.storage.from(document.bucket_name).download(document.storage_path)
  if (downloadError || !blob) return reply({ error: 'El archivo no está disponible en Storage.' }, 409)
  const buffer = await blob.arrayBuffer()
  if (buffer.byteLength !== Number(document.size_bytes)) {
    await admin.storage.from(document.bucket_name).remove([document.storage_path])
    await admin.from('documents').update({ status: 'failed' }).eq('id', id)
    return reply({ error: 'El tamaño almacenado no coincide con el declarado.' }, 422)
  }
  try {
    if (!validContent(new Uint8Array(buffer), document.mime_type)) throw new Error('INVALID_CONTENT')
  } catch {
    await admin.storage.from(document.bucket_name).remove([document.storage_path])
    await admin.from('documents').update({ status: 'failed' }).eq('id', id)
    return reply({ error: 'El contenido real no coincide con el tipo declarado.' }, 415)
  }

  const hash = await sha256(buffer)
  const { data: duplicate } = await admin.from('documents').select('id').eq('tenant_id', document.tenant_id).eq('sha256', hash).is('deleted_at', null).neq('id', id).maybeSingle()
  if (duplicate) {
    await admin.storage.from(document.bucket_name).remove([document.storage_path])
    await admin.from('documents').update({ status: 'deleted', deleted_at: new Date().toISOString(), sha256: hash, metadata: { duplicate_of: duplicate.id } }).eq('id', id)
    return reply({ error: 'Este documento ya fue cargado en la organización.', duplicateDocumentId: duplicate.id }, 409)
  }

  const { error: updateError } = await admin.from('documents').update({ status: 'uploaded', sha256: hash }).eq('id', id).eq('status', 'pending_upload')
  if (updateError) {
    const { data: racedDuplicate } = await admin.from('documents').select('id').eq('tenant_id', document.tenant_id).eq('sha256', hash).is('deleted_at', null).neq('id', id).maybeSingle()
    if (racedDuplicate) {
      await admin.storage.from(document.bucket_name).remove([document.storage_path])
      await admin.from('documents').update({ status: 'deleted', deleted_at: new Date().toISOString(), metadata: { duplicate_of: racedDuplicate.id } }).eq('id', id)
      return reply({ error: 'Este documento ya fue cargado en la organización.', duplicateDocumentId: racedDuplicate.id }, 409)
    }
    return reply({ error: 'No fue posible confirmar la carga.' }, 500)
  }
  const idempotencyKey = `document:${id}:pipeline:v1`
  const { data: reservations, error: jobError } = await admin.rpc('create_analysis_job_with_quota', {
    target_tenant_id: document.tenant_id, target_document_id: id, requesting_user_id: userId,
    target_idempotency_key: idempotencyKey, target_schema_version: DOCAUDIT_SCHEMA_VERSION,
  })
  const reservation = Array.isArray(reservations) ? reservations[0] : reservations
  if (jobError) return reply({ error: 'El documento fue almacenado, pero no fue posible reservar la cuota.' }, 500)
  if (!reservation?.allowed) return reply({ error: 'Alcanzaste el límite de documentos del periodo.', code: 'DOCUMENT_QUOTA_EXCEEDED', usage: { used: reservation?.used_units ?? 0, limit: reservation?.document_limit ?? 300, periodEnd: reservation?.period_end } }, 402)
  return reply({ success: true, documentId: id, sha256: hash, status: 'queued', jobId: reservation.job_id, jobStatus: reservation.job_status, usage: { used: reservation.used_units, limit: reservation.document_limit, periodEnd: reservation.period_end } }, 202)
}
