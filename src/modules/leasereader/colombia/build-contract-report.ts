import type { ContractAiOutput, ContractRiskDraft } from './analyze-contract.ts'
import type { ContractRisk, Evidence, Fact, LeaseReaderResultV1, Money, PartyFacts, PartyRole, Percentage } from './schemas/v1/types.ts'
import { LEASEREADER_SCHEMA_VERSION } from './schemas/v1/types.ts'

const missing = <T>(): Fact<T> => ({ value: null, method: 'not_observed', confidence: 0, evidenceIds: [] })
const bool = (value: string | null) => value === null ? null : /^(sí|si|true|yes)$/i.test(value) ? true : /^(no|false)$/i.test(value) ? false : null
const number = (value: string | null) => value !== null && /^\d+$/.test(value.trim()) ? Number(value) : null

function deterministicRisks(clauses: ContractAiOutput['clauses']): ContractRiskDraft[] {
  const patterns = [
    { code: 'UNILATERAL_CHANGE', regex: /modific(?:ar|ación).{0,80}unilateral/i, title: 'Modificación unilateral', severity: 'high' as const },
    { code: 'UNLIMITED_LIABILITY', regex: /responsabilidad.{0,60}(?:ilimitada|sin límite)/i, title: 'Responsabilidad sin límite', severity: 'high' as const },
    { code: 'ACCELERATION', regex: /(?:vencimiento|exigibilidad).{0,80}anticipad/i, title: 'Vencimiento anticipado', severity: 'high' as const },
    { code: 'ENTRY_WITHOUT_NOTICE', regex: /ingresar.{0,80}sin (?:previo )?aviso/i, title: 'Ingreso sin preaviso', severity: 'medium' as const },
    { code: 'RIGHTS_WAIVER', regex: /renuncia.{0,80}(?:derecho|reclam)/i, title: 'Renuncia de derechos', severity: 'high' as const },
  ]
  return clauses.flatMap((clause) => patterns.filter((pattern) => pattern.regex.test(clause.text)).map((pattern) => ({
    code: `CO-LEASE-${pattern.code}`, category: 'legal_review', severity: pattern.severity, title: pattern.title,
    description: `La cláusula “${clause.heading || clause.id}” contiene lenguaje que requiere revisión especializada.`,
    recommendation: 'Solicitar revisión jurídica y confirmar alcance, reciprocidad y límites.', page: clause.page,
    confidence: 0.9, requiresProfessionalReview: true,
  })))
}

