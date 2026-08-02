import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 })
  const { data: document } = await supabase.from('documents').select('id,tenant_id,status').eq('id', id).is('deleted_at', null).maybeSingle()
  if (!document) return NextResponse.json({ error: 'Documento no encontrado.' }, { status: 404 })
  const admin = createAdminClient()
  const { data: job } = await admin.from('analysis_jobs').select('id,status').eq('tenant_id', document.tenant_id).eq('document_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!job || !['failed', 'retrying'].includes(job.status)) return NextResponse.json({ error: 'El trabajo no está disponible para reintento.' }, { status: 409 })
  const { error } = await admin.from('analysis_jobs').update({ status: 'queued', progress: 0, attempt_count: 0, queued_at: new Date().toISOString(), started_at: null, completed_at: null, locked_by: null, locked_until: null, error_code: null, error_message: null }).eq('id', job.id).eq('tenant_id', document.tenant_id)
  if (error) return NextResponse.json({ error: 'No fue posible reintentar el trabajo.' }, { status: 500 })
  await admin.from('documents').update({ status: 'queued' }).eq('id', id).eq('tenant_id', document.tenant_id)
  return NextResponse.json({ success: true, jobId: job.id, status: 'queued' })
}
