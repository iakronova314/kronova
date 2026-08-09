import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSiteUrl } from '@/lib/server/billing/stripe'
import { decryptSecret, sha256Base64Url } from '@/lib/server/reviewsync/secrets'
import { discoverGoogleLocations, exchangeGoogleCode, saveGoogleConnection } from '@/lib/server/reviewsync/google'

export async function GET(request: NextRequest) {
  const site = getSiteUrl(); const state = request.nextUrl.searchParams.get('state') ?? ''; const code = request.nextUrl.searchParams.get('code') ?? ''
  if (!state || !code) return NextResponse.redirect(`${site}/dashboard?reviewsync=oauth_denied`)
  const admin = createAdminClient(); const hash = await sha256Base64Url(state)
  const { data: stored } = await admin.from('review_oauth_states').select('*').eq('state_hash', hash).is('consumed_at', null).gt('expires_at', new Date().toISOString()).maybeSingle()
  if (!stored) return NextResponse.redirect(`${site}/dashboard?reviewsync=oauth_invalid`)
  const consumed = await admin.from('review_oauth_states').update({ consumed_at: new Date().toISOString() }).eq('state_hash', hash).is('consumed_at', null).select('state_hash').maybeSingle()
  if (!consumed.data) return NextResponse.redirect(`${site}/dashboard?reviewsync=oauth_invalid`)
  try {
    const token = await exchangeGoogleCode(code, await decryptSecret(stored.encrypted_code_verifier), `${site}/api/reviewsync/oauth/callback`)
    if (!token.refresh_token) throw new Error('GOOGLE_REFRESH_TOKEN_MISSING')
    const connectionId = await saveGoogleConnection(stored.tenant_id, stored.user_id, token.refresh_token, token.scope.split(' '))
    await discoverGoogleLocations(connectionId, stored.tenant_id)
    return NextResponse.redirect(`${site}/dashboard?reviewsync=connected`)
  } catch (error) {
    console.error('ReviewSync OAuth callback failed', error)
    return NextResponse.redirect(`${site}/dashboard?reviewsync=oauth_failed`)
  }
}
