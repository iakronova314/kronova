import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptSecret, encryptSecret } from './secrets'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const clientConfig = () => {
  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID; const clientSecret = process.env.GOOGLE_BUSINESS_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('GOOGLE_BUSINESS_OAUTH_NOT_CONFIGURED')
  return { clientId, clientSecret }
}
async function jsonFetch<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init); const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(`GOOGLE_API_${response.status}:${JSON.stringify(body).slice(0, 300)}`)
  return body as T
}
export async function exchangeGoogleCode(code: string, verifier: string, redirectUri: string) {
  const { clientId, clientSecret } = clientConfig()
  return jsonFetch<{ access_token: string; expires_in: number; refresh_token?: string; scope: string }>(GOOGLE_TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, code_verifier: verifier, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }) })
}
export async function connectionAccessToken(connectionId: string) {
  const admin = createAdminClient(); const { data: connection, error } = await admin.from('review_connections').select('id,encrypted_refresh_token,status').eq('id', connectionId).single()
  if (error || !connection || connection.status !== 'active') throw new Error('REVIEW_CONNECTION_NOT_ACTIVE')
  const { clientId, clientSecret } = clientConfig(); const refreshToken = await decryptSecret(connection.encrypted_refresh_token)
  try {
    const token = await jsonFetch<{ access_token: string; expires_in: number }>(GOOGLE_TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token' }) })
    await admin.from('review_connections').update({ token_expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(), last_error: null }).eq('id', connectionId)
    return token.access_token
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TOKEN_REFRESH_FAILED'
    await admin.from('review_connections').update({ status: message.includes('invalid_grant') ? 'reauthorization_required' : 'error', last_error: message.slice(0, 500) }).eq('id', connectionId)
    throw error
  }
}
export async function googleGet<T>(url: string, token: string) { return jsonFetch<T>(url, { headers: { Authorization: `Bearer ${token}` } }) }
export async function googlePut<T>(url: string, token: string, body: object) { return jsonFetch<T>(url, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) }
export async function saveGoogleConnection(tenantId: string, userId: string, refreshToken: string, scopes: string[]) {
  const admin = createAdminClient(); const encrypted = await encryptSecret(refreshToken)
  const { data, error } = await admin.from('review_connections').upsert({ tenant_id: tenantId, provider: 'google_business_profile', encrypted_refresh_token: encrypted, granted_scopes: scopes, status: 'active', connected_by: userId, last_error: null }, { onConflict: 'tenant_id,provider' }).select('id').single()
  if (error) throw error
  return data.id as string
}

export async function discoverGoogleLocations(connectionId: string, tenantId: string) {
  const admin = createAdminClient(); const token = await connectionAccessToken(connectionId)
  let accountToken = ''; let count = 0
  do {
    const suffix = accountToken ? `&pageToken=${encodeURIComponent(accountToken)}` : ''
    const accounts = await googleGet<{ accounts?: Array<{ name: string; accountName?: string }>; nextPageToken?: string }>(`https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=20${suffix}`, token)
    for (const account of accounts.accounts ?? []) {
      let pageToken = ''
      do {
        const next = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
        const response = await googleGet<{ locations?: Array<{ name: string; locationName?: string; primaryPhone?: string; address?: { addressLines?: string[]; locality?: string }; locationState?: { isVerified?: boolean } }>; nextPageToken?: string }>(`https://mybusiness.googleapis.com/v4/${account.name}/locations?pageSize=100${next}`, token)
        for (const location of response.locations ?? []) {
          await admin.from('review_locations').upsert({ tenant_id: tenantId, connection_id: connectionId, provider: 'google_business_profile', external_account_id: account.name, external_location_id: location.name, name: location.locationName ?? location.name, address: [...(location.address?.addressLines ?? []), location.address?.locality].filter(Boolean).join(', ') || null, verified: Boolean(location.locationState?.isVerified) }, { onConflict: 'tenant_id,provider,external_location_id' })
          count++
        }
        pageToken = response.nextPageToken ?? ''
      } while (pageToken)
    }
    accountToken = accounts.nextPageToken ?? ''
  } while (accountToken)
  return count
}
