import 'server-only'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function requirePlatformAdmin() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const userId = String(data?.claims?.sub ?? '')
  if (error || !userId) redirect('/login?next=/admin')

  const admin = createAdminClient()
  const { data: access } = await admin.from('platform_admins').select('role').eq('user_id', userId).maybeSingle()
  if (!access) redirect('/dashboard')
  return { admin, userId, email: String(data?.claims?.email ?? ''), role: String(access.role) }
}
