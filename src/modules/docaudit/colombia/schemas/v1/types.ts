export const DOCAUDIT_SCHEMA_VERSION = '1.0.0' as const
export const DOCAUDIT_JURISDICTION = 'CO' as const

export type DocumentKind = 'invoice' | 'credit_note' | 'debit_note' | 'unknown'
export type SourceFormat = 'xml' | 'attached_document' | 'zip' | 'pdf'
export type ExtractionMethod = 'xml_parser' | 'pdf_text' | 'ocr' | 'ai' | 'derived' | 'not_observed'
export type FindingSeverity = 'info' | 'warning' | 'error' | 'critical'
export type AuditOutcome = 'pass' | 'pass_with_observations' | 'fail' | 'manual_review_required'
export type EvidenceKind = 'xml_path' | 'pdf_region' | 'file' | 'calculation' | 'external_response'

export interface Evidence {
  id: string
  kind: EvidenceKind
  artifactId: string
  locator: string
  excerpt: string | null
}

/** Every extracted value carries provenance. Confidence is always 0..1, including deterministic extraction. */
export interface Fact<T> {
  value: T | null
  method: ExtractionMethod
  confidence: number
  evidenceIds: string[]
}

export interface Money {
  /** Decimal string; never a binary floating-point value. */
  amount: string
  currency: string
}

export interface PartyFacts {
  name: Fact<string>
  taxId: Fact<string>
  verificationDigit: Fact<string>
  identificationType: Fact<string>
  taxResponsibilities: Fact<string[]>
  address: Fact<string>
  email: Fact<string>
}

export interface LineFacts {
  id: string
  description: Fact<string>
  quantity: Fact<string>
  unitCode: Fact<string>
  unitPrice: Fact<Money>
  lineExtensionAmount: Fact<Money>
  discounts: Fact<Money>
  charges: Fact<Money>
  taxIds: string[]
}

export interface TaxFacts {
  id: string
  scope: 'document' | 'line'
  lineId: string | null
  kind: Fact<string>
  category: Fact<string>
  rate: Fact<string>
  taxableAmount: Fact<Money>
  amount: Fact<Money>
  isWithholding: Fact<boolean>
}

export interface ReferenceFacts {
  documentNumber: Fact<string>
  uniqueCode: Fact<string>
  issueDate: Fact<string>
  reasonCode: Fact<string>
  reason: Fact<string>
}

export interface ExtractedFacts {
  document: {
    kind: Fact<DocumentKind>
    number: Fact<string>
    prefix: Fact<string>
    issueDate: Fact<string>
    issueTime: Fact<string>
    currency: Fact<string>
    operationType: Fact<string>
    uniqueCode: Fact<string>
    uniqueCodeType: Fact<'CUFE' | 'CUDE'>
    paymentMeans: Fact<string[]>
    paymentDueDate: Fact<string>
  }
  supplier: PartyFacts
  customer: PartyFacts
  lines: LineFacts[]
  taxes: TaxFacts[]
  totals: {
    lineExtension: Fact<Money>
    taxExclusive: Fact<Money>
    taxInclusive: Fact<Money>
    allowances: Fact<Money>
    charges: Fact<Money>
    prepaid: Fact<Money>
    withholding: Fact<Money>
    payable: Fact<Money>
  }
  references: ReferenceFacts[]
  technical: {
    ublVersion: Fact<string>
    dianProfile: Fact<string>
    signaturePresent: Fact<boolean>
    signatureValid: Fact<boolean>
    dianResponseCode: Fact<string>
    dianResponseDescription: Fact<string>
    dianValidatedAt: Fact<string>
    qrCode: Fact<string>
  }
}

export interface Finding {
  id: string
  code: string
  category: 'structure' | 'identity' | 'arithmetic' | 'tax' | 'reference' | 'signature' | 'dian_validation' | 'completeness'
  severity: FindingSeverity
  title: string
  description: string
  rule: { id: string; version: string; regulatoryReference: string | null }
  confidence: number
  factPaths: string[]
  evidenceIds: string[]
  observed: unknown
  expected: unknown
  recommendation: string
  requiresProfessionalReview: boolean
}

export interface DocAuditResultV1 {
  schema: { name: 'docaudit-result'; version: typeof DOCAUDIT_SCHEMA_VERSION }
  analysis: {
    id: string
    documentId: string
    jurisdiction: typeof DOCAUDIT_JURISDICTION
    generatedAt: string
    locale: 'es-CO' | 'en'
    status: 'completed' | 'partial'
  }
  regulatoryPackage: { id: string; version: string; effectiveDate: string; dianTechnicalAnnex: string }
  source: {
    primaryArtifactId: string
    format: SourceFormat
    artifacts: Array<{ id: string; role: 'fiscal_xml' | 'dian_response' | 'graphic_representation' | 'container'; mimeType: string; sha256: string }>
    limitations: string[]
  }
  evidence: Evidence[]
  facts: ExtractedFacts
  findings: Finding[]
  conclusion: {
    outcome: AuditOutcome
    summary: string
    findingCounts: Record<FindingSeverity, number>
    confidence: number
    disclaimerCode: 'SUPPORT_TOOL_NOT_PROFESSIONAL_ADVICE'
  }
  trace: {
    parser: { name: string; version: string }
    rules: { packageId: string; version: string }
    ai: { used: boolean; provider: string | null; model: string | null; promptVersion: string | null }
  }
}
