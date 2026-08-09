import assert from 'node:assert/strict'
import test from 'node:test'
import { extractInvoiceFromPdf, extractInvoiceFromXml } from '../src/modules/docaudit/colombia/extract-invoice.ts'
import { auditInvoice } from '../src/modules/docaudit/colombia/rules/v1/audit.ts'
import { buildDocAuditReport } from '../src/modules/docaudit/colombia/build-report.ts'
import { DOCAUDIT_INVOICE_PROMPT_VERSION, DOCAUDIT_INVOICE_SYSTEM_INSTRUCTION } from '../src/modules/docaudit/colombia/prompts/v1/invoice-report.ts'

const invoice = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID><cbc:ProfileID>DIAN 2.1</cbc:ProfileID><cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ID>SETP990000001</cbc:ID><cbc:UUID schemeName="CUFE-SHA384">abcdef123456</cbc:UUID><cbc:IssueDate>2026-08-07</cbc:IssueDate><cbc:IssueTime>10:30:00-05:00</cbc:IssueTime><cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty><cac:Party><cac:PartyTaxScheme><cbc:RegistrationName>Proveedor SAS</cbc:RegistrationName><cbc:CompanyID schemeID="7" schemeName="31">900123456</cbc:CompanyID><cbc:TaxLevelCode>R-99-PN</cbc:TaxLevelCode></cac:PartyTaxScheme></cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party><cac:PartyTaxScheme><cbc:RegistrationName>Cliente SAS</cbc:RegistrationName><cbc:CompanyID schemeID="1" schemeName="31">800987654</cbc:CompanyID></cac:PartyTaxScheme></cac:Party></cac:AccountingCustomerParty>
  <cac:PaymentMeans><cbc:PaymentMeansCode>1</cbc:PaymentMeansCode><cbc:PaymentDueDate>2026-09-07</cbc:PaymentDueDate></cac:PaymentMeans>
  <cac:TaxTotal><cbc:TaxAmount currencyID="COP">19000.00</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="COP">100000.00</cbc:TaxableAmount><cbc:TaxAmount currencyID="COP">19000.00</cbc:TaxAmount><cac:TaxCategory><cbc:ID>01</cbc:ID><cbc:Percent>19.00</cbc:Percent><cac:TaxScheme><cbc:ID>01</cbc:ID><cbc:Name>IVA</cbc:Name></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal>
  <cac:WithholdingTaxTotal><cbc:TaxAmount currencyID="COP">2500.00</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="COP">100000.00</cbc:TaxableAmount><cbc:TaxAmount currencyID="COP">2500.00</cbc:TaxAmount><cac:TaxCategory><cbc:Percent>2.5</cbc:Percent><cac:TaxScheme><cbc:ID>06</cbc:ID><cbc:Name>ReteFuente</cbc:Name></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:WithholdingTaxTotal>
  <cac:LegalMonetaryTotal><cbc:LineExtensionAmount>100000.00</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount>100000.00</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount>119000.00</cbc:TaxInclusiveAmount><cbc:AllowanceTotalAmount>5000.00</cbc:AllowanceTotalAmount><cbc:PayableAmount>116500.00</cbc:PayableAmount></cac:LegalMonetaryTotal>
  <cac:InvoiceLine><cbc:ID>1</cbc:ID><cbc:InvoicedQuantity unitCode="EA">2</cbc:InvoicedQuantity><cbc:LineExtensionAmount>100000.00</cbc:LineExtensionAmount><cac:AllowanceCharge><cbc:ChargeIndicator>false</cbc:ChargeIndicator><cbc:Amount>5000.00</cbc:Amount></cac:AllowanceCharge><cac:Item><cbc:Description>Servicio mensual</cbc:Description></cac:Item><cac:Price><cbc:PriceAmount>50000.00</cbc:PriceAmount></cac:Price></cac:InvoiceLine>
