import { XMLParser, XMLValidator } from 'fast-xml-parser'
import type { ExtractedPage } from '@/lib/documents/extract-text'
import type { Evidence, ExtractedFacts, Fact, LineFacts, Money, PartyFacts, ReferenceFacts, TaxFacts } from './schemas/v1'

type Node = Record<string, unknown>
type FactMethod = Fact<unknown>['method']

export interface InvoiceExtraction {
  facts: ExtractedFacts
  evidence: Evidence[]
  missingRequiredPaths: string[]
}

const asNode = (value: unknown): Node => value && typeof value === 'object' && !Array.isArray(value) ? value as Node : {}
const list = (value: unknown): unknown[] => value == null ? [] : Array.isArray(value) ? value : [value]
const scalar = (value: unknown): string | null => {
  if (value == null) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value).trim() || null
  const text = asNode(value)['#text']
  return text == null ? null : String(text).trim() || null
}
const child = (node: unknown, key: string) => asNode(node)[key]
const valueAt = (node: unknown, ...path: string[]) => scalar(path.reduce((value, key) => child(value, key), node))
const attributeAt = (node: unknown, path: string[], attribute: string) => scalar(asNode(path.reduce((value, key) => child(value, key), node))[`@_${attribute}`])
const sumMoney = (nodes: unknown[], charge: boolean) => nodes
  .filter((entry) => valueAt(entry, 'ChargeIndicator') === String(charge))
  .map((entry) => valueAt(entry, 'Amount'))
  .filter((value): value is string => value !== null)
  .reduce((total, value) => total + Number(value), 0)

function embeddedXmlValues(value: unknown, output: string[] = []): string[] {
  if (typeof value === 'string' && /<(?:\w+:)?(?:Invoice|CreditNote|DebitNote|ApplicationResponse)\b/.test(value)) output.push(value)
  else if (Array.isArray(value)) value.forEach((item) => embeddedXmlValues(item, output))
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => embeddedXmlValues(item, output))
  return output
}

function containsKey(value: unknown, expected: string): boolean {
  if (Array.isArray(value)) return value.some((item) => containsKey(item, expected))
  if (!value || typeof value !== 'object') return false
  return Object.entries(value).some(([key, childValue]) => key === expected || containsKey(childValue, expected))
}

class FactsBuilder {
  readonly evidence: Evidence[] = []
  readonly missingRequiredPaths: string[] = []

  fact<T>(value: T | null, method: FactMethod, locator: string, required = false, excerpt?: string | null): Fact<T> {
    if (value === null) {
      if (required) this.missingRequiredPaths.push(locator)
      return { value: null, method: 'not_observed', confidence: 0, evidenceIds: [] }
    }
    const id = `ev-${this.evidence.length + 1}`
    this.evidence.push({ id, kind: method === 'xml_parser' ? 'xml_path' : 'pdf_region', artifactId: 'primary', locator, excerpt: excerpt ?? String(value).slice(0, 240) })
    return { value, method, confidence: method === 'xml_parser' ? 1 : 0.75, evidenceIds: [id] }
  }

  money(value: string | null, currency: string, method: FactMethod, locator: string, required = false): Fact<Money> {
    return this.fact(value === null ? null : { amount: value, currency }, method, locator, required, value)
  }
}