export function buildContractReport(input: { analysisId: string; documentId: string; generatedAt: string; mimeType: string; sha256: string; pageCount: number; ai: ContractAiOutput }) {
  const evidence: Evidence[] = []
  const rows = new Map(input.ai.table.map((row) => [row.path, row]))
  function field<T = string>(path: string, transform?: (value: string | null) => T | null): Fact<T> {
    const row = rows.get(path)
    if (!row) return missing<T>()
    const id = `evidence-${evidence.length + 1}`
    evidence.push({ id, kind: 'pdf_region', artifactId: 'primary', page: row.page, locator: row.page ? `page:${row.page}:${path}` : `document:${path}`, boundingBox: null, excerpt: row.excerpt })
    return { value: transform ? transform(row.value) : row.value as T | null, method: 'ai', confidence: row.confidence, evidenceIds: [id] }
  }
  function moneyFact(amountPath: string, currencyPath: string): Fact<Money> {
    const amount = rows.get(amountPath); const currency = rows.get(currencyPath)?.value ?? 'COP'
    if (!amount?.value) return missing<Money>()
    return field<Money>(amountPath, (value) => value ? { amount: value.replace(/[^0-9.,-]/g, '').replace(/,/g, ''), currency } : null)
  }
  function party(role: PartyRole): PartyFacts {
    const base = `parties.${role}`
    return { id: role, role: { value: role, method: 'derived', confidence: 1, evidenceIds: [] }, legalName: field(`${base}.name`), identificationType: missing(), identificationNumber: field(`${base}.identification`), email: missing(), phone: missing(), noticeAddress: missing(), representativeName: missing(), representativeIdentification: missing() }
  }
  const clauseEvidence = new Map<string, string>()
  const clauses = input.ai.clauses.map((clause) => {
    const id = `evidence-${evidence.length + 1}`; clauseEvidence.set(clause.id, id)
    evidence.push({ id, kind: 'document_section', artifactId: 'primary', page: clause.page, locator: clause.page ? `page:${clause.page}:clause:${clause.id}` : `clause:${clause.id}`, boundingBox: null, excerpt: clause.text.slice(0, 500) })
    return { id: clause.id, heading: { value: clause.heading, method: 'ai' as const, confidence: 0.85, evidenceIds: [id] }, text: { value: clause.text, method: 'ai' as const, confidence: 0.85, evidenceIds: [id] }, clauseNumber: missing<string>() }
  })
  const drafts = [...deterministicRisks(input.ai.clauses), ...input.ai.risks]
  const risks: ContractRisk[] = drafts.map((risk, index) => {
    const related = input.ai.clauses.filter((clause) => clause.page === risk.page && clauseEvidence.has(clause.id))
    return { id: `risk-${index + 1}`, code: risk.code.startsWith('CO-LEASE-') ? risk.code : `CO-LEASE-AI-${index + 1}`, category: ['identity','property','term','financial','increase','renewal','notice','penalty','termination','completeness','legal_review'].includes(risk.category) ? risk.category as ContractRisk['category'] : 'legal_review', severity: risk.severity, title: risk.title, description: risk.description, confidence: risk.confidence, factPaths: [], clauseIds: related.map((item) => item.id), evidenceIds: related.map((item) => clauseEvidence.get(item.id)!), observed: null, expected: null, recommendation: risk.recommendation, requiresProfessionalReview: risk.requiresProfessionalReview, rule: { id: risk.code, version: '1.0.0', legalReference: null } }
  })
  const counts = { info: 0, low: 0, medium: 0, high: 0, critical: 0 }
  risks.forEach((risk) => counts[risk.severity]++)
  const confidenceValues = input.ai.table.map((row) => row.confidence)
  const report: LeaseReaderResultV1 = {
    schema: { name: 'leasereader-result', version: LEASEREADER_SCHEMA_VERSION },
    analysis: { id: input.analysisId, documentId: input.documentId, jurisdiction: 'CO', generatedAt: input.generatedAt, locale: 'es-CO', status: 'completed' },
    legalPackage: { id: 'co-real-estate-contract-review', version: '1.0.0', effectiveDate: '2026-08-09', scope: 'Extracción y señales preventivas; sin conclusión jurídica definitiva.', reviewedByProfessional: false },
    source: { primaryArtifactId: 'primary', format: input.mimeType === 'application/pdf' ? 'pdf' : 'text', artifacts: [{ id: 'primary', mimeType: input.mimeType, sha256: input.sha256, pageCount: input.pageCount }], limitations: ['La extracción automatizada debe ser confirmada contra el documento original.', 'El paquete legal no ha sido marcado como revisado profesionalmente.'] },
    evidence,
    facts: {
      document: { contractType: field('document.contractType'), title: field('document.title'), contractNumber: field('document.contractNumber'), signedDate: field('document.signedDate'), signedCity: field('document.signedCity'), language: { value: 'es', method: 'derived', confidence: 0.9, evidenceIds: [] } },
      parties: [party('landlord'), party('tenant')],
      property: { address: field('property.address'), city: field('property.city'), department: field('property.department'), country: { value: 'CO', method: 'derived', confidence: 0.8, evidenceIds: [] }, propertyType: field('property.propertyType'), intendedUse: field('property.intendedUse'), privateAreaSquareMeters: missing(), cadastralReference: missing(), realEstateRegistrationNumber: field('property.realEstateRegistrationNumber'), parkingSpaces: missing(), includedAssets: missing(), inventoryAnnexPresent: missing() },
      term: { startDate: field('term.startDate'), possessionDate: field('term.possessionDate'), endDate: field('term.endDate'), durationMonths: field('term.durationMonths', number) },
      financial: { rent: moneyFact('financial.rent.amount', 'financial.rent.currency'), paymentFrequency: field('financial.paymentFrequency'), dueDay: field('financial.dueDay', number), paymentMethod: missing(), deposit: moneyFact('financial.deposit.amount', 'financial.deposit.currency'), depositConditions: field('financial.depositConditions'), administrationFee: moneyFact('financial.administrationFee.amount', 'financial.rent.currency'), utilitiesResponsibility: missing(), insuranceRequirement: missing(), lateInterest: missing<Percentage>() },
      increases: [{ id: 'increase-1', effectiveDate: missing(), frequencyMonths: field('increase.frequencyMonths', number), mechanism: field('increase.mechanism'), rate: field<Percentage>('increase.rate', (value) => value ? { value, basis: 'annual' } : null), indexName: missing(), cap: missing(), floor: missing(), formula: missing() }],
      renewal: { automatic: field('renewal.automatic', bool), renewalTermMonths: field('renewal.renewalTermMonths', number), noticeRequired: field('renewal.noticeRequired', bool), noticeDays: field('renewal.noticeDays', number), noticeDeadline: field('renewal.noticeDeadline'), noticeChannels: missing(), conditions: missing() },
      penalties: [], termination: [{ id: 'termination-1', entitledParty: missing(), grounds: missing(), withoutCauseAllowed: missing(), noticeDays: field('termination.noticeDays', number), noticeChannels: missing(), penaltyIds: [], curePeriodDays: missing(), conditions: field('termination.conditions') }], clauses,
    },
    risks,
    conclusion: { outcome: risks.some((risk) => ['high', 'critical'].includes(risk.severity)) ? 'manual_review_required' : risks.length ? 'risks_identified' : 'no_material_risks', summary: input.ai.summary, riskCounts: counts, confidence: confidenceValues.length ? confidenceValues.reduce((sum, item) => sum + item, 0) / confidenceValues.length : 0, disclaimerCode: 'SUPPORT_TOOL_NOT_LEGAL_ADVICE' },
    trace: { extractor: { name: 'leasereader-contract-table', version: '1.0.0' }, rules: { packageId: 'co-lease-critical-clauses', version: '1.0.0' }, ai: { used: true, provider: 'google', model: null, promptVersion: null } },
  }
  return report
}
