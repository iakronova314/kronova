import type { Instrumentation } from 'next'
import { structuredLog } from '@/lib/server/observability'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertSecureEnvironment } = await import('@/lib/server/environment')
    assertSecureEnvironment()
  }
  structuredLog({ traceId: crypto.randomUUID(), source: 'next', event: 'server_started', attributes: { runtime: process.env.NEXT_RUNTIME ?? 'unknown' } })
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const digest = typeof error === 'object' && error !== null && 'digest' in error ? String(error.digest) : null
  const suppliedTrace = request.headers['x-trace-id']
  const traceId = typeof suppliedTrace === 'string' && /^[0-9a-f-]{36}$/i.test(suppliedTrace) ? suppliedTrace : crypto.randomUUID()
  const observation = {
    traceId, source: 'next', event: 'unhandled_request_error', level: 'error' as const,
    errorCode: digest ?? (error instanceof Error ? error.name : 'UNKNOWN_ERROR'),
    attributes: { route: context.routePath, method: request.method, httpStatus: 500 },
  }
  structuredLog(observation)
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const [{ createAdminClient }, { recordObservation }] = await Promise.all([import('@/lib/supabase/admin'), import('@/lib/server/observability')])
    await recordObservation(createAdminClient(), observation)
  }
}