function party(builder: FactsBuilder, node: unknown, locator: string): PartyFacts {
  const partyNode = child(node, 'Party')
  const taxScheme = child(partyNode, 'PartyTaxScheme')
  const legal = child(partyNode, 'PartyLegalEntity')
  const identification = child(partyNode, 'PartyIdentification')
  const companyId = child(taxScheme, 'CompanyID') ?? child(identification, 'ID')
  const address = child(partyNode, 'PhysicalLocation') ? child(child(partyNode, 'PhysicalLocation'), 'Address') : child(partyNode, 'PostalAddress')
  const addressParts = ['Line', 'CityName', 'CountrySubentity'].map((key) => valueAt(address, 'AddressLine', key === 'Line' ? 'Line' : key) ?? valueAt(address, key)).filter(Boolean)
  return {
    name: builder.fact(valueAt(taxScheme, 'RegistrationName') ?? valueAt(legal, 'RegistrationName') ?? valueAt(partyNode, 'PartyName', 'Name'), 'xml_parser', `${locator}/Party/PartyTaxScheme/RegistrationName`, true),
    taxId: builder.fact(scalar(companyId), 'xml_parser', `${locator}/Party/PartyTaxScheme/CompanyID`, true),
    verificationDigit: builder.fact(scalar(asNode(companyId)['@_schemeID']), 'xml_parser', `${locator}/Party/PartyTaxScheme/CompanyID/@schemeID`),
    identificationType: builder.fact(scalar(asNode(companyId)['@_schemeName']), 'xml_parser', `${locator}/Party/PartyTaxScheme/CompanyID/@schemeName`),
    taxResponsibilities: builder.fact(list(child(taxScheme, 'TaxLevelCode')).map(scalar).filter((item): item is string => item !== null), 'xml_parser', `${locator}/Party/PartyTaxScheme/TaxLevelCode`),
    address: builder.fact(addressParts.length ? addressParts.join(', ') : null, 'xml_parser', `${locator}/Party/PhysicalLocation/Address`),
    email: builder.fact(valueAt(partyNode, 'Contact', 'ElectronicMail'), 'xml_parser', `${locator}/Party/Contact/ElectronicMail`),
  }
}

function taxEntries(builder: FactsBuilder, values: unknown[], withholding: boolean, currency: string, baseLocator: string, scope: TaxFacts['scope'], lineId: string | null): TaxFacts[] {
  const output: TaxFacts[] = []
  values.forEach((total, totalIndex) => {
    const subtotals = list(child(total, 'TaxSubtotal'))
    if (!subtotals.length) subtotals.push(total)
    subtotals.forEach((subtotal, subtotalIndex) => {
      const category = child(subtotal, 'TaxCategory')
      const scheme = child(category, 'TaxScheme')
      const locator = `${baseLocator}[${totalIndex + 1}]/TaxSubtotal[${subtotalIndex + 1}]`
      output.push({
        id: `tax-${scope}-${lineId ?? 'document'}-${output.length + 1}`,
        scope, lineId,
        kind: builder.fact(valueAt(scheme, 'ID') ?? valueAt(scheme, 'Name'), 'xml_parser', `${locator}/TaxCategory/TaxScheme/ID`),
        category: builder.fact(valueAt(category, 'ID'), 'xml_parser', `${locator}/TaxCategory/ID`),
        rate: builder.fact(valueAt(category, 'Percent') ?? valueAt(subtotal, 'Percent'), 'xml_parser', `${locator}/TaxCategory/Percent`),
        taxableAmount: builder.money(valueAt(subtotal, 'TaxableAmount'), currency, 'xml_parser', `${locator}/TaxableAmount`),
        amount: builder.money(valueAt(subtotal, 'TaxAmount') ?? valueAt(total, 'TaxAmount'), currency, 'xml_parser', `${locator}/TaxAmount`),
        isWithholding: builder.fact(withholding, 'derived', locator),
      })
    })
  })
  return output
}

function emptyParty(builder: FactsBuilder, locator: string): PartyFacts {
  return party(builder, {}, locator)
}

