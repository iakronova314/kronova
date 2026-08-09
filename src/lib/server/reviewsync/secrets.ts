import 'server-only'

function keyBytes() {
  const raw = process.env.REVIEWSYNC_TOKEN_ENCRYPTION_KEY
  if (!raw) throw new Error('REVIEWSYNC_TOKEN_ENCRYPTION_KEY_NOT_CONFIGURED')
  const bytes = Uint8Array.from(Buffer.from(raw, 'base64'))
  if (bytes.length !== 32) throw new Error('REVIEWSYNC_TOKEN_ENCRYPTION_KEY_INVALID')
  return bytes
}
export async function encryptSecret(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12)); const key = await crypto.subtle.importKey('raw', keyBytes(), 'AES-GCM', false, ['encrypt'])
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value)))
  return Buffer.from(new Uint8Array([...iv, ...encrypted])).toString('base64')
}
export async function decryptSecret(value: string) {
  const bytes = Uint8Array.from(Buffer.from(value, 'base64')); const iv = bytes.slice(0, 12); const payload = bytes.slice(12)
  const key = await crypto.subtle.importKey('raw', keyBytes(), 'AES-GCM', false, ['decrypt'])
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, payload))
}
export async function sha256Base64Url(value: string) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
  return Buffer.from(hash).toString('base64url')
}
