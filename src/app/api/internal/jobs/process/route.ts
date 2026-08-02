import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractText } from '@/lib/documents/extract-text'
import { analyzeText } from '@/lib/documents/analyze-text'

export const maxDuration = 300

async function processJob(job: Record<string, unknown>, workerId: string) {
  const admin = createAdminClient()
  const jobId = String(job.id)
  const tenantId = String(job.tenant_id)
  const documentId = String(job.document_id)
  try {
    await admin.from('documents').update({ status: 'processing' }).eq('id', documentId).eq('tenant_id', tenantId)
    const { data: existing } = await admin.from('analysis_results').select('id').eq('job_id', jobId).maybeSingle()
    if (existing) {
      await admin.from('analysis_jobs').update({ status: 'completed', progress: 100, completed_at: new Date().toISOString(), locked_by: null, locked_until: null }).eq('id', jobId).eq('locked_by', workerId)
      return 'completed'
    }
    const { data: document, error: documentError } = await admin.from('documents').select('bucket_name,storage_path,original_name,mime_type').eq('id', documentId).eq('tenant_id', tenantId).single()
    if (documentError || !document) throw new Error('DOCUMENT_NOT_FOUND')
    await admin.from('analysis_jobs').update({ progress: 15 }).eq('id', jobId).eq('locked_by', workerId)
    const { data: blob, error: storageError } = await admin.storage.from(document.bucket_name).download(document.storage_path)
    if (storageError || !blob) throw new Error('STORAGE_DOWNLOAD_FAILED')
    const extraction = await extractText(new Uint8Array(await blob.arrayBuffer()), document.mime_type, document.original_name)
    await admin.from('document_extractions').upsert({ document_id: documentId, tenant_id: tenantId, status: extraction.status, extraction_method: extraction.method, normalized_text: extraction.text, pages: extraction.pages, metadata: extraction.metadata, page_count: extraction.pageCount, character_count: extraction.text.length })
    if (extraction.status === 'ocr_required') throw new Error('OCR_REQUIRED')
    await admin.from('analysis_jobs').update({ progress: 55 }).eq('id', jobId).eq('locked_by', workerId)
    const analyzed = await analyzeText(extraction.text)
    await admin.from('analysis_results').insert({ tenant_id: tenantId, document_id: documentId, job_id: jobId, schema_version: 'v1', result: analyzed.result, summary: typeof analyzed.result.resumen === 'string' ? analyzed.result.resumen : null, model_provider: 'google', model_name: analyzed.model, input_tokens: analyzed.usage?.promptTokenCount, output_tokens: analyzed.usage?.candidatesTokenCount })
    await admin.from('analysis_jobs').update({ status: 'completed', progress: 100, completed_at: new Date().toISOString(), locked_by: null, locked_until: null, error_code: null, error_message: null }).eq('id', jobId).eq('locked_by', workerId)
    await admin.from('documents').update({ status: 'completed' }).eq('id', documentId).eq('tenant_id', tenantId)
    return 'completed'
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 80) : 'WORKER_ERROR'
    const terminal = code === 'OCR_REQUIRED' || Number(job.attempt_count) >= Number(job.max_attempts)
    const delay = Math.min(900, 30 * 2 ** Math.max(0, Number(job.attempt_count) - 1))
    await admin.from('analysis_jobs').update({
      status: terminal ? 'failed' : 'retrying', progress: 0, error_code: code,
      error_message: 'El procesamiento técnico no pudo completarse.', locked_by: null, locked_until: null,
      queued_at: new Date(Date.now() + delay * 1000).toISOString(), completed_at: terminal ? new Date().toISOString() : null,
    }).eq('id', jobId).eq('locked_by', workerId)
    await admin.from('documents').update({ status: terminal ? 'failed' : 'queued' }).eq('id', documentId).eq('tenant_id', tenantId)
    console.error('Document worker failed', { jobId, code, attempt: job.attempt_count, terminal })
    return terminal ? 'failed' : 'retrying'
  }
}

async function run(request: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'Worker no configurado.' }, { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  const admin = createAdminClient()
  const workerId = `vercel-${crypto.randomUUID()}`
  const { data: jobs, error } = await admin.rpc('claim_analysis_jobs', { worker_name: workerId, batch_size: 1, lease_seconds: 240 })
  if (error) return NextResponse.json({ error: 'No fue posible reclamar trabajos.' }, { status: 500 })
  const outcomes = []
  for (const job of jobs ?? []) outcomes.push(await processJob(job as Record<string, unknown>, workerId))
  return NextResponse.json({ claimed: jobs?.length ?? 0, outcomes })
}

export const GET = run
export const POST = run
