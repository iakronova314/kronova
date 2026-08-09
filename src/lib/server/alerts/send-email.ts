import 'server-only'

export async function sendAlertEmail(input: { to: string; subject: string; text: string; idempotencyKey: string }) {
  if (process.env.ALERT_EMAIL_ENABLED !== 'true') throw new Error('EMAIL_CHANNEL_DISABLED')
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.ALERT_EMAIL_FROM
  if (!apiKey || !from) throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED')
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: {
      Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': input.idempotencyKey.slice(0, 256),
    }, body: JSON.stringify({ from, to: [input.to], subject: input.subject, text: input.text }),
  })
  const result = await response.json().catch(() => null) as { id?: string; message?: string } | null
  if (!response.ok || !result?.id) throw new Error(`EMAIL_PROVIDER_${response.status}:${result?.message ?? 'unknown'}`)
  return result.id
}
