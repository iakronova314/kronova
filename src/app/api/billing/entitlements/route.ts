import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantEntitlements } from '@/lib/server/billing/entitlements'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId') ?? ''
  if (!UUID.test(tenantId)) return NextResponse.json({ error: 'Organizacion invalida.' }, { status: 400 })
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = String(claims?.claims?.sub ?? '')
  if (!userId) return NextResponse.json({ error: 'Debes iniciar sesion.' }, { status: 401 })
  const { data: member } = await supabase.from('tenant_members').select('user_id').eq('tenant_id', tenantId).eq('user_id', userId).eq('status', 'active').maybeSingle()
  if (!member) return NextResponse.json({ error: 'Organizacion no encontrada.' }, { status: 404 })
  try {
    const entitlements = await getTenantEntitlements(tenantId)
    return NextResponse.json(entitlements ?? { status: 'none', allowedModules: [], documentLimit: 0 }, {
      headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
    })
  } catch (error) {
    console.error('Entitlement lookup failed', error)
    return NextResponse.json({ error: 'No fue posible verificar el plan.' }, { status: 503 })
  }
}
