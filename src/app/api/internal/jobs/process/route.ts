import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractText } from '@/lib/documents/extract-text'
import { extractInvoiceFromPdf, extractInvoiceFromXml } from '@/modules/docaudit/colombia/extract-invoice'
import { auditInvoice, CO_RULES_V1 } from '@/modules/docaudit/colombia/rules/v1'
import { analyzeDocAudit } from '@/modules/docaudit/colombia/analyze-docaudit'
import { buildDocAuditReport } from '@/modules/docaudit/colombia/build-report'
import { analyzeContract } from '@/modules/leasereader/colombia/analyze-contract'
import { buildContractReport } from '@/modules/leasereader/colombia/build-contract-report'
import { scheduleContractDeadlines } from '@/lib/server/alerts/schedule-contract-deadlines'
import { raiseOperationalAlert, recordObservation, traceIdFrom, withTrace } from '@/lib/server/observability'

export const maxDuration = 300

async function processJob(job: Record<string, unknown>, workerId: string) {
  const admin = createAdminClient()
  const jobId = String(job.id)
  const tenantId = String(job.tenant_id)
  const documentId = String(job.document_id)
  const traceId = typeof job.correlation_id === 'string' ? job.correlation_id : crypto.randomUUID()
  const startedAt = performance.now()
  await recordObservation(admin, { traceId, tenantId, jobId, documentId, source: 'document_worker', event: 'job_started', attributes: { attempt: Number(job.attempt_count), module: String(job.module ?? 'unknown') } })
  try {
    await admin.from('documents').update({ status: 'processing' }).eq('id', documentId).eq('tenant_id', tenantId)
    const { data: existing } = await admin.from('analysis_results').select('id').eq('job_id', jobId).maybeSingle()
    if (existing) {
      await admin.from('analysis_jobs').update({ status: 'completed', progress: 100, completed_at: new Date().toISOString(), locked_by: null, locked_until: null }).eq('id', jobId).eq('locked_by', workerId)
      await recordObservation(admin, { traceId, tenantId, jobId, documentId, source: 'document_worker', event: 'job_completed_idempotently', durationMs: Math.round(performance.now() - startedAt), attributes: { outcome: 'completed' } })
      return 'completed'
    }
    const { data: document, error: documentError } = await admin.from('documents').select('bucket_name,storage_path,original_name,mime_type,sha256,module').eq('id', documentId).eq('tenant_id', tenantId).single()
    if (documentError || !document) throw new Error('DOCUMENT_NOT_FOUND')
    await admin.from('analysis_jobs').update({ progress: 15 }).eq('id', jobId).eq('locked_by', workerId)
    const { data: blob, error: storageError } = await admin.storage.from(document.bucket_name).download(document.storage_path)
    if (storageError || !blob) throw new Error('STORAGE_DOWNLOAD_FAILED')
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const extraction = await extractText(bytes, document.mime_type, document.original_name)
    if (document.module === 'leasereader') {
      await admin.from('document_extractions').upsert({
        document_id: documentId, tenant_id: tenantId, status: extraction.status, extraction_method: extraction.method,
        normalized_text: extraction.text, pages: extraction.pages, metadata: { ...extraction.metadata, module: 'leasereader' },
        page_count: extraction.pageCount, character_count: extraction.text.length,
      })
      if (extraction.status === 'ocr_required') throw new Error('OCR_REQUIRED')
      if (typeof document.sha256 !== 'string') throw new Error('DOCUMENT_HASH_MISSING')
      await admin.from('analysis_jobs').update({ progress: 55 }).eq('id', jobId).eq('locked_by', workerId)
      const analyzed = await analyzeContract(extraction.pages)
      const analysisId = crypto.randomUUID()
      const report = buildContractReport({ analysisId, documentId, generatedAt: new Date().toISOString(), mimeType: document.mime_type, sha256: document.sha256, pageCount: extraction.pageCount, ai: analyzed.output })
      report.trace.ai.model = analyzed.modelVersion
      report.trace.ai.promptVersion = analyzed.promptVersion
      await scheduleContractDeadlines(admin, tenantId, documentId, report)
      const { error: usageError } = await admin.from('usage_events').upsert({
        tenant_id: tenantId, document_id: documentId, job_id: jobId, event_type: 'document_processed', units: 1,
        idempotency_key: `quota:processed:${documentId}`, metadata: { schema_version: report.schema.version, module: 'leasereader' },
      }, { onConflict: 'tenant_id,idempotency_key', ignoreDuplicates: true })
      if (usageError) throw new Error('USAGE_EVENT_FAILED')
      const { error: resultError } = await admin.from('analysis_results').insert({
        id: analysisId, tenant_id: tenantId, document_id: documentId, job_id: jobId, schema_version: report.schema.version,
        result: report, summary: report.conclusion.summary, confidence: report.conclusion.confidence,
        model_provider: 'google', model_name: analyzed.requestedModel, model_version: analyzed.modelVersion,
        prompt_version: analyzed.promptVersion, rules_version: report.trace.rules.version,
        input_tokens: analyzed.usage?.promptTokenCount, output_tokens: analyzed.usage?.candidatesTokenCount,
      })
      if (resultError) throw resultError
      await admin.from('analysis_jobs').update({ status: 'completed', progress: 100, completed_at: new Date().toISOString(), locked_by: null, locked_until: null, error_code: null, error_message: null }).eq('id', jobId).eq('locked_by', workerId)
      await admin.from('documents').update({ status: 'completed' }).eq('id', documentId).eq('tenant_id', tenantId)
      await recordObservation(admin, { traceId, tenantId, jobId, documentId, source: 'document_worker', event: 'job_completed', durationMs: Math.round(performance.now() - startedAt), metricValue: 1, attributes: { outcome: 'completed', module: 'leasereader', units: 1 } })
      return 'completed'
    }
    const invoice = document.mime_type === 'application/xml' || document.mime_type === 'text/xml'
      ? extractInvoiceFromXml(bytes)
      : document.mime_type === 'application/pdf' && extraction.status === 'completed'
        ? extractInvoiceFromPdf(extraction.pages)
        : null
    let audit = null
    if (invoice) {
      const fiscalDocumentNumber = invoice.facts.document.number.value?.trim().toUpperCase() ?? null
      const fiscalSupplierTaxId = invoice.facts.supplier.taxId.value?.replace(/[^0-9A-Za-z]/g, '').toUpperCase() ?? null
      let duplicateDocumentId: string | null = null
      if (fiscalDocumentNumber && fiscalSupplierTaxId) {
        const { data: matchingDocuments, error: duplicateError } = await admin.from('documents').select('id,mime_type')
          .eq('tenant_id', tenantId).eq('jurisdiction', 'CO')
          .eq('fiscal_document_number', fiscalDocumentNumber).eq('fiscal_supplier_tax_id', fiscalSupplierTaxId)
          .neq('id', documentId).is('deleted_at', null).limit(20)
        if (duplicateError) throw duplicateError
        const currentIsPdf = document.mime_type === 'application/pdf'
        const duplicate = matchingDocuments?.find((candidate) => (candidate.mime_type === 'application/pdf') === currentIsPdf)
        duplicateDocumentId = duplicate?.id ?? null
      }
      const { error: identityError } = await admin.from('documents').update({ fiscal_document_number: fiscalDocumentNumber, fiscal_supplier_tax_id: fiscalSupplierTaxId }).eq('id', documentId).eq('tenant_id', tenantId)
      if (identityError) throw identityError
      audit = auditInvoice(invoice.facts, { duplicateDocumentId, sourceFormat: document.mime_type === 'application/pdf' ? 'pdf' : 'xml' })
    }
    await admin.from('document_extractions').upsert({
      document_id: documentId, tenant_id: tenantId, status: extraction.status,
      extraction_method: extraction.method, normalized_text: extraction.text, pages: extraction.pages,
      metadata: { ...extraction.metadata, docaudit: invoice, deterministicAudit: audit }, page_count: extraction.pageCount,
      character_count: extraction.text.length,
    })
    if (extraction.status === 'ocr_required') throw new Error('OCR_REQUIRED')
    if (!invoice || !audit) throw new Error('UNSUPPORTED_DOCAUDIT_DOCUMENT')
    await admin.from('analysis_jobs').update({ progress: 55 }).eq('id', jobId).eq('locked_by', workerId)
    const analyzed = await analyzeDocAudit(invoice.facts, audit.findings)
    if (typeof document.sha256 !== 'string') throw new Error('DOCUMENT_HASH_MISSING')
    const analysisId = crypto.randomUUID()
    const rootElement = typeof extraction.metadata.rootElement === 'string' ? extraction.metadata.rootElement.split(':').pop() : null
    const sourceFormat = document.mime_type === 'application/pdf' ? 'pdf' : rootElement === 'AttachedDocument' ? 'attached_document' : 'xml'
    const report = buildDocAuditReport({ analysisId, documentId, generatedAt: new Date().toISOString(), mimeType: document.mime_type, sha256: document.sha256, sourceFormat, extraction: invoice, audit, ai: analyzed })
    const { error: usageError } = await admin.from('usage_events').upsert({
      tenant_id: tenantId, document_id: documentId, job_id: jobId, event_type: 'document_processed', units: 1,
      idempotency_key: `quota:processed:${documentId}`, metadata: { schema_version: report.schema.version },
    }, { onConflict: 'tenant_id,idempotency_key', ignoreDuplicates: true })
    if (usageError) throw new Error('USAGE_EVENT_FAILED')
    await admin.from('analysis_results').insert({ id: analysisId, tenant_id: tenantId, document_id: documentId, job_id: jobId, schema_version: '1.0.0', result: report, summary: report.conclusion.summary, confidence: report.conclusion.confidence, model_provider: 'google', model_name: analyzed.requestedModel, model_version: analyzed.modelVersion, prompt_version: analyzed.promptVersion, rules_version: CO_RULES_V1.version, input_tokens: analyzed.usage?.promptTokenCount, output_tokens: analyzed.usage?.candidatesTokenCount })
    await admin.from('analysis_jobs').update({ status: 'completed', progress: 100, completed_at: new Date().toISOString(), locked_by: null, locked_until: null, error_code: null, error_message: null }).eq('id', jobId).eq('locked_by', workerId)
    await admin.from('documents').update({ status: 'completed' }).eq('id', documentId).eq('tenant_id', tenantId)
    await recordObservation(admin, { traceId, tenantId, jobId, documentId, source: 'document_worker', event: 'job_completed', durationMs: Math.round(performance.now() - startedAt), metricValue: 1, attributes: { outcome: 'completed', module: 'docaudit', units: 1 } })
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
    await recordObservation(admin, { traceId, tenantId, jobId, documentId, source: 'document_worker', event: 'job_failed', level: terminal ? 'error' : 'warn', durationMs: Math.round(performance.now() - startedAt), metricValue: 1, errorCode: code, attributes: { attempt: Number(job.attempt_count), terminal, outcome: terminal ? 'failed' : 'retrying' } })
    if (terminal) await raiseOperationalAlert(admin, { traceId, tenantId, jobId, documentId, source: 'document_worker', event: 'job_failed', level: 'error', severity: 'critical', title: 'Trabajo documental agotó sus reintentos', fingerprint: `document-worker:${code}`, errorCode: code, attributes: { attempt: Number(job.attempt_count), terminal } })
    return terminal ? 'failed' : 'retrying'
  }
}

