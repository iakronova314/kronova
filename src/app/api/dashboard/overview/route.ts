import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId') ?? ''; const supabase = await createClient(); const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  const { data: member } = await supabase.from('tenant_members').select('role').eq('tenant_id', tenantId).eq('user_id', String(claims.claims.sub)).eq('status','active').maybeSingle()
  if (!member) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  const month = new Date(); month.setUTCDate(1); month.setUTCHours(0,0,0,0)
  const [documents, completed, deadlines, reviews, members, recentDocuments, recentReviews, recentAlerts] = await Promise.all([
    supabase.from('documents').select('id',{count:'exact',head:true}).eq('tenant_id',tenantId).is('deleted_at',null),
    supabase.from('documents').select('id',{count:'exact',head:true}).eq('tenant_id',tenantId).eq('status','completed').gte('updated_at',month.toISOString()),
    supabase.from('contract_deadlines').select('id',{count:'exact',head:true}).eq('tenant_id',tenantId).eq('status','active').gte('due_at',new Date().toISOString()).lte('due_at',new Date(Date.now()+30*86_400_000).toISOString()),
    supabase.from('reviews').select('id,reply_text',{count:'exact'}).eq('tenant_id',tenantId).eq('available',true).limit(1000),
    supabase.from('tenant_members').select('user_id',{count:'exact',head:true}).eq('tenant_id',tenantId).eq('status','active'),
    supabase.from('documents').select('id,original_name,module,status,updated_at').eq('tenant_id',tenantId).is('deleted_at',null).order('updated_at',{ascending:false}).limit(8),
    supabase.from('reviews').select('id,star_rating,reviewer_display_name,sentiment,priority,provider_updated_at,location:review_locations!inner(name)').eq('tenant_id',tenantId).eq('available',true).order('provider_updated_at',{ascending:false}).limit(8),
    supabase.from('alerts').select('id,subject,status,channel,updated_at').eq('tenant_id',tenantId).order('updated_at',{ascending:false}).limit(8),
  ])
  const reviewRows=reviews.data??[]; const replied=reviewRows.filter((item)=>Boolean(item.reply_text)).length
  const activity=[...(recentDocuments.data??[]).map((item)=>({id:`doc:${item.id}`,kind:'document',title:item.original_name,detail:`${item.module} · ${item.status}`,status:item.status==='failed'?'risk':item.status==='completed'?'safe':'review',at:item.updated_at})),...(recentReviews.data??[]).map((item)=>({id:`review:${item.id}`,kind:'review',title:`${item.star_rating} estrellas · ${item.reviewer_display_name??'Anónimo'}`,detail:`${(item.location as unknown as {name:string}).name} · ${item.sentiment??'sin análisis'}`,status:item.priority==='urgent'||item.priority==='high'?'risk':item.sentiment==='positive'?'safe':'review',at:item.provider_updated_at})),...(recentAlerts.data??[]).map((item)=>({id:`alert:${item.id}`,kind:'alert',title:item.subject??'Alerta',detail:`${item.channel} · ${item.status}`,status:item.status==='failed'?'risk':item.status==='sent'?'safe':'review',at:item.updated_at}))].sort((a,b)=>new Date(b.at).getTime()-new Date(a.at).getTime()).slice(0,10)
  return NextResponse.json({kpis:{documents:documents.count??0,completedThisMonth:completed.count??0,upcomingDeadlines:deadlines.count??0,reviewResponseRate:reviewRows.length?Math.round(replied/reviewRows.length*100):0,activeMembers:members.count??0},activity,notificationCount:(recentAlerts.data??[]).filter((item)=>item.status==='scheduled'||item.status==='failed').length},{headers:{'Cache-Control':'no-store'}})
}
