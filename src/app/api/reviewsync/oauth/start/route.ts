import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeBillingAdmin } from '@/lib/server/billing/access'
import { getSiteUrl } from '@/lib/server/billing/stripe'
import { encryptSecret, sha256Base64Url } from '@/lib/server/reviewsync/secrets'
import { REVIEWSYNC_GOOGLE_SCOPE } from '@/modules/reviewsync/scope'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { tenantId?: unknown } | null
  const auth = await authorizeBillingAdmin(body?.tenantId)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID
  if (!clientId) return NextResponse.json({ error: 'Google Business OAuth no está configurado.' }, { status: 503 })
  const state = crypto.randomUUID() + crypto.randomUUID(); const verifier = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '')
  const stateHash = await sha256Base64Url(state); const challenge = await sha256Base64Url(verifier)
  const { error } = await createAdminClient().from('review_oauth_states').insert({ state_hash: stateHash, tenant_id: auth.tenantId, user_id: auth.userId, encrypted_code_verifier: await encryptSecret(verifier), expires_at: new Date(Date.now() + 10 * 60_000).toISOString() })
  if (error) return NextResponse.json({ error: 'No fue posible iniciar OAuth.' }, { status: 500 })
  const redirectUri = `${getSiteUrl()}/api/reviewsync/oauth/callback`
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: REVIEWSYNC_GOOGLE_SCOPE, access_type: 'offline', prompt: 'consent', state, code_challenge: challenge, code_challenge_method: 'S256', include_granted_scopes: 'false' }).toString()
  return NextResponse.json({ url: url.toString() }, { headers: { 'Cache-Control': 'no-store' } })
}
