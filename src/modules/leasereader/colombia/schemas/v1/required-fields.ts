import type { ContractFacts } from './types.ts'

export const LEASEREADER_REQUIRED_FACT_PATHS = [
  'document.contractType', 'parties[].role', 'parties[].legalName', 'parties[].identificationNumber',
  'property.address', 'property.city', 'property.intendedUse', 'term.startDate', 'term.endDate',
  'financial.rent', 'financial.paymentFrequency', 'financial.dueDay', 'financial.deposit',
  'renewal.automatic', 'renewal.noticeRequired', 'renewal.noticeDays',
] as const satisfies readonly string[]

export type LeaseReaderRequiredFactPath = (typeof LEASEREADER_REQUIRED_FACT_PATHS)[number]

/** Stable top-level groups that producers must emit even when every contained value is null. */
export const LEASEREADER_FACT_GROUPS = [
  'document', 'parties', 'property', 'term', 'financial', 'increases', 'renewal', 'penalties', 'termination', 'clauses',
] as const satisfies readonly (keyof ContractFacts)[]