export function extractInvoiceFromXml(bytes: Uint8Array): InvoiceExtraction {
  const xml = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '')
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('XML_DTD_NOT_ALLOWED')
  if (XMLValidator.validate(xml, { allowBooleanAttributes: false }) !== true) throw new Error('INVALID_XML')
  const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', removeNSPrefix: true, parseTagValue: false, parseAttributeValue: false, processEntities: false, maxNestedTags: 100, trimValues: true }).parse(xml) as Node
  const rootName = ['Invoice', 'CreditNote', 'DebitNote'].find((name) => parsed[name])
  if (!rootName && parsed.AttachedDocument) {
    const embedded = embeddedXmlValues(parsed.AttachedDocument)
    const fiscalXml = embedded.find((value) => /<(?:\w+:)?(?:Invoice|CreditNote|DebitNote)\b/.test(value))
    if (!fiscalXml) throw new Error('ATTACHED_DOCUMENT_WITHOUT_FISCAL_XML')
    const extraction = extractInvoiceFromXml(new TextEncoder().encode(fiscalXml))
    const responseXml = embedded.find((value) => /<(?:\w+:)?ApplicationResponse\b/.test(value))
    if (responseXml) {
      const response = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false, parseAttributeValue: false, processEntities: false, trimValues: true }).parse(responseXml) as Node
      const application = response.ApplicationResponse
      const responseCode = valueAt(application, 'DocumentResponse', 'Response', 'ResponseCode')
      const description = valueAt(application, 'DocumentResponse', 'Response', 'Description')
      const issued = [valueAt(application, 'IssueDate'), valueAt(application, 'IssueTime')].filter(Boolean).join('T') || null
      const add = <T>(value: T | null, locator: string): Fact<T> => {
        if (value === null) return { value: null, method: 'not_observed', confidence: 0, evidenceIds: [] }
        const id = `ev-${extraction.evidence.length + 1}`
        extraction.evidence.push({ id, kind: 'external_response', artifactId: 'primary', locator, excerpt: String(value).slice(0, 240) })
        return { value, method: 'xml_parser', confidence: 1, evidenceIds: [id] }
      }
      extraction.facts.technical.dianResponseCode = add(responseCode, '/AttachedDocument/ApplicationResponse/DocumentResponse/Response/ResponseCode')
      extraction.facts.technical.dianResponseDescription = add(description, '/AttachedDocument/ApplicationResponse/DocumentResponse/Response/Description')
      extraction.facts.technical.dianValidatedAt = add(issued, '/AttachedDocument/ApplicationResponse/IssueDate')
    }
    return extraction
  }
  if (!rootName) throw new Error('UNSUPPORTED_FISCAL_XML')
  const root = parsed[rootName] as Node
  const builder = new FactsBuilder()
  const kind = rootName === 'Invoice' ? 'invoice' : rootName === 'CreditNote' ? 'credit_note' : 'debit_note'
  const uniqueCodeType = kind === 'invoice' ? 'CUFE' : 'CUDE'
  const currency = valueAt(root, 'DocumentCurrencyCode') ?? 'COP'
  const documentNumber = valueAt(root, 'ID')
  const prefix = documentNumber?.match(/^[^0-9]+/)?.[0].replace(/[-\s]+$/, '') ?? null
  const rootPath = `/${rootName}`
  const lineKey = rootName === 'Invoice' ? 'InvoiceLine' : rootName === 'CreditNote' ? 'CreditNoteLine' : 'DebitNoteLine'
  const quantityKey = rootName === 'Invoice' ? 'InvoicedQuantity' : rootName === 'CreditNote' ? 'CreditedQuantity' : 'DebitedQuantity'
  const lines: LineFacts[] = []
  const taxes: TaxFacts[] = []

  list(root[lineKey]).forEach((entry, index) => {
    const line = asNode(entry)
    const id = valueAt(line, 'ID') ?? String(index + 1)
    const locator = `${rootPath}/${lineKey}[${index + 1}]`
    const allowances = list(line.AllowanceCharge)
    const lineTaxes = [
      ...taxEntries(builder, list(line.TaxTotal), false, currency, `${locator}/TaxTotal`, 'line', id),
      ...taxEntries(builder, list(line.WithholdingTaxTotal), true, currency, `${locator}/WithholdingTaxTotal`, 'line', id),
    ]
    taxes.push(...lineTaxes)
    lines.push({
      id,
      description: builder.fact(valueAt(line, 'Item', 'Description'), 'xml_parser', `${locator}/Item/Description`, true),
      quantity: builder.fact(valueAt(line, quantityKey), 'xml_parser', `${locator}/${quantityKey}`, true),
      unitCode: builder.fact(attributeAt(line, [quantityKey], 'unitCode'), 'xml_parser', `${locator}/${quantityKey}/@unitCode`),
      unitPrice: builder.money(valueAt(line, 'Price', 'PriceAmount'), currency, 'xml_parser', `${locator}/Price/PriceAmount`, true),
      lineExtensionAmount: builder.money(valueAt(line, 'LineExtensionAmount'), currency, 'xml_parser', `${locator}/LineExtensionAmount`, true),
      discounts: builder.money(String(sumMoney(allowances, false)), currency, 'derived', `${locator}/AllowanceCharge[ChargeIndicator=false]`),
      charges: builder.money(String(sumMoney(allowances, true)), currency, 'derived', `${locator}/AllowanceCharge[ChargeIndicator=true]`),
      taxIds: lineTaxes.map((tax) => tax.id),
    })
  })

  taxes.unshift(
    ...taxEntries(builder, list(root.TaxTotal), false, currency, `${rootPath}/TaxTotal`, 'document', null),
    ...taxEntries(builder, list(root.WithholdingTaxTotal), true, currency, `${rootPath}/WithholdingTaxTotal`, 'document', null),
  )
  const legal = child(root, 'LegalMonetaryTotal') ?? child(root, 'RequestedMonetaryTotal')
  const allowances = list(root.AllowanceCharge)
  const paymentMeans = list(root.PaymentMeans).map((item) => valueAt(item, 'PaymentMeansCode')).filter((item): item is string => item !== null)
  const references: ReferenceFacts[] = list(root.BillingReference).map((item, index) => {
    const reference = child(item, 'InvoiceDocumentReference')
    const locator = `${rootPath}/BillingReference[${index + 1}]/InvoiceDocumentReference`
    return {
      documentNumber: builder.fact(valueAt(reference, 'ID'), 'xml_parser', `${locator}/ID`, kind !== 'invoice'),
      uniqueCode: builder.fact(valueAt(reference, 'UUID'), 'xml_parser', `${locator}/UUID`, kind !== 'invoice'),
      issueDate: builder.fact(valueAt(reference, 'IssueDate'), 'xml_parser', `${locator}/IssueDate`),
      reasonCode: builder.fact(valueAt(root, 'DiscrepancyResponse', 'ResponseCode'), 'xml_parser', `${rootPath}/DiscrepancyResponse/ResponseCode`),
      reason: builder.fact(valueAt(root, 'DiscrepancyResponse', 'Description'), 'xml_parser', `${rootPath}/DiscrepancyResponse/Description`),
    }
  })
  if (kind !== 'invoice' && !references.length) builder.missingRequiredPaths.push('facts.references')

  const facts: ExtractedFacts = {
    document: {
      kind: builder.fact(kind, 'xml_parser', rootPath, true),
      number: builder.fact(documentNumber, 'xml_parser', `${rootPath}/ID`, true),
      prefix: builder.fact(prefix, 'derived', `${rootPath}/ID`),
      issueDate: builder.fact(valueAt(root, 'IssueDate'), 'xml_parser', `${rootPath}/IssueDate`, true),
      issueTime: builder.fact(valueAt(root, 'IssueTime'), 'xml_parser', `${rootPath}/IssueTime`, true),
      currency: builder.fact(currency, 'xml_parser', `${rootPath}/DocumentCurrencyCode`, true),
      operationType: builder.fact(valueAt(root, 'CustomizationID'), 'xml_parser', `${rootPath}/CustomizationID`),
      uniqueCode: builder.fact(valueAt(root, 'UUID'), 'xml_parser', `${rootPath}/UUID`, true),
      uniqueCodeType: builder.fact(uniqueCodeType, 'derived', `${rootPath}/UUID/@schemeName`, true),
      paymentMeans: builder.fact(paymentMeans, 'xml_parser', `${rootPath}/PaymentMeans/PaymentMeansCode`),
      paymentDueDate: builder.fact(valueAt(root, 'PaymentMeans', 'PaymentDueDate') ?? valueAt(root, 'DueDate'), 'xml_parser', `${rootPath}/PaymentMeans/PaymentDueDate`),
    },
    supplier: root.AccountingSupplierParty ? party(builder, root.AccountingSupplierParty, `${rootPath}/AccountingSupplierParty`) : emptyParty(builder, `${rootPath}/AccountingSupplierParty`),
    customer: root.AccountingCustomerParty ? party(builder, root.AccountingCustomerParty, `${rootPath}/AccountingCustomerParty`) : emptyParty(builder, `${rootPath}/AccountingCustomerParty`),
    lines,
    taxes,
    totals: {
      lineExtension: builder.money(valueAt(legal, 'LineExtensionAmount'), currency, 'xml_parser', `${rootPath}/LegalMonetaryTotal/LineExtensionAmount`, true),
      taxExclusive: builder.money(valueAt(legal, 'TaxExclusiveAmount'), currency, 'xml_parser', `${rootPath}/LegalMonetaryTotal/TaxExclusiveAmount`, true),
      taxInclusive: builder.money(valueAt(legal, 'TaxInclusiveAmount'), currency, 'xml_parser', `${rootPath}/LegalMonetaryTotal/TaxInclusiveAmount`, true),
      allowances: builder.money(valueAt(legal, 'AllowanceTotalAmount') ?? String(sumMoney(allowances, false)), currency, 'xml_parser', `${rootPath}/LegalMonetaryTotal/AllowanceTotalAmount`),
      charges: builder.money(valueAt(legal, 'ChargeTotalAmount') ?? String(sumMoney(allowances, true)), currency, 'xml_parser', `${rootPath}/LegalMonetaryTotal/ChargeTotalAmount`),
      prepaid: builder.money(valueAt(legal, 'PrepaidAmount'), currency, 'xml_parser', `${rootPath}/LegalMonetaryTotal/PrepaidAmount`),
      withholding: builder.money(valueAt(root, 'WithholdingTaxTotal', 'TaxAmount'), currency, 'xml_parser', `${rootPath}/WithholdingTaxTotal/TaxAmount`),
      payable: builder.money(valueAt(legal, 'PayableAmount'), currency, 'xml_parser', `${rootPath}/LegalMonetaryTotal/PayableAmount`, true),
    },
    references,
    technical: {
      ublVersion: builder.fact(valueAt(root, 'UBLVersionID'), 'xml_parser', `${rootPath}/UBLVersionID`),
      dianProfile: builder.fact(valueAt(root, 'ProfileID'), 'xml_parser', `${rootPath}/ProfileID`),
      signaturePresent: builder.fact(containsKey(root, 'Signature'), 'xml_parser', `${rootPath}/UBLExtensions/Signature`, true),
      signatureValid: builder.fact<boolean>(null, 'not_observed', `${rootPath}/UBLExtensions/Signature`),
      dianResponseCode: builder.fact<string>(null, 'not_observed', '/AttachedDocument/ApplicationResponse/ResponseCode'),
      dianResponseDescription: builder.fact<string>(null, 'not_observed', '/AttachedDocument/ApplicationResponse/Description'),
      dianValidatedAt: builder.fact<string>(null, 'not_observed', '/AttachedDocument/ApplicationResponse/IssueDate'),
      qrCode: builder.fact(valueAt(root, 'QRCode'), 'xml_parser', `${rootPath}/QRCode`),
    },
  }
  if (!lines.length) builder.missingRequiredPaths.push('facts.lines')
  return { facts, evidence: builder.evidence, missingRequiredPaths: [...new Set(builder.missingRequiredPaths)] }
}