async function run(request: Request) {
  const traceId = traceIdFrom(request)
  if (!process.env.CRON_SECRET) return withTrace(NextResponse.json({ error: 'Worker no configurado.' }, { status: 503 }), traceId)
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return withTrace(NextResponse.json({ error: 'No autorizado.' }, { status: 401 }), traceId)
  const admin = createAdminClient()
  const workerId = `vercel-${crypto.randomUUID()}`
  const { data: jobs, error } = await admin.rpc('claim_analysis_jobs', { worker_name: workerId, batch_size: 1, lease_seconds: 240 })
  if (error) {
    await recordObservation(admin, { traceId, source: 'document_worker', event: 'claim_failed', level: 'error', errorCode: error.code })
    return withTrace(NextResponse.json({ error: 'No fue posible reclamar trabajos.' }, { status: 500 }), traceId)
  }
  const outcomes = []
  for (const job of jobs ?? []) outcomes.push(await processJob(job as Record<string, unknown>, workerId))
  await recordObservation(admin, { traceId, source: 'document_worker', event: 'batch_completed', metricValue: jobs?.length ?? 0, attributes: { claimed: jobs?.length ?? 0 } })
  return withTrace(NextResponse.json({ claimed: jobs?.length ?? 0, outcomes }), traceId)
}

export const GET = run
export const POST = run
