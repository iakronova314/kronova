import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { translatePlanName } from '@/lib/dashboard-data'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId') ?? ''
  if (!UUID.test(tenantId)) return NextResponse.json({ error: 'Organización inválida.' }, { status: 400 })
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = String(claims?.claims?.sub ?? '')
  if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 })
  const { data: membership } = await supabase.from('tenant_members').select('user_id').eq('tenant_id', tenantId).eq('user_id', userId).eq('status', 'active').maybeSingle()
  if (!membership) return NextResponse.json({ error: 'Organización no encontrada.' }, { status: 404 })
  const admin = createAdminClient()
  const { data: rows, error } = await admin.rpc('get_tenant_document_usage', { target_tenant_id: tenantId })
  const usage = Array.isArray(rows) ? rows[0] : rows
  if (error) return NextResponse.json({ error: 'No fue posible calcular el consumo.' }, { status: 500 })
  if (!usage) return NextResponse.json({ error: 'No hay una suscripción vigente.', code: 'SUBSCRIPTION_REQUIRED' }, { status: 402 })
  const { data: plan } = await admin.from('plans').select('name').eq('code', usage.plan_code).maybeSingle()
  const used = Number(usage.used_units)
  const limit = Number(usage.document_limit)
  return NextResponse.json({
    planCode: usage.plan_code, planName: translatePlanName(plan?.name ?? usage.plan_code),
    used, limit, remaining: Number(usage.remaining_units), percentage: limit ? Math.min(100, Math.round((used / limit) * 100)) : 0,
    periodStart: usage.period_start, periodEnd: usage.period_end, blocked: used >= limit,
  }, { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
}