function matchPages(pages: ExtractedPage[], pattern: RegExp): { value: string; page: number; excerpt: string } | null {
  for (const page of pages) {
    const match = page.text.match(pattern)
    if (match?.[1]) return { value: match[1].trim(), page: page.page, excerpt: match[0] }
  }
  return null
}

/** Conservative PDF fallback. It never claims XML, signature, line or DIAN validation. */
export function extractInvoiceFromPdf(pages: ExtractedPage[]): InvoiceExtraction {
  const builder = new FactsBuilder()
  const missing = <T>(path: string) => builder.fact<T>(null, 'not_observed', path)
  const found = (pattern: RegExp, path: string, required = false) => {
    const match = matchPages(pages, pattern)
    return builder.fact(match?.value ?? null, 'pdf_text', match ? `page:${match.page}:${path}` : path, required, match?.excerpt)
  }
  const currencyFact = found(/(?:moneda|currency)\s*[:\-]?\s*([A-Z]{3})/i, 'facts.document.currency')
  const currency = currencyFact.value ?? 'COP'
  const money = (pattern: RegExp, path: string, required = false) => {
    const match = matchPages(pages, pattern)
    const amount = match?.value.replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.') ?? null
    return builder.money(amount, currency, 'pdf_text', match ? `page:${match.page}:${path}` : path, required)
  }
  const missingParty = (prefix: string): PartyFacts => ({
    name: found(new RegExp(`${prefix}[^\\n]{0,20}(?:nombre|raz[oó]n social)\\s*[:\\-]?\\s*([^\\n]{2,100})`, 'i'), `facts.${prefix}.name`, true),
    taxId: found(new RegExp(`${prefix}[^\\n]{0,30}(?:NIT|CC)\\s*[:\\-]?\\s*([0-9.-]+)`, 'i'), `facts.${prefix}.taxId`, true),
    verificationDigit: missing<string>(`facts.${prefix}.verificationDigit`), identificationType: missing<string>(`facts.${prefix}.identificationType`),
    taxResponsibilities: missing<string[]>(`facts.${prefix}.taxResponsibilities`), address: missing<string>(`facts.${prefix}.address`), email: missing<string>(`facts.${prefix}.email`),
  })
  const facts: ExtractedFacts = {
    document: {
      kind: builder.fact('invoice', 'pdf_text', 'page:*:document-kind', true),
      number: found(/(?:factura|invoice)(?:\s+(?:electr[oó]nica|de venta))?\s*(?:n[oº°.]*)?\s*[:#-]?\s*([A-Z0-9-]+)/i, 'facts.document.number', true),
      prefix: missing<string>('facts.document.prefix'), issueDate: found(/(?:fecha(?:\s+de\s+emisi[oó]n)?|issue date)\s*[:\-]?\s*(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})/i, 'facts.document.issueDate', true),
      issueTime: found(/(?:hora|time)\s*[:\-]?\s*(\d{1,2}:\d{2}(?::\d{2})?)/i, 'facts.document.issueTime'), currency: currencyFact,
      operationType: missing<string>('facts.document.operationType'), uniqueCode: found(/CUFE\s*[:\-]?\s*([a-f0-9]{40,})/i, 'facts.document.uniqueCode'),
      uniqueCodeType: builder.fact('CUFE', 'derived', 'facts.document.uniqueCodeType'), paymentMeans: missing<string[]>('facts.document.paymentMeans'), paymentDueDate: missing<string>('facts.document.paymentDueDate'),
    },
    supplier: missingParty('supplier'), customer: missingParty('customer'), lines: [], taxes: [], references: [],
    totals: {
      lineExtension: money(/(?:subtotal|valor bruto)\s*[:$]?\s*([0-9.,]+)/i, 'facts.totals.lineExtension', true),
      taxExclusive: money(/(?:total antes de impuestos|tax exclusive)\s*[:$]?\s*([0-9.,]+)/i, 'facts.totals.taxExclusive'),
      taxInclusive: money(/(?:total con impuestos|tax inclusive)\s*[:$]?\s*([0-9.,]+)/i, 'facts.totals.taxInclusive'),
      allowances: money(/(?:descuentos?|allowance)\s*[:$]?\s*([0-9.,]+)/i, 'facts.totals.allowances'), charges: money(/(?:cargos?|charges?)\s*[:$]?\s*([0-9.,]+)/i, 'facts.totals.charges'),
      prepaid: money(/(?:anticipos?|prepaid)\s*[:$]?\s*([0-9.,]+)/i, 'facts.totals.prepaid'), withholding: money(/(?:retenciones?|withholding)\s*[:$]?\s*([0-9.,]+)/i, 'facts.totals.withholding'),
      payable: money(/(?:total(?:\s+a\s+pagar)?|payable)\s*[:$]?\s*([0-9.,]+)/i, 'facts.totals.payable', true),
    },
    technical: {
      ublVersion: missing<string>('facts.technical.ublVersion'), dianProfile: missing<string>('facts.technical.dianProfile'),
      signaturePresent: missing<boolean>('facts.technical.signaturePresent'), signatureValid: missing<boolean>('facts.technical.signatureValid'),
      dianResponseCode: missing<string>('facts.technical.dianResponseCode'), dianResponseDescription: missing<string>('facts.technical.dianResponseDescription'),
      dianValidatedAt: missing<string>('facts.technical.dianValidatedAt'), qrCode: missing<string>('facts.technical.qrCode'),
    },
  }
  builder.missingRequiredPaths.push('facts.lines')
  return { facts, evidence: builder.evidence, missingRequiredPaths: [...new Set(builder.missingRequiredPaths)] }
}
