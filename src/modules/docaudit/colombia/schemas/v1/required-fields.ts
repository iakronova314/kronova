import type { DocumentKind, SourceFormat } from './types'

export type Requirement = 'required' | 'conditional' | 'not_applicable'

const shared = {
  'facts.document.number': 'required', 'facts.document.issueDate': 'required',
  'facts.document.issueTime': 'required', 'facts.document.currency': 'required',
  'facts.document.uniqueCode': 'required', 'facts.document.uniqueCodeType': 'required',
  'facts.supplier.name': 'required', 'facts.supplier.taxId': 'required',
  'facts.customer.name': 'required', 'facts.customer.taxId': 'required',
  'facts.lines': 'required', 'facts.taxes': 'conditional',
  'facts.totals.lineExtension': 'required', 'facts.totals.taxExclusive': 'required',
  'facts.totals.taxInclusive': 'required', 'facts.totals.payable': 'required',
  'facts.technical.signaturePresent': 'required',
  'facts.technical.signatureValid': 'conditional',
  'facts.technical.dianResponseCode': 'conditional',
} satisfies Record<string, Requirement>

/** Missing required values remain present as null Facts and produce a completeness finding. */
export const CO_V1_FIELD_REQUIREMENTS: Record<DocumentKind, Record<string, Requirement>> = {
  invoice: { ...shared, 'facts.references': 'not_applicable' },
  credit_note: { ...shared, 'facts.references': 'required' },
  debit_note: { ...shared, 'facts.references': 'required' },
  unknown: {},
}

export const CO_V1_SOURCE_CAPABILITIES: Record<SourceFormat, readonly string[]> = {
  xml: ['structure', 'identities', 'lines', 'taxes', 'totals', 'unique_code', 'signature'],
  attached_document: ['structure', 'identities', 'lines', 'taxes', 'totals', 'unique_code', 'signature', 'dian_response'],
  zip: ['structure', 'identities', 'lines', 'taxes', 'totals', 'unique_code', 'signature', 'dian_response', 'cross_file_consistency'],
  pdf: ['visible_fields', 'arithmetic', 'qr_code'],
}
