import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { connectionAccessToken, googlePut } from '@/lib/server/reviewsync/google'
import { sha256Base64Url } from '@/lib/server/reviewsync/secrets'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; const body = await request.json() as { tenantId?: string; text?: string; confirm?: boolean }
  if (!body.tenantId || body.confirm !== true || typeof body.text !== 'string' || !body.text.trim() || new TextEncoder().encode(body.text.trim()).length > 4096) return NextResponse.json({ error: 'Aprobación o texto inválido.' }, { status: 400 })
  const supabase = await createClient(); const { data: claims } = await supabase.auth.getClaims(); const userId = String(claims?.claims?.sub ?? '')
  const { data: member } = userId ? await supabase.from('tenant_members').select('role').eq('tenant_id', body.tenantId).eq('user_id', userId).eq('status', 'active').maybeSingle() : { data: null }
  if (!member || member.role === 'viewer') return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  const admin = createAdminClient(); const { data: review } = await admin.from('reviews').select('id,tenant_id,external_resource_name,location:review_locations!inner(connection_id)').eq('id', id).eq('tenant_id', body.tenantId).single()
  if (!review) return NextResponse.json({ error: 'Reseña no encontrada.' }, { status: 404 })
  const text = body.text.trim(); const hash = await sha256Base64Url(text); const key = `google-reply:${id}:${hash}`
  const { data: existing } = await admin.from('review_publications').select('id,status').eq('idempotency_key', key).maybeSingle()
  if (existing?.status === 'published') return NextResponse.json({ published: true, duplicate: true })
  const { data: latest } = await admin.from('review_reply_drafts').select('version').eq('review_id', id).order('version', { ascending: false }).limit(1).maybeSingle()
  const { data: draft, error: draftError } = await admin.from('review_reply_drafts').insert({ tenant_id: body.tenantId, review_id: id, version: Number(latest?.version ?? 0) + 1, text, status: 'approved', text_hash: hash, created_by: userId, approved_by: userId, approved_at: new Date().toISOString() }).select('id').single()
  if (draftError) return NextResponse.json({ error: 'No fue posible registrar la aprobación.' }, { status: 409 })
  const publication = await admin.from('review_publications').upsert({ tenant_id: body.tenantId, review_id: id, draft_id: draft.id, idempotency_key: key, status: 'publishing', attempted_by: userId }, { onConflict: 'idempotency_key' }).select('id').single()
  try {
    await admin.from('review_reply_drafts').update({ status: 'publishing' }).eq('id', draft.id)
    const location = review.location as unknown as { connection_id: string }; const token = await connectionAccessToken(location.connection_id)
    const response = await googlePut<{ comment?: string; updateTime?: string; reviewReplyState?: string }>(`https://mybusiness.googleapis.com/v4/${review.external_resource_name}/reply`, token, { comment: text })
    await admin.from('review_publications').update({ status: 'published', external_response: { updateTime: response.updateTime, state: response.reviewReplyState }, completed_at: new Date().toISOString() }).eq('id', publication.data!.id)
    await admin.from('review_reply_drafts').update({ status: 'published' }).eq('id', draft.id)
    await admin.from('reviews').update({ reply_text: response.comment ?? text, reply_updated_at: response.updateTime ?? new Date().toISOString() }).eq('id', id)
    return NextResponse.json({ published: true })
  } catch (cause) {
    const message = (cause instanceof Error ? cause.message : 'PUBLISH_FAILED').slice(0, 500)
    await admin.from('review_publications').update({ status: 'failed', error_code: message.split(':')[0], error_message: message, completed_at: new Date().toISOString() }).eq('id', publication.data!.id)
    await admin.from('review_reply_drafts').update({ status: 'failed' }).eq('id', draft.id)
    return NextResponse.json({ error: 'Google no aceptó la respuesta; vuelve a revisarla.' }, { status: 503 })
  }
}
