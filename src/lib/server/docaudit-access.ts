import 'server-only'
import { createClient } from '@/lib/supabase/server'

export async function authorizeDocAuditDocument(id: string) {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = String(claims?.claims?.sub ?? '')
  if (!userId) return { ok: false as const, status: 401 as const }
  const { data: document } = await supabase.from('documents')
    .select('id,tenant_id,original_name,mime_type,size_bytes,status,created_at,module')
    .eq('id', id).eq('module', 'docaudit').is('deleted_at', null).maybeSingle()
  if (!document) return { ok: false as const, status: 404 as const }
  const { data: membership } = await supabase.from('tenant_members').select('role')
    .eq('tenant_id', document.tenant_id).eq('user_id', userId).eq('status', 'active').maybeSingle()
  if (!membership) return { ok: false as const, status: 404 as const }
  return { ok: true as const, supabase, userId, role: String(membership.role), document }
}

export async function authorizeModuleDocument(id: string, module?: 'docaudit' | 'leasereader' | 'reviewsync') {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = String(claims?.claims?.sub ?? '')
  if (!userId) return { ok: false as const, status: 401 as const }
  let query = supabase.from('documents').select('id,tenant_id,original_name,mime_type,size_bytes,status,created_at,module').eq('id', id).is('deleted_at', null)
  if (module) query = query.eq('module', module)
  const { data: document } = await query.maybeSingle()
  if (!document) return { ok: false as const, status: 404 as const }
  const { data: membership } = await supabase.from('tenant_members').select('role').eq('tenant_id', document.tenant_id).eq('user_id', userId).eq('status', 'active').maybeSingle()
  if (!membership) return { ok: false as const, status: 404 as const }
  return { ok: true as const, supabase, userId, role: String(membership.role), document }
}
