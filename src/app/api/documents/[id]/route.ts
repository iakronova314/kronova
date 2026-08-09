import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })

type ServerClient = Awaited<ReturnType<typeof createClient>>
type StoredDocument = { id: string; tenant_id: string; uploaded_by: string | null; bucket_name: string; storage_path: string; original_name: string; deleted_at: string | null }
type DocumentAccess = { status: 401 | 404 } | { status: 200; document: StoredDocument; userId: string; supabase: ServerClient }

async function authorizedDocument(id: string): Promise<DocumentAccess> {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = String(claims?.claims?.sub ?? '')
  if (!userId) return { status: 401 as const }
  const { data } = await supabase.from('documents').select('id,tenant_id,uploaded_by,bucket_name,storage_path,original_name,deleted_at').eq('id', id).is('deleted_at', null).maybeSingle()
  return data ? { status: 200 as const, document: data, userId, supabase } : { status: 404 as const }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const access = await authorizedDocument(id)
  if (access.status !== 200) return reply({ error: access.status === 401 ? 'Debes iniciar sesión.' : 'Documento no encontrado.' }, access.status)
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(access.document.bucket_name).createSignedUrl(access.document.storage_path, 300, { download: access.document.original_name })
  if (error) return reply({ error: 'No fue posible generar el enlace.' }, 500)
  return reply({ signedUrl: data.signedUrl, expiresIn: 300 })
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const access = await authorizedDocument(id)
  if (access.status !== 200) return reply({ error: access.status === 401 ? 'Debes iniciar sesión.' : 'Documento no encontrado.' }, access.status)
  const { data: membership } = await access.supabase.from('tenant_members').select('role').eq('tenant_id', access.document.tenant_id).eq('user_id', access.userId).eq('status', 'active').single()
  if (access.document.uploaded_by !== access.userId && !['owner', 'admin'].includes(String(membership?.role))) return reply({ error: 'No tienes permiso para eliminar este documento.' }, 403)
  const admin = createAdminClient()
  const { error: storageError } = await admin.storage.from(access.document.bucket_name).remove([access.document.storage_path])
  if (storageError) return reply({ error: 'No fue posible eliminar el documento.' }, 502)
  const { error: dbError } = await admin.from('documents').delete().eq('id', id).eq('tenant_id', access.document.tenant_id)
  if (dbError) return reply({ error: 'El archivo fue eliminado, pero no fue posible eliminar sus metadatos.' }, 500)
  return reply({ success: true })
}
