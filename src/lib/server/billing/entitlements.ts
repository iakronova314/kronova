import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export type ModuleCode = 'docaudit' | 'leasereader' | 'reviewsync'

export async function getTenantEntitlements(tenantId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('get_tenant_entitlements', { target_tenant_id: tenantId })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return row ? {
    subscriptionId: String(row.subscription_id), planCode: String(row.plan_code), planName: String(row.plan_name),
    status: String(row.subscription_status), allowedModules: (row.allowed_modules ?? []) as ModuleCode[],
    documentLimit: Number(row.document_limit), trialEndsAt: row.trial_ends_at as string | null,
    periodStart: row.period_start as string | null, periodEnd: row.period_end as string | null,
  } : null
}
