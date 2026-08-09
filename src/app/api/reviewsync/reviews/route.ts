import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId') ?? ''; const supabase = await createClient(); const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  const { data: member } = await supabase.from('tenant_members').select('role').eq('tenant_id', tenantId).eq('user_id', String(claims.claims.sub)).eq('status', 'active').maybeSingle()
  if (!member) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  const { data, error } = await supabase.from('reviews').select('id,star_rating,comment,reviewer_display_name,provider_created_at,reply_text,sentiment,sentiment_score,priority,location:review_locations!inner(id,name),drafts:review_reply_drafts(id,version,text,status,approved_at)').eq('tenant_id', tenantId).eq('available', true).order('provider_updated_at', { ascending: false }).limit(100)
  if (error) return NextResponse.json({ error: 'No fue posible cargar reseñas.' }, { status: 500 })
  const reviews = (data ?? []).map((review) => ({ ...review, drafts: [...(review.drafts ?? [])].sort((a, b) => b.version - a.version) }))
  return NextResponse.json({ reviews, canApprove: member.role !== 'viewer' }, { headers: { 'Cache-Control': 'no-store' } })
}
