import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const STATUSES = ['pending_upload', 'uploaded', 'queued', 'processing', 'completed', 'failed', 'deleted']
const MODULES = ['docaudit', 'leasereader', 'reviewsync']
type JobRow = { id: string; document_id: string; status: string; progress: number; attempt_count: number; max_attempts: number; error_code: string | null; created_at: string }

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId') ?? ''
  if (!UUID.test(tenantId)) return NextResponse.json({ error: 'Organización inválida.' }, { status: 400 })
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 })
  const page = Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10) || 1)
  const pageSize = Math.min(20, Math.max(5, Number.parseInt(request.nextUrl.searchParams.get('pageSize') ?? '10', 10) || 10))
  const status = request.nextUrl.searchParams.get('status') ?? ''
  const moduleName = request.nextUrl.searchParams.get('module') ?? ''
  const search = (request.nextUrl.searchParams.get('search') ?? '').trim().slice(0, 100).replace(/[%_]/g, '\\$&')
  let query = supabase.from('documents').select('id,original_name,mime_type,size_bytes,module,status,created_at,updated_at', { count: 'exact' })
    .eq('tenant_id', tenantId).is('deleted_at', null).order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)
  if (STATUSES.includes(status)) query = query.eq('status', status)
  if (MODULES.includes(moduleName)) query = query.eq('module', moduleName)
  if (search) query = query.ilike('original_name', `%${search}%`)
  const { data: documents, count, error } = await query
  if (error) return NextResponse.json({ error: 'No fue posible cargar el historial.' }, { status: 500 })
  const ids = (documents ?? []).map((document) => document.id)
  const { data: jobs } = ids.length ? await supabase.from('analysis_jobs').select('id,document_id,status,progress,attempt_count,max_attempts,error_code,created_at').in('document_id', ids).order('created_at', { ascending: false }) : { data: [] }
  const latestJobs = new Map<string, JobRow>()
  for (const job of (jobs ?? []) as JobRow[]) if (!latestJobs.has(job.document_id)) latestJobs.set(job.document_id, job)
  const completedJobIds = [...latestJobs.values()].filter((job) => job.status === 'completed').map((job) => job.id)
  const { data: results } = completedJobIds.length ? await supabase.from('analysis_results').select('job_id,result,summary,created_at').in('job_id', completedJobIds) : { data: [] }
  const resultsByJob = new Map((results ?? []).map((result) => [result.job_id, result]))
  const items = (documents ?? []).map((document) => {
    const job = latestJobs.get(document.id)
    return { ...document, job: job ?? null, result: job ? resultsByJob.get(job.id) ?? null : null }
  })
  return NextResponse.json({ items, page, pageSize, total: count ?? 0, totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)) }, { headers: { 'Cache-Control': 'no-store' } })
}
