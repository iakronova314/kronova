import type { DocAuditAiEvaluation } from './analyze-docaudit'
import type { DeterministicAudit } from './rules/v1'
import { DOCAUDIT_SCHEMA_VERSION } from './schemas/v1/types.ts'
import type { DocAuditResultV1, Finding, FindingSeverity, SourceFormat } from './schemas/v1/types.ts'
import type { InvoiceExtraction } from './extract-invoice'

interface ReportInput {
  analysisId: string
  documentId: string
  generatedAt: string
  mimeType: string
  sha256: string
  sourceFormat: SourceFormat
  extraction: InvoiceExtraction
  audit: DeterministicAudit
  ai: { evaluation: DocAuditAiEvaluation; modelVersion: string; promptVersion: string }
}

function enrichFindings(findings: Finding[], evaluation: DocAuditAiEvaluation): Finding[] {
  const byId = new Map(evaluation.explanations.map((item) => [item.findingId, item]))
  return findings.map((finding) => {
    const explanation = byId.get(finding.id)
    if (!explanation) return finding
    return {
      ...finding,
      description: `${finding.description} Explicación IA: ${explanation.explanation}`,
      recommendation: `${finding.recommendation} Orientación IA: ${explanation.recommendation}`,
      requiresProfessionalReview: finding.requiresProfessionalReview || explanation.requiresProfessionalReview,
    }
  })
}

export function buildDocAuditReport(input: ReportInput): DocAuditResultV1 {
  const findings = enrichFindings(input.audit.findings, input.ai.evaluation)
  const findingCounts: Record<FindingSeverity, number> = { info: 0, warning: 0, error: 0, critical: 0 }
  findings.forEach((finding) => { findingCounts[finding.severity] += 1 })
  const confidence = findings.length ? Math.min(...findings.map((finding) => finding.confidence)) : 1
  const outcome = findingCounts.critical ? 'fail' : findingCounts.error ? 'manual_review_required' : findingCounts.warning ? 'pass_with_observations' : 'pass'
  const limitations = input.sourceFormat === 'pdf' ? ['PDF_AUXILIARY_NO_XML_STRUCTURE_VALIDATION', 'SIGNATURE_NOT_VALIDATED', 'DIAN_RESPONSE_NOT_VALIDATED'] : []
  return {
    schema: { name: 'docaudit-result', version: DOCAUDIT_SCHEMA_VERSION },
    analysis: { id: input.analysisId, documentId: input.documentId, jurisdiction: 'CO', generatedAt: input.generatedAt, locale: 'es-CO', status: input.sourceFormat === 'pdf' ? 'partial' : 'completed' },
    regulatoryPackage: { id: input.audit.rulesPackage.id, version: input.audit.rulesPackage.version, effectiveDate: input.audit.rulesPackage.effectiveDate, dianTechnicalAnnex: input.audit.rulesPackage.dianTechnicalAnnex },
    source: { primaryArtifactId: 'primary', format: input.sourceFormat, artifacts: [{ id: 'primary', role: input.sourceFormat === 'pdf' ? 'graphic_representation' : input.sourceFormat === 'attached_document' ? 'container' : 'fiscal_xml', mimeType: input.mimeType, sha256: input.sha256 }], limitations },
    evidence: input.extraction.evidence,
    facts: input.extraction.facts,
    findings,
    conclusion: { outcome, summary: input.ai.evaluation.summary, findingCounts, confidence, disclaimerCode: 'SUPPORT_TOOL_NOT_PROFESSIONAL_ADVICE' },
    trace: { parser: { name: 'kronova-docaudit-co', version: '1.0.0' }, rules: { packageId: input.audit.rulesPackage.id, version: input.audit.rulesPackage.version }, ai: { used: true, provider: 'google', model: input.ai.modelVersion, promptVersion: input.ai.promptVersion } },
  }
}
