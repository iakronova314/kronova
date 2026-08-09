import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAlertEmail } from '@/lib/server/alerts/send-email'

export const maxDuration = 60

async function run(request: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'Worker no configurado.' }, { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  const admin = createAdminClient()
  const { data: alerts, error } = await admin.rpc('claim_due_email_alerts', { batch_size: 10 })
  if (error) return NextResponse.json({ error: 'No fue posible reclamar alertas.' }, { status: 500 })
  const outcomes: Array<{ id: string; status: string }> = []
  for (const raw of alerts ?? []) {
    const alert = raw as Record<string, unknown>
    const id = String(alert.id); const tenantId = String(alert.tenant_id); const attempt = Number(alert.attempt_count); const maxAttempts = Number(alert.max_attempts)
    try {
      const data = alert.template_data && typeof alert.template_data === 'object' ? alert.template_data as Record<string, unknown> : {}
      const title = String(data.deadlineTitle ?? 'Vencimiento contractual')
      const due = new Date(String(data.dueAt ?? ''))
      if (!String(alert.recipient).includes('@') || Number.isNaN(due.getTime())) throw new Error('INVALID_ALERT_DATA')
      const date = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'America/Bogota' }).format(due)
      const externalId = await sendAlertEmail({
        to: String(alert.recipient), subject: String(alert.subject ?? title), idempotencyKey: String(alert.idempotency_key ?? `alert:${id}`),
        text: `${title}\n\nLa fecha registrada es ${date}. Faltan ${Number(data.daysBefore)} días.\n\nIngresa a KRONOVA para revisar el contrato y su evidencia.\n\nEste aviso es informativo y no constituye asesoría legal.`,
      })
      await admin.from('alert_deliveries').upsert({ tenant_id: tenantId, alert_id: id, attempt_number: attempt, provider: 'resend', status: 'sent', external_delivery_id: externalId, completed_at: new Date().toISOString() }, { onConflict: 'alert_id,attempt_number' })
      await admin.from('alerts').update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null, locked_at: null }).eq('id', id)
      outcomes.push({ id, status: 'sent' })
    } catch (cause) {
      const message = (cause instanceof Error ? cause.message : 'UNKNOWN_EMAIL_ERROR').slice(0, 500)
      const terminal = attempt >= maxAttempts
      const nextAttempt = new Date(Date.now() + Math.min(3600, 60 * 2 ** Math.max(0, attempt - 1)) * 1000).toISOString()
      await admin.from('alert_deliveries').upsert({ tenant_id: tenantId, alert_id: id, attempt_number: attempt, provider: 'resend', status: 'failed', error_code: message.split(':')[0], error_message: message, completed_at: new Date().toISOString() }, { onConflict: 'alert_id,attempt_number' })
      await admin.from('alerts').update({ status: terminal ? 'failed' : 'scheduled', next_attempt_at: terminal ? null : nextAttempt, last_error: message, locked_at: null }).eq('id', id)
      outcomes.push({ id, status: terminal ? 'failed' : 'retrying' })
    }
  }
  return NextResponse.json({ claimed: alerts?.length ?? 0, outcomes })
}

export const GET = run
export const POST = run
