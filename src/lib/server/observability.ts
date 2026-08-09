import type { SupabaseClient } from '@supabase/supabase-js'

type Level = 'info' | 'warn' | 'error'
type Scalar = string | number | boolean | null
const SAFE_KEYS = new Set(['attempt','terminal','claimed','outcome','module','status','provider','model','httpStatus','route','method','count','units','reason','runtime'])

export type Observation = {
  traceId: string
  source: string
  event: string
  level?: Level
  tenantId?: string | null
  jobId?: string | null
  documentId?: string | null
  durationMs?: number
  metricValue?: number
  errorCode?: string | null
  attributes?: Record<string, Scalar>
}

export function traceIdFrom(request?: Request) {
  const supplied = request?.headers.get('x-trace-id')
  return supplied && /^[0-9a-f-]{36}$/i.test(supplied) ? supplied : crypto.randomUUID()
}

function safeAttributes(attributes: Record<string, Scalar> = {}) {
  return Object.fromEntries(Object.entries(attributes).filter(([key, value]) => SAFE_KEYS.has(key) && (value === null || ['string','number','boolean'].includes(typeof value))).map(([key,value]) => [key, typeof value === 'string' ? value.slice(0, 160) : value]))
}

export function structuredLog(observation: Observation) {
  const payload = {
    timestamp: new Date().toISOString(), service: 'kronova', level: observation.level ?? 'info',
    trace_id: observation.traceId, source: observation.source, event: observation.event,
    tenant_id: observation.tenantId ?? undefined, job_id: observation.jobId ?? undefined,
    document_id: observation.documentId ?? undefined, duration_ms: observation.durationMs,
    metric_value: observation.metricValue, error_code: observation.errorCode?.slice(0, 100),
    attributes: safeAttributes(observation.attributes),
  }
  const serialized = JSON.stringify(payload)
  if (observation.level === 'error') console.error(serialized)
  else if (observation.level === 'warn') console.warn(serialized)
  else console.info(serialized)
}

export async function recordObservation(admin: SupabaseClient, observation: Observation) {
  structuredLog(observation)
  const { error } = await admin.from('observability_events').insert({
    trace_id: observation.traceId, tenant_id: observation.tenantId ?? null, job_id: observation.jobId ?? null,
    document_id: observation.documentId ?? null, source: observation.source, event_name: observation.event,
    level: observation.level ?? 'info', duration_ms: observation.durationMs, metric_value: observation.metricValue,
    error_code: observation.errorCode?.slice(0,100) ?? null, attributes: safeAttributes(observation.attributes),
  })
  if (error) structuredLog({ traceId: observation.traceId, source: 'observability', event: 'persistence_failed', level: 'error', errorCode: error.code })
}

export async function raiseOperationalAlert(admin: SupabaseClient, observation: Observation & { severity: 'warning'|'critical'; title: string; fingerprint: string }) {
  await admin.rpc('record_operational_alert', {
    target_tenant_id: observation.tenantId ?? null, target_fingerprint: observation.fingerprint.slice(0,160),
    target_severity: observation.severity, target_title: observation.title.slice(0,160),
    target_error_code: observation.errorCode?.slice(0,100) ?? null, target_trace_id: observation.traceId,
    target_metadata: safeAttributes(observation.attributes),
  })
}

export function withTrace(response: Response, traceId: string) {
  response.headers.set('x-trace-id', traceId)
  return response
}
