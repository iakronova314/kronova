import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { traceIdFrom, withTrace } from '@/lib/server/observability'

export async function GET(request: NextRequest) {
  const traceId = traceIdFrom(request)
  const tenantId = request.nextUrl.searchParams.get('tenantId') ?? ''
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) return withTrace(NextResponse.json({ error: 'No autorizado.' }, { status: 401 }), traceId)
  const { data: member } = await supabase.from('tenant_members').select('role').eq('tenant_id', tenantId).eq('user_id', String(claims.claims.sub)).eq('status','active').maybeSingle()
  if (!member || !['owner','admin'].includes(member.role)) return withTrace(NextResponse.json({ error: 'Permisos insuficientes.' }, { status: 403 }), traceId)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const [{ data: events }, { data: alerts }] = await Promise.all([
    supabase.from('observability_events').select('event_name,level,duration_ms,metric_value,error_code,trace_id,created_at').eq('tenant_id',tenantId).gte('created_at',since).order('created_at',{ascending:false}).limit(500),
    supabase.from('operational_alerts').select('id,severity,title,error_code,trace_id,status,occurrence_count,last_seen_at').eq('tenant_id',tenantId).neq('status','resolved').order('last_seen_at',{ascending:false}).limit(50),
  ])
  const jobs = (events ?? []).filter((event) => event.event_name === 'job_completed' || event.event_name === 'job_failed')
  const durations = jobs.map((event) => event.duration_ms).filter((value): value is number => typeof value === 'number').sort((a,b)=>a-b)
  const failed = jobs.filter((event) => event.event_name === 'job_failed').length
  return withTrace(NextResponse.json({
    windowHours: 24,
    metrics: { jobs: jobs.length, failures: failed, failureRate: jobs.length ? Math.round(failed / jobs.length * 10000) / 100 : 0, consumptionUnits: (events ?? []).filter((event)=>event.event_name==='job_completed').reduce((sum,event)=>sum+(Number(event.metric_value)||0),0), averageDurationMs: durations.length ? Math.round(durations.reduce((sum,value)=>sum+value,0)/durations.length) : 0, p95DurationMs: durations.length ? durations[Math.min(durations.length-1,Math.ceil(durations.length*.95)-1)] : 0 },
    alerts: alerts ?? [], recentErrors: (events ?? []).filter((event)=>event.level==='error').slice(0,25), traceId,
  }, { headers: { 'Cache-Control': 'no-store' } }), traceId)
}
