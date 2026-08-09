import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncReviewLocation } from '@/lib/server/reviewsync/sync-reviews'

export async function POST(request: Request) {
  const body = await request.json() as { tenantId?: string; locationId?: string }; const supabase = await createClient(); const { data: claims } = await supabase.auth.getClaims(); const userId = String(claims?.claims?.sub ?? '')
  if (!userId || !body.tenantId || !body.locationId) return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  const { data: member } = await supabase.from('tenant_members').select('role').eq('tenant_id', body.tenantId).eq('user_id', userId).eq('status', 'active').maybeSingle()
  if (!member || member.role === 'viewer') return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  try { return NextResponse.json(await syncReviewLocation(body.locationId, body.tenantId)) }
  catch (error) { console.error('Review sync failed', error); return NextResponse.json({ error: 'No fue posible sincronizar reseñas.' }, { status: 503 }) }
}
