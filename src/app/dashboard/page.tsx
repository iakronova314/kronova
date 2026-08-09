import { Dashboard } from '@/components/dashboard/dashboard'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import type { Organization } from '@/lib/dashboard-data'

type MembershipRow = { role: Organization['role']; tenant: { id: string; name: string } }
type SubscriptionRow = { tenant_id: string; plan_code: string; status: string; current_period_end: string | null }

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) redirect('/login?next=/dashboard')

  const userId = String(data.claims.sub)
  const email = String(data.claims.email ?? '')
  const [{ data: profile }, { data: rawMemberships, error: membershipError }, cookieStore, notice] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
    supabase.from('tenant_members').select('role, tenant:tenants!inner(id,name)').eq('user_id', userId).eq('status', 'active'),
    cookies(),
    searchParams,
  ])
  if (membershipError) throw new Error('No fue posible cargar las organizaciones autorizadas.')
  const memberships = (rawMemberships ?? []) as unknown as MembershipRow[]
  const tenantIds = memberships.map(({ tenant }) => tenant.id)
  const [{ data: subscriptions }, { data: plans }] = tenantIds.length ? await Promise.all([
    supabase.from('subscriptions').select('tenant_id,plan_code,status,current_period_end').in('tenant_id', tenantIds).in('status', ['active', 'trialing']).order('created_at', { ascending: false }),
    supabase.from('plans').select('code,name').eq('is_active', true),
  ]) : [{ data: [] }, { data: [] }]
  const planNames = new Map((plans ?? []).map((plan) => [plan.code, plan.name]))
  const activePlans = new Map<string, string>()
  for (const subscription of (subscriptions ?? []) as SubscriptionRow[]) {
    if (activePlans.has(subscription.tenant_id)) continue
    activePlans.set(subscription.tenant_id, planNames.get(subscription.plan_code) ?? subscription.plan_code)
  }
  const organizations: Organization[] = memberships.map(({ role, tenant }) => ({
    id: tenant.id, name: tenant.name, plan: activePlans.get(tenant.id) ?? 'Sin plan activo', initials: initials(tenant.name), role,
  }))
  if (!organizations.length) redirect('/login?error=Tu+cuenta+no+tiene+una+organización+activa.')
  const selectedId = cookieStore.get('kronova_tenant')?.value
  const activeOrganization = organizations.find(({ id }) => id === selectedId) ?? organizations[0]
  const fullName = String(profile?.full_name ?? data.claims.user_metadata?.full_name ?? email.split('@')[0])

  return <Dashboard user={{ name: fullName, email }} organizations={organizations} activeOrganization={activeOrganization} notice={notice} />
}
