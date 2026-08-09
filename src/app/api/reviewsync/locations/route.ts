import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function access(tenantId: string) {
  const supabase = await createClient(); const { data: claims } = await supabase.auth.getClaims(); const userId = String(claims?.claims?.sub ?? '')
  if (!userId) return null
  const { data: member } = await supabase.from('tenant_members').select('role').eq('tenant_id', tenantId).eq('user_id', userId).eq('status', 'active').maybeSingle()
  return member ? { supabase, userId, role: String(member.role) } : null
}
export async function GET(request: Request) {
  const tenantId = new URL(request.url).searchParams.get('tenantId') ?? ''; const auth = await access(tenantId)
  if (!auth) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  const { data: locations } = await auth.supabase.from('review_locations').select('id,name,address,verified,selected,sync_status,last_synced_at,last_error').eq('tenant_id', tenantId).order('name')
  return NextResponse.json({ locations: locations ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}
export async function PATCH(request: Request) {
  const body = await request.json() as { tenantId?: string; locationIds?: string[] }; const auth = await access(body.tenantId ?? '')
  if (!auth || !['owner','admin'].includes(auth.role)) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  if (!Array.isArray(body.locationIds) || body.locationIds.length > 100) return NextResponse.json({ error: 'Ubicaciones inválidas.' }, { status: 400 })
  const admin = createAdminClient(); await admin.from('review_locations').update({ selected: false }).eq('tenant_id', body.tenantId!)
  if (body.locationIds.length) await admin.from('review_locations').update({ selected: true }).eq('tenant_id', body.tenantId!).in('id', body.locationIds).eq('verified', true)
  return NextResponse.json({ success: true })
}
