import 'server-only'
import { createClient } from '@/lib/supabase/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function authorizeBillingAdmin(tenantId: unknown) {
  if (typeof tenantId !== 'string' || !UUID.test(tenantId)) return { ok: false as const, status: 400, error: 'Organizacion invalida.' }
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = String(claims?.claims?.sub ?? '')
  const email = typeof claims?.claims?.email === 'string' ? claims.claims.email : undefined
  if (!userId) return { ok: false as const, status: 401, error: 'Debes iniciar sesion.' }
  const { data: membership } = await supabase.from('tenant_members').select('role')
    .eq('tenant_id', tenantId).eq('user_id', userId).eq('status', 'active').maybeSingle()
  if (!membership) return { ok: false as const, status: 404, error: 'Organizacion no encontrada.' }
  if (!['owner', 'admin'].includes(String(membership.role))) return { ok: false as const, status: 403, error: 'Solo propietarios y administradores pueden gestionar la facturacion.' }
  return { ok: true as const, tenantId, userId, email }
}

export function readIdempotencyKey(request: Request) {
  const value = request.headers.get('idempotency-key')?.trim() ?? ''
  return value.length >= 16 && value.length <= 255 && /^[A-Za-z0-9._:-]+$/.test(value) ? value : undefined
}
