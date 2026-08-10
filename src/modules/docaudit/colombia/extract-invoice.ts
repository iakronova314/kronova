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
    const kind = method === 'xml_parser' ? 'xml_path' : method === 'derived' ? 'calculation' : 'pdf_region'
    this.evidence.push({ id, kind, artifactId: 'primary', locator, excerpt: excerpt ?? String(value).slice(0, 240) })
    return { value, method, confidence: method === 'xml_parser' ? 1 : 0.75, evidenceIds: [id] }
  }

  money(value: string | null, currency: string, method: FactMethod, locator: string, required = false, excerpt?: string | null): Fact<Money> {
    return this.fact(value === null ? null : { amount: value, currency }, method, locator, required, excerpt ?? value)
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

function matchPages(pages: ExtractedPage[], pattern: RegExp): { value: string; page: number; excerpt: string; start: number; end: number } | null {
  for (const page of pages) {
    const match = page.text.match(pattern)
    if (match?.[1] && match.index !== undefined) return { value: match[1].trim(), page: page.page, excerpt: match[0], start: match.index, end: match.index + match[0].length }
  }
  return null
}

/** Conservative PDF fallback. It never claims XML, signature, line or DIAN validation. */
export function extractInvoiceFromPdf(pages: ExtractedPage[]): InvoiceExtraction {
  const builder = new FactsBuilder()
  const text = pages.map((page) => page.text).join(' ')
  const locator = (path: string, excerpt?: string | null) => {
    if (excerpt) for (const page of pages) {
      const start = page.text.indexOf(excerpt)
      if (start >= 0) return `page:${page.page}:chars:${start}-${start + excerpt.length}:${path}`
    }
    return `unlocated:${path}`
  }
  const missing = <T>(path: string) => builder.fact<T>(null, 'not_observed', path)
  const found = (pattern: RegExp, path: string, required = false) => {
    const match = matchPages(pages, pattern)
    return builder.fact(match?.value ?? null, 'pdf_text', match ? `page:${match.page}:chars:${match.start}-${match.end}:${path}` : `unlocated:${path}`, required, match?.excerpt)
  }
  const currencyFact = found(/(?:moneda|currency)\s*[:\-]?\s*([A-Z]{3})/i, 'facts.document.currency')
  const currency = currencyFact.value ?? 'COP'
  const effectiveCurrency = currencyFact.value ? currencyFact : /(?:pesos\s*\/\s*mcte|\bCOP\b)/i.test(text)
    ? builder.fact('COP', 'derived', 'calculation:facts.document.currency:visible-label-pesos-mcte', false, 'COP inferido de “Pesos /Mcte”.') : currencyFact
  const money = (pattern: RegExp, path: string, required = false) => {
    const match = matchPages(pages, pattern)
    const amount = match?.value.replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.') ?? null
    return builder.money(amount, currency, 'pdf_text', match ? `page:${match.page}:chars:${match.start}-${match.end}:${path}` : `unlocated:${path}`, required, match?.excerpt)
  }
  const pdfFact = <T>(value: T | null, path: string, excerpt?: string | null) => builder.fact(value, 'pdf_text', locator(path, excerpt), false, excerpt)
  const normalizeAmount = (value: string) => {
    const compact = value.replace(/\s/g, '')
    const comma = compact.lastIndexOf(',')
    const dot = compact.lastIndexOf('.')
    if (comma >= 0 && dot >= 0) return dot > comma ? compact.replace(/,/g, '') : compact.replace(/\./g, '').replace(',', '.')
    if (comma >= 0) return /^\d{1,3}(?:,\d{3})+$/.test(compact) ? compact.replace(/,/g, '') : compact.replace(',', '.')
    if (dot >= 0) return /^\d{1,3}(?:\.\d{3})+$/.test(compact) ? compact.replace(/\./g, '') : compact
    return compact
  }
  const cleanId = (value: string | undefined) => value ? value.replace(/\D/g, '') : null
  const supplierMatch = text.match(/CUFE\s*:\s*[a-f0-9]{40,}\s+(.{2,100}?)\s+NIT\s*:\s*([0-9.,]+)\s*-\s*(\d)/i)
  const customerMatch = text.match(/Cliente\s+NIT\s+Direcci[oó]n\s+Tel[eé]fono\s+(.{2,100}?)\s+([0-9.,]+)\s*-\s*(\d)/i)
  const party = (prefix: 'supplier' | 'customer', match: RegExpMatchArray | null): PartyFacts => ({
    name: pdfFact(match?.[1]?.trim() ?? null, `facts.${prefix}.name`, match?.[0]), taxId: pdfFact(cleanId(match?.[2]), `facts.${prefix}.taxId`, match?.[0]),
    verificationDigit: pdfFact(match?.[3] ?? null, `facts.${prefix}.verificationDigit`, match?.[0]), identificationType: builder.fact(match ? '31' : null, 'derived', `calculation:facts.${prefix}.identificationType:nit-label`, false, match ? 'Tipo 31 inferido de la etiqueta NIT.' : null),
    taxResponsibilities: missing<string[]>(`facts.${prefix}.taxResponsibilities`), address: missing<string>(`facts.${prefix}.address`), email: missing<string>(`facts.${prefix}.email`),
  })
  const lines: LineFacts[] = []
  const linePattern = /(?:^|\s)(\d{10,20})\s+(.{2,160}?)\s+(KGM|EA|NIU|UND|UN|H87|LTR|MTR)\s+(\d+(?:[.,]\d+)?)\s+([0-9][0-9.,]*)\s+([0-9][0-9.,]*)(?=\s+(?:\d{10,20}|[A-Z]\s+Total|Total\s+Bruto))/gi
  for (const match of text.matchAll(linePattern)) {
    const index = lines.length; const excerpt = match[0].trim()
    lines.push({ id: match[1], description: pdfFact(match[2].trim(), `facts.lines[${index}].description`, excerpt), quantity: pdfFact(normalizeAmount(match[4]), `facts.lines[${index}].quantity`, excerpt), unitCode: pdfFact(match[3], `facts.lines[${index}].unitCode`, excerpt), unitPrice: builder.money(normalizeAmount(match[5]), currency, 'pdf_text', locator(`facts.lines[${index}].unitPrice`, excerpt), false, excerpt), lineExtensionAmount: builder.money(normalizeAmount(match[6]), currency, 'pdf_text', locator(`facts.lines[${index}].lineExtensionAmount`, excerpt), false, excerpt), discounts: builder.money('0', currency, 'derived', `calculation:facts.lines[${index}].discounts:not-observed-assumed-zero`, false, 'Sin descuento visible; se usa cero para el recálculo.'), charges: builder.money('0', currency, 'derived', `calculation:facts.lines[${index}].charges:not-observed-assumed-zero`, false, 'Sin cargo visible; se usa cero para el recálculo.'), taxIds: [] })
  }
  const grossMatch = matchPages(pages, /Total\s+Bruto\s*[:$]?\s*([0-9.,]+)/i); const ivaMatch = matchPages(pages, /\bIVA\s*[:$]?\s*([0-9.,]+)/i)
  const grossAmount = grossMatch ? normalizeAmount(grossMatch.value) : null; const ivaAmount = ivaMatch ? normalizeAmount(ivaMatch.value) : null
  const inferredRate = grossAmount && ivaAmount && Number(grossAmount) > 0 ? String(Number(((Number(ivaAmount) / Number(grossAmount)) * 100).toFixed(4))) : null
  const taxes: TaxFacts[] = ivaAmount ? [{ id: 'tax-document-iva-1', scope: 'document', lineId: null, kind: pdfFact('IVA', 'facts.taxes[0].kind', ivaMatch?.excerpt), category: missing<string>('facts.taxes[0].category'), rate: builder.fact(inferredRate, 'derived', 'calculation:facts.taxes[0].rate:amount-divided-by-base', false, inferredRate ? `${ivaAmount} ÷ ${grossAmount} × 100 = ${inferredRate}%` : null), taxableAmount: builder.money(grossAmount, currency, 'pdf_text', locator('facts.taxes[0].taxableAmount', grossMatch?.excerpt), false, grossMatch?.excerpt), amount: builder.money(ivaAmount, currency, 'pdf_text', locator('facts.taxes[0].amount', ivaMatch?.excerpt), false, ivaMatch?.excerpt), isWithholding: builder.fact(false, 'derived', 'calculation:facts.taxes[0].isWithholding:iva-classification', false, 'IVA clasificado como impuesto, no como retención.') }] : []
  const numberMatch = text.match(/FACTURA\s+DE\s+VENTA\s+ELECTR[OÓ]NICA\s+([A-Z]{1,10})\s*([0-9]{1,20})/i)
  const dateTimeMatch = text.match(/Generaci[oó]n\s+Expedici[oó]n\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/i)
  const dueDateMatch = text.match(/(?:Vencimiento\s+|Vence\s+el\s+)(\d{4}-\d{2}-\d{2})/i)
  const paymentMeans = /Transferencia/i.test(text) ? ['transferencia'] : /efectivo/i.test(text) ? ['efectivo'] : null
  const facts: ExtractedFacts = {
    document: {
      kind: builder.fact('invoice', 'derived', 'calculation:facts.document.kind:invoice-heading', true, 'Tipo factura inferido del encabezado visible.'),
      number: pdfFact(numberMatch ? `${numberMatch[1]}${numberMatch[2]}` : null, 'facts.document.number', numberMatch?.[0]),
      prefix: pdfFact(numberMatch?.[1] ?? null, 'facts.document.prefix', numberMatch?.[0]), issueDate: pdfFact(dateTimeMatch?.[1] ?? null, 'facts.document.issueDate', dateTimeMatch?.[0]),
      issueTime: pdfFact(dateTimeMatch?.[2] ?? null, 'facts.document.issueTime', dateTimeMatch?.[0]), currency: effectiveCurrency,
      operationType: missing<string>('facts.document.operationType'), uniqueCode: found(/CUFE\s*[:\-]?\s*([a-f0-9]{40,})/i, 'facts.document.uniqueCode'),
      uniqueCodeType: builder.fact('CUFE', 'derived', 'calculation:facts.document.uniqueCodeType:cufe-label', false, 'Tipo CUFE inferido de la etiqueta visible.'), paymentMeans: pdfFact(paymentMeans, 'facts.document.paymentMeans', paymentMeans ? /Transferencia/i.exec(text)?.[0] ?? paymentMeans[0] : null), paymentDueDate: pdfFact(dueDateMatch?.[1] ?? null, 'facts.document.paymentDueDate', dueDateMatch?.[0]),
    },
    supplier: party('supplier', supplierMatch), customer: party('customer', customerMatch), lines, taxes, references: [],
    totals: {
      lineExtension: builder.money(grossAmount, currency, 'pdf_text', locator('facts.totals.lineExtension', grossMatch?.excerpt), true, grossMatch?.excerpt),
      taxExclusive: builder.money(grossAmount, currency, 'pdf_text', locator('facts.totals.taxExclusive', grossMatch?.excerpt), true, grossMatch?.excerpt),
      taxInclusive: money(/(?:total\s+a\s+pagar|total con impuestos|tax inclusive)\s*[:$]?\s*([0-9.,]+)/i, 'facts.totals.taxInclusive', true),
      allowances: money(/(?:descuentos?|allowance)\s*[:$]?\s*([0-9.,]+)/i, 'facts.totals.allowances'), charges: money(/(?:cargos?|charges?)\s*[:$]?\s*([0-9.,]+)/i, 'facts.totals.charges'),
      prepaid: money(/(?:anticipos?|prepaid)\s*[:$]?\s*([0-9.,]+)/i, 'facts.totals.prepaid'), withholding: money(/(?:retenciones?|withholding)\s*[:$]?\s*([0-9.,]+)/i, 'facts.totals.withholding'),
      payable: money(/(?:total\s+a\s+pagar|payable)\s*[:$]?\s*([0-9.,]+)/i, 'facts.totals.payable', true),
    },
    technical: {
      ublVersion: missing<string>('facts.technical.ublVersion'), dianProfile: missing<string>('facts.technical.dianProfile'),
      signaturePresent: missing<boolean>('facts.technical.signaturePresent'), signatureValid: missing<boolean>('facts.technical.signatureValid'),
      dianResponseCode: missing<string>('facts.technical.dianResponseCode'), dianResponseDescription: missing<string>('facts.technical.dianResponseDescription'),
      dianValidatedAt: missing<string>('facts.technical.dianValidatedAt'), qrCode: missing<string>('facts.technical.qrCode'),
    },
  }
  if (!lines.length) builder.missingRequiredPaths.push('facts.lines')
  return { facts, evidence: builder.evidence, missingRequiredPaths: [...new Set(builder.missingRequiredPaths)] }
}
