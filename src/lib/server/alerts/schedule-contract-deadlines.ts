import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Fact, LeaseReaderResultV1 } from '@/modules/leasereader/colombia/schemas/v1/types'

type DeadlineInput = { kind: string; title: string; path: string; fact: Fact<string> }
const OFFSETS = [30, 7, 1] as const

function atBogotaMorning(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const parsed = new Date(`${date}T14:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export async function scheduleContractDeadlines(admin: SupabaseClient, tenantId: string, documentId: string, report: LeaseReaderResultV1) {
  const candidates: DeadlineInput[] = [
    { kind: 'contract_start', title: 'Inicio del contrato', path: 'facts.term.startDate', fact: report.facts.term.startDate },
    { kind: 'contract_end', title: 'Terminación del contrato', path: 'facts.term.endDate', fact: report.facts.term.endDate },
    { kind: 'notice_deadline', title: 'Fecha límite de preaviso', path: 'facts.renewal.noticeDeadline', fact: report.facts.renewal.noticeDeadline },
    ...report.facts.increases.map((increase, index) => ({ kind: 'rent_increase', title: `Incremento de canon ${index + 1}`, path: `facts.increases.${index}.effectiveDate`, fact: increase.effectiveDate })),
  ]
  const active = candidates.flatMap((item) => {
    const due = item.fact.value ? atBogotaMorning(item.fact.value) : null
    return due ? [{ ...item, due }] : []
  })
  const retainedKeys = new Set(active.map((item) => `${item.kind}:${item.due.toISOString()}`))
  const { data: existing } = await admin.from('contract_deadlines').select('id,kind,due_at').eq('tenant_id', tenantId).eq('document_id', documentId).eq('status', 'active')
  for (const old of existing ?? []) if (!retainedKeys.has(`${old.kind}:${old.due_at}`)) await admin.from('contract_deadlines').update({ status: 'canceled' }).eq('id', old.id)
  if (!active.length) return { deadlines: 0, alerts: 0 }

  const { data: members } = await admin.from('tenant_members').select('user_id').eq('tenant_id', tenantId).eq('status', 'active').in('role', ['owner', 'admin'])
  const recipients: string[] = []
  for (const member of members ?? []) {
    const { data } = await admin.auth.admin.getUserById(member.user_id)
    if (data.user?.email) recipients.push(data.user.email)
  }
  let alertCount = 0
  for (const item of active) {
    const { data: deadline, error } = await admin.from('contract_deadlines').upsert({
      tenant_id: tenantId, document_id: documentId, kind: item.kind, title: item.title, due_at: item.due.toISOString(),
      source_fact_path: item.path, evidence_ids: item.fact.evidenceIds, status: 'active', metadata: { schema_version: report.schema.version },
    }, { onConflict: 'tenant_id,document_id,kind,due_at' }).select('id').single()
    if (error) throw error
    for (const recipient of recipients) for (const offset of OFFSETS) {
      const scheduled = new Date(item.due.getTime() - offset * 86_400_000)
      if (scheduled <= new Date()) continue
      const key = `deadline:${deadline.id}:email:${recipient.toLowerCase()}:${offset}`
      const { error: alertError } = await admin.from('alerts').upsert({
        tenant_id: tenantId, document_id: documentId, deadline_id: deadline.id, module: 'leasereader', channel: 'email', status: 'scheduled',
        recipient, subject: `${item.title}: faltan ${offset} días`, template_key: 'contract_deadline_v1',
        template_data: { deadlineTitle: item.title, dueAt: item.due.toISOString(), daysBefore: offset, documentId },
        scheduled_for: scheduled.toISOString(), next_attempt_at: scheduled.toISOString(), idempotency_key: key,
      }, { onConflict: 'idempotency_key', ignoreDuplicates: true })
      if (alertError) throw alertError
      alertCount++
    }
  }
  return { deadlines: active.length, alerts: alertCount }
}