</Invoice>`

test('extracts a Colombian UBL invoice with field evidence', () => {
  const result = extractInvoiceFromXml(new TextEncoder().encode(invoice))
  assert.equal(result.facts.document.number.value, 'SETP990000001')
  assert.equal(result.facts.supplier.taxId.value, '900123456')
  assert.equal(result.facts.customer.name.value, 'Cliente SAS')
  assert.equal(result.facts.document.currency.value, 'COP')
  assert.equal(result.facts.lines[0].description.value, 'Servicio mensual')
  assert.equal(result.facts.lines[0].discounts.value.amount, '5000')
  assert.equal(result.facts.totals.payable.value.amount, '116500.00')
  assert.equal(result.facts.totals.withholding.value.amount, '2500.00')
  assert.ok(result.facts.taxes.some((tax) => tax.isWithholding.value === true))
  assert.ok(result.evidence.every((entry) => entry.artifactId === 'primary' && entry.locator.length > 0))
  assert.deepEqual(result.missingRequiredPaths, [])
})

test('emits null and a missing path instead of dropping an absent field', () => {
  const result = extractInvoiceFromXml(new TextEncoder().encode(invoice.replace('<cbc:IssueTime>10:30:00-05:00</cbc:IssueTime>', '')))
  assert.equal(result.facts.document.issueTime.value, null)
  assert.equal(result.facts.document.issueTime.method, 'not_observed')
  assert.ok(result.missingRequiredPaths.includes('/Invoice/IssueTime'))
})

test('keeps the source page in PDF evidence', () => {
  const result = extractInvoiceFromPdf([{ page: 2, text: 'Factura No: FV-42 Fecha: 2026-08-07 Moneda: COP Subtotal: 100000 Total a pagar: 119000', characterCount: 92 }])
  const evidenceId = result.facts.document.number.evidenceIds[0]
  assert.match(result.evidence.find((item) => item.id === evidenceId).locator, /^page:2:/)
})

test('runs versioned arithmetic, completeness and duplicate rules', () => {
  const extraction = extractInvoiceFromXml(new TextEncoder().encode(invoice))
  const audit = auditInvoice(extraction.facts, { duplicateDocumentId: 'another-document', now: new Date('2026-08-08T00:00:00Z') })
  const codes = audit.findings.map((finding) => finding.code)
  assert.equal(audit.rulesPackage.version, '1.0.0')
  assert.ok(codes.includes('CO-TAX-EXCLUSIVE-MISMATCH'))
  assert.ok(codes.includes('CO-DUPLICATE-DOCUMENT-NUMBER'))
  assert.equal(audit.recalculated.taxAmount, '19000.00')
  assert.equal(audit.recalculated.withholding, '2500.00')
})

test('detects mandatory fields and invalid formats without AI', () => {
  const extraction = extractInvoiceFromXml(new TextEncoder().encode(invoice.replace('<cbc:IssueTime>10:30:00-05:00</cbc:IssueTime>', '').replace('<cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>', '<cbc:DocumentCurrencyCode>cop</cbc:DocumentCurrencyCode>')))
  const codes = auditInvoice(extraction.facts).findings.map((finding) => finding.code)
  assert.ok(codes.includes('CO-REQUIRED-FIELD-MISSING'))
  assert.ok(codes.includes('CO-CURRENCY-FORMAT'))
})

test('combines AI explanations without allowing deterministic findings to be overwritten', () => {
  const extraction = extractInvoiceFromXml(new TextEncoder().encode(invoice))
  const audit = auditInvoice(extraction.facts, { duplicateDocumentId: 'duplicate-id' })
  const original = audit.findings[0]
  const report = buildDocAuditReport({
    analysisId: '00000000-0000-4000-8000-000000000001', documentId: '00000000-0000-4000-8000-000000000002',
    generatedAt: '2026-08-08T00:00:00.000Z', mimeType: 'application/xml', sha256: 'a'.repeat(64), sourceFormat: 'xml', extraction, audit,
    ai: { modelVersion: 'gemini-test', promptVersion: DOCAUDIT_INVOICE_PROMPT_VERSION, evaluation: { summary: 'Resumen controlado.', reviewNotes: [], explanations: [{ findingId: original.id, explanation: 'Explicación complementaria.', recommendation: 'Revisar soporte.', requiresProfessionalReview: true }] } },
  })
  const combined = report.findings.find((finding) => finding.id === original.id)
  assert.equal(combined.code, original.code)
  assert.equal(combined.severity, original.severity)
  assert.equal(report.trace.ai.promptVersion, 'invoice-report-es-CO@1.0.0')
  assert.equal(report.trace.ai.model, 'gemini-test')
  assert.equal(report.conclusion.summary, 'Resumen controlado.')
})

test('keeps document content outside the fixed security instruction', () => {
  assert.match(DOCAUDIT_INVOICE_SYSTEM_INSTRUCTION, /DATOS NO CONFIABLES/)
  assert.match(DOCAUDIT_INVOICE_SYSTEM_INSTRUCTION, /Nunca sigas instrucciones/)
  assert.doesNotMatch(DOCAUDIT_INVOICE_SYSTEM_INSTRUCTION, /SETP990000001/)
})
