'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const field = (data: FormData, key: string) => String(data.get(key) ?? '').trim()

async function getActor(tenantId: string) {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = String(claims?.claims?.sub ?? '')
  if (!userId) return null
  const { data: membership } = await supabase.from('tenant_members').select('role,status')
    .eq('tenant_id', tenantId).eq('user_id', userId).eq('status', 'active').maybeSingle()
  return membership ? { userId, role: String(membership.role) } : null
}

function dashboardMessage(kind: 'error' | 'message', text: string) {
  return `/dashboard?${new URLSearchParams({ [kind]: text })}`
}

export async function switchOrganization(data: FormData) {
  const tenantId = field(data, 'tenantId')
  if (!(await getActor(tenantId))) redirect(dashboardMessage('error', 'No tienes acceso a esa organización.'))
  const cookieStore = await cookies()
  cookieStore.set('kronova_tenant', tenantId, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365,
  })
  redirect('/dashboard')
}

export async function inviteMember(data: FormData) {
  const tenantId = field(data, 'tenantId')
  const email = field(data, 'email').toLowerCase()
  const role = field(data, 'role')
  const actor = await getActor(tenantId)
  const allowed = actor?.role === 'owner' ? ['admin', 'analyst', 'viewer'] : ['analyst', 'viewer']
  if (!actor || !allowed.includes(role) || !/^\S+@\S+\.\S+$/.test(email)) {
    redirect(dashboardMessage('error', 'No tienes permiso o los datos de la invitación no son válidos.'))
  }

  const admin = createAdminClient()
  await admin.from('tenant_invitations').update({ status: 'revoked' })
    .eq('tenant_id', tenantId).eq('email', email).eq('status', 'pending')
  const { data: invitation, error: insertError } = await admin.from('tenant_invitations').insert({
    tenant_id: tenantId, email, role, status: 'pending', invited_by: actor.userId,
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  }).select('id').single()
  if (insertError || !invitation) redirect(dashboardMessage('error', 'No fue posible crear la invitación.'))

  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existing = users.users.find((user) => user.email?.toLowerCase() === email)
  if (existing) {
    const { error } = await admin.from('tenant_members').upsert({
      tenant_id: tenantId, user_id: existing.id, role, status: 'active', invited_by: actor.userId,
      invited_at: new Date().toISOString(), joined_at: new Date().toISOString(),
    })
    if (!error) {
      await admin.from('tenant_invitations').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', invitation.id)
      redirect(dashboardMessage('message', 'El usuario existente fue agregado a la organización.'))
    }
  }

  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host')
  const protocol = headerStore.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https')
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? `${protocol}://${host}`
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { invitation_id: invitation.id },
    redirectTo: `${origin}/auth/callback?next=/dashboard`,
  })
  if (error) {
    await admin.from('tenant_invitations').delete().eq('id', invitation.id)
    redirect(dashboardMessage('error', 'No fue posible enviar la invitación.'))
  }
  redirect(dashboardMessage('message', 'Invitación enviada. Vence en 7 días.'))
}
