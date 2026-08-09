export const LEASEREADER_SCHEMA_VERSION = '1.0.0' as const
export const LEASEREADER_JURISDICTION = 'CO' as const

export type ExtractionMethod = 'pdf_text' | 'ocr' | 'ai' | 'derived' | 'human' | 'not_observed'
export type EvidenceKind = 'pdf_region' | 'document_section' | 'calculation' | 'external_response'
export type RiskSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'
export type ReviewOutcome = 'no_material_risks' | 'risks_identified' | 'manual_review_required' | 'insufficient_evidence'

export interface Evidence {
  id: string
  kind: EvidenceKind
  artifactId: string
  page: number | null
  locator: string
  /** Normalized PDF coordinates [x, y, width, height], or null when unavailable. */
  boundingBox: [number, number, number, number] | null
  excerpt: string | null
}

export interface Fact<T> {
  value: T | null
  method: ExtractionMethod
  confidence: number
  evidenceIds: string[]
}

export interface Money { amount: string; currency: string }
export interface Percentage { value: string; basis: 'annual' | 'monthly' | 'event' | 'unknown' }

export type PartyRole = 'landlord' | 'tenant' | 'co_tenant' | 'guarantor' | 'joint_debtor' | 'administrator' | 'broker' | 'other'
export interface PartyFacts {
  id: string
  role: Fact<PartyRole>
  legalName: Fact<string>
  identificationType: Fact<string>
  identificationNumber: Fact<string>
  email: Fact<string>
  phone: Fact<string>
  noticeAddress: Fact<string>
  representativeName: Fact<string>
  representativeIdentification: Fact<string>
}

export interface PropertyFacts {
  address: Fact<string>
  city: Fact<string>
  department: Fact<string>
  country: Fact<string>
  propertyType: Fact<'residential' | 'commercial' | 'office' | 'warehouse' | 'land' | 'mixed' | 'other'>
  intendedUse: Fact<string>
  privateAreaSquareMeters: Fact<string>
  cadastralReference: Fact<string>
  realEstateRegistrationNumber: Fact<string>
  parkingSpaces: Fact<string[]>
  includedAssets: Fact<string[]>
  inventoryAnnexPresent: Fact<boolean>
}

export interface IncreaseFacts {
  id: string
  effectiveDate: Fact<string>
  frequencyMonths: Fact<number>
  mechanism: Fact<'fixed_percentage' | 'cpi' | 'minimum_wage' | 'negotiated' | 'other'>
  rate: Fact<Percentage>
  indexName: Fact<string>
  cap: Fact<Percentage>
  floor: Fact<Percentage>
  formula: Fact<string>
}

export interface RenewalFacts {
  automatic: Fact<boolean>
  renewalTermMonths: Fact<number>
  noticeRequired: Fact<boolean>
  noticeDays: Fact<number>
  noticeDeadline: Fact<string>
  noticeChannels: Fact<string[]>
  conditions: Fact<string>
}

export interface PenaltyFacts {
  id: string
  trigger: Fact<string>
  liableParty: Fact<PartyRole>
  amount: Fact<Money>
  rentMultiples: Fact<string>
  percentage: Fact<Percentage>
  calculationBasis: Fact<string>
  gracePeriodDays: Fact<number>
  cumulative: Fact<boolean>
}

export interface TerminationFacts {
  id: string
  entitledParty: Fact<PartyRole | 'both'>
  grounds: Fact<string[]>
  withoutCauseAllowed: Fact<boolean>
  noticeDays: Fact<number>
  noticeChannels: Fact<string[]>
  penaltyIds: string[]
  curePeriodDays: Fact<number>
  conditions: Fact<string>
}

export interface ContractFacts {
  document: {
    contractType: Fact<'residential_lease' | 'commercial_lease' | 'property_management' | 'sublease' | 'other'>
    title: Fact<string>
    contractNumber: Fact<string>
    signedDate: Fact<string>
    signedCity: Fact<string>
    language: Fact<string>
  }
  parties: PartyFacts[]
  property: PropertyFacts
  term: {
    startDate: Fact<string>
    possessionDate: Fact<string>
    endDate: Fact<string>
    durationMonths: Fact<number>
  }
  financial: {
    rent: Fact<Money>
    paymentFrequency: Fact<'monthly' | 'quarterly' | 'annual' | 'other'>
    dueDay: Fact<number>
    paymentMethod: Fact<string>
    deposit: Fact<Money>
    depositConditions: Fact<string>
    administrationFee: Fact<Money>
    utilitiesResponsibility: Fact<string>
    insuranceRequirement: Fact<string>
    lateInterest: Fact<Percentage>
  }
  increases: IncreaseFacts[]
  renewal: RenewalFacts
  penalties: PenaltyFacts[]
  termination: TerminationFacts[]
  clauses: Array<{ id: string; heading: Fact<string>; text: Fact<string>; clauseNumber: Fact<string> }>
}

export interface ContractRisk {
  id: string
  code: string
  category: 'identity' | 'property' | 'term' | 'financial' | 'increase' | 'renewal' | 'notice' | 'penalty' | 'termination' | 'completeness' | 'legal_review'
  severity: RiskSeverity
  title: string
  description: string
  confidence: number
  factPaths: string[]
  clauseIds: string[]
  evidenceIds: string[]
  observed: unknown
  expected: unknown
  recommendation: string
  requiresProfessionalReview: boolean
  rule: { id: string; version: string; legalReference: string | null }
}

export interface LeaseReaderResultV1 {
  schema: { name: 'leasereader-result'; version: typeof LEASEREADER_SCHEMA_VERSION }
  analysis: { id: string; documentId: string; jurisdiction: typeof LEASEREADER_JURISDICTION; generatedAt: string; locale: 'es-CO' | 'en'; status: 'completed' | 'partial' }
  legalPackage: { id: string; version: string; effectiveDate: string; scope: string; reviewedByProfessional: boolean }
  source: { primaryArtifactId: string; format: 'pdf' | 'image' | 'docx' | 'text'; artifacts: Array<{ id: string; mimeType: string; sha256: string; pageCount: number | null }>; limitations: string[] }
  evidence: Evidence[]
  facts: ContractFacts
  risks: ContractRisk[]
  conclusion: { outcome: ReviewOutcome; summary: string; riskCounts: Record<RiskSeverity, number>; confidence: number; disclaimerCode: 'SUPPORT_TOOL_NOT_LEGAL_ADVICE' }
  trace: { extractor: { name: string; version: string }; rules: { packageId: string; version: string }; ai: { used: boolean; provider: string | null; model: string | null; promptVersion: string | null } }
}
