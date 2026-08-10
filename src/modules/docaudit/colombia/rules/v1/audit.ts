import type { ExtractedFacts, Fact, Finding, FindingSeverity, Money } from '../../schemas/v1'
import { CO_V1_FIELD_REQUIREMENTS } from '../../schemas/v1/required-fields.ts'
import { Decimal } from './decimal.ts'
import { CO_RULES_V1 } from './package.ts'

export interface AuditContext {
  duplicateDocumentId?: string | null
  now?: Date
  sourceFormat?: 'xml' | 'attached_document' | 'zip' | 'pdf'
}

export interface DeterministicAudit {
  findings: Finding[]
  rulesPackage: typeof CO_RULES_V1
  recalculated: {
    lineExtension: string | null
    taxExclusive: string | null
    taxAmount: string | null
    withholding: string | null
    taxInclusive: string | null
    payable: string | null
  }
}

const tolerance = Decimal.parse(CO_RULES_V1.arithmeticTolerance)!
const money = (fact: Fact<Money>) => fact.value ? Decimal.parse(fact.value.amount) : null
const decimal = (fact: Fact<string>) => fact.value ? Decimal.parse(fact.value) : null
const sum = (values: Array<Decimal | null>) => values.some((value) => value === null) ? null : values.reduce<Decimal>((total, value) => total.add(value!), Decimal.zero())
const differs = (actual: Decimal, expected: Decimal) => actual.subtract(expected).abs().greaterThan(tolerance)

function colombianNitCheckDigit(value: string): string | null {
  const digits = value.replace(/\D/g, '')
  if (!digits || digits.length > 15) return null
  const weights = [71, 67, 59, 53, 47, 43, 41, 37, 29, 23, 19, 17, 13, 7, 3].slice(-digits.length)
  const remainder = digits.split('').reduce((total, digit, index) => total + Number(digit) * weights[index], 0) % 11
  return String(remainder > 1 ? 11 - remainder : remainder)
}

function getPath(root: unknown, path: string): unknown {
  return path.replace(/^facts\./, '').split('.').reduce((value, segment) => value && typeof value === 'object' ? (value as Record<string, unknown>)[segment] : undefined, root)
}

function present(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object' && 'value' in value) return (value as { value: unknown }).value !== null
  return value !== null && value !== undefined
}

export function auditInvoice(facts: ExtractedFacts, context: AuditContext = {}): DeterministicAudit {
  const findings: Finding[] = []
  let sequence = 0
  const add = (input: Omit<Finding, 'id' | 'rule' | 'confidence' | 'requiresProfessionalReview'> & { confidence?: number; professional?: boolean }) => {
    const { confidence = 1, professional = false, ...finding } = input
    findings.push({ ...finding, id: `finding-${++sequence}`, rule: { id: input.code, version: CO_RULES_V1.version, regulatoryReference: null }, confidence, requiresProfessionalReview: professional })
  }
  const arithmetic = (code: string, title: string, path: string, actual: Decimal | null, expected: Decimal | null, evidenceIds: string[], severity: FindingSeverity = 'error') => {
    if (actual && expected && differs(actual, expected)) add({ code, category: 'arithmetic', severity, title, description: `El valor informado no coincide con el valor recalculado (tolerancia ${CO_RULES_V1.arithmeticTolerance}).`, factPaths: [path], evidenceIds, observed: actual.toString(), expected: expected.toString(), recommendation: 'Revisar valores fuente y reglas de redondeo del documento.' })
  }

  const kind = facts.document.kind.value ?? 'unknown'
  for (const [path, requirement] of Object.entries(CO_V1_FIELD_REQUIREMENTS[kind])) {
    if (context.sourceFormat === 'pdf' && path.startsWith('facts.technical.signature')) continue
    if (requirement === 'required' && !present(getPath(facts, path))) add({ code: 'CO-REQUIRED-FIELD-MISSING', category: 'completeness', severity: 'error', title: 'Campo obligatorio ausente', description: `No fue posible observar el campo ${path}.`, factPaths: [path], evidenceIds: [], observed: null, expected: 'present', recommendation: 'Verificar el XML original o completar la revisión manual.' })
  }
  facts.lines.forEach((line, index) => {
    const fields: Array<[string, Fact<unknown>]> = [['description', line.description], ['quantity', line.quantity], ['unitPrice', line.unitPrice], ['lineExtensionAmount', line.lineExtensionAmount]]
    fields.forEach(([name, fact]) => { if (fact.value === null) add({ code: 'CO-REQUIRED-LINE-FIELD-MISSING', category: 'completeness', severity: 'error', title: 'Campo obligatorio de línea ausente', description: `La línea ${line.id} no contiene ${name}.`, factPaths: [`facts.lines[${index}].${name}`], evidenceIds: fact.evidenceIds, observed: null, expected: 'present', recommendation: 'Revisar la línea en el documento original.' }) })
  })

  const calculatedLines = facts.lines.map((line, index) => {
    const quantity = decimal(line.quantity)
    const unitPrice = money(line.unitPrice)
    const expected = quantity && unitPrice ? quantity.multiply(unitPrice) : null
    arithmetic('CO-LINE-AMOUNT-MISMATCH', 'Valor de línea inconsistente', `facts.lines[${index}].lineExtensionAmount`, money(line.lineExtensionAmount), expected, line.lineExtensionAmount.evidenceIds)
    return money(line.lineExtensionAmount)
  })
  const lineExtension = sum(calculatedLines)
  arithmetic('CO-SUBTOTAL-MISMATCH', 'Subtotal inconsistente', 'facts.totals.lineExtension', money(facts.totals.lineExtension), lineExtension, facts.totals.lineExtension.evidenceIds)

  const reportedLineExtension = money(facts.totals.lineExtension) ?? lineExtension
  const allowances = money(facts.totals.allowances) ?? Decimal.zero()
  const charges = money(facts.totals.charges) ?? Decimal.zero()
  const taxExclusive = reportedLineExtension?.subtract(allowances).add(charges) ?? null
  arithmetic('CO-TAX-EXCLUSIVE-MISMATCH', 'Base antes de impuestos inconsistente', 'facts.totals.taxExclusive', money(facts.totals.taxExclusive), taxExclusive, facts.totals.taxExclusive.evidenceIds)

  facts.taxes.forEach((tax, index) => {
    const taxableAmount = money(tax.taxableAmount)
    const rate = decimal(tax.rate)
    const expected = taxableAmount && rate ? taxableAmount.percent(rate) : null
    arithmetic('CO-TAX-AMOUNT-MISMATCH', 'Impuesto o retención inconsistente', `facts.taxes[${index}].amount`, money(tax.amount), expected, tax.amount.evidenceIds)
  })
  const documentTaxes = facts.taxes.filter((tax) => tax.scope === 'document' && tax.isWithholding.value === false)
  const documentWithholdings = facts.taxes.filter((tax) => tax.scope === 'document' && tax.isWithholding.value === true)
  const taxAmount = sum(documentTaxes.map((tax) => money(tax.amount)))
  const withholding = sum(documentWithholdings.map((tax) => money(tax.amount)))
  arithmetic('CO-WITHHOLDING-TOTAL-MISMATCH', 'Total de retenciones inconsistente', 'facts.totals.withholding', money(facts.totals.withholding), withholding, facts.totals.withholding.evidenceIds)
  const taxInclusive = taxExclusive && taxAmount ? taxExclusive.add(taxAmount) : null
  arithmetic('CO-TAX-INCLUSIVE-MISMATCH', 'Total con impuestos inconsistente', 'facts.totals.taxInclusive', money(facts.totals.taxInclusive), taxInclusive, facts.totals.taxInclusive.evidenceIds)
  const prepaid = money(facts.totals.prepaid) ?? Decimal.zero()
  const payable = taxInclusive ? taxInclusive.subtract(withholding ?? Decimal.zero()).subtract(prepaid) : null
  arithmetic('CO-PAYABLE-MISMATCH', 'Total pagadero inconsistente', 'facts.totals.payable', money(facts.totals.payable), payable, facts.totals.payable.evidenceIds, 'warning')

  const isoDate = /^\d{4}-\d{2}-\d{2}$/
  const issueDate = facts.document.issueDate.value
  if (issueDate && (!isoDate.test(issueDate) || Number.isNaN(Date.parse(`${issueDate}T00:00:00Z`)))) add({ code: 'CO-ISSUE-DATE-FORMAT', category: 'structure', severity: 'error', title: 'Fecha de emisión inválida', description: 'La fecha de emisión no tiene formato ISO válido.', factPaths: ['facts.document.issueDate'], evidenceIds: facts.document.issueDate.evidenceIds, observed: issueDate, expected: 'YYYY-MM-DD', recommendation: 'Corregir la fecha de emisión.' })
  else if (issueDate && new Date(`${issueDate}T00:00:00Z`) > (context.now ?? new Date())) add({ code: 'CO-ISSUE-DATE-FUTURE', category: 'structure', severity: 'warning', title: 'Fecha de emisión futura', description: 'La fecha de emisión es posterior a la fecha de auditoría.', factPaths: ['facts.document.issueDate'], evidenceIds: facts.document.issueDate.evidenceIds, observed: issueDate, expected: `<= ${(context.now ?? new Date()).toISOString().slice(0, 10)}`, recommendation: 'Confirmar la fecha y la zona horaria del emisor.' })
  const dueDate = facts.document.paymentDueDate.value
  if (issueDate && dueDate && isoDate.test(issueDate) && isoDate.test(dueDate) && dueDate < issueDate) add({ code: 'CO-DUE-DATE-BEFORE-ISSUE', category: 'structure', severity: 'warning', title: 'Vencimiento anterior a emisión', description: 'La fecha de vencimiento precede la emisión.', factPaths: ['facts.document.issueDate', 'facts.document.paymentDueDate'], evidenceIds: [...facts.document.issueDate.evidenceIds, ...facts.document.paymentDueDate.evidenceIds], observed: dueDate, expected: `>= ${issueDate}`, recommendation: 'Revisar las condiciones de pago.' })
  if (facts.document.currency.value && !/^[A-Z]{3}$/.test(facts.document.currency.value)) add({ code: 'CO-CURRENCY-FORMAT', category: 'structure', severity: 'error', title: 'Código de moneda inválido', description: 'La moneda debe usar tres letras mayúsculas.', factPaths: ['facts.document.currency'], evidenceIds: facts.document.currency.evidenceIds, observed: facts.document.currency.value, expected: 'ISO 4217', recommendation: 'Corregir DocumentCurrencyCode.' })
  const issueTime = facts.document.issueTime.value
  if (issueTime && !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(issueTime)) add({ code: 'CO-ISSUE-TIME-FORMAT', category: 'structure', severity: 'error', title: 'Hora de emisión inválida', description: 'La hora de emisión no tiene un formato ISO válido.', factPaths: ['facts.document.issueTime'], evidenceIds: facts.document.issueTime.evidenceIds, observed: issueTime, expected: 'HH:mm:ss con zona horaria cuando aplique', recommendation: 'Corregir IssueTime.' })
  const uniqueCode = facts.document.uniqueCode.value
  if (uniqueCode && !/^[a-fA-F0-9]{96}$/.test(uniqueCode)) add({ code: 'CO-UNIQUE-CODE-FORMAT', category: 'identity', severity: 'error', title: 'CUFE o CUDE inválido', description: 'El identificador único no tiene el formato SHA-384 esperado.', factPaths: ['facts.document.uniqueCode'], evidenceIds: facts.document.uniqueCode.evidenceIds, observed: uniqueCode, expected: '96 caracteres hexadecimales', recommendation: 'Recalcular o verificar el CUFE/CUDE del XML.' })
  for (const [name, party] of [['supplier', facts.supplier], ['customer', facts.customer]] as const) {
    const id = party.taxId.value
    if (id && !/^\d{6,15}$/.test(id.replace(/[.\s-]/g, ''))) add({ code: 'CO-IDENTIFIER-FORMAT', category: 'identity', severity: 'error', title: 'Identificación inválida', description: `La identificación de ${name} contiene un formato no admitido.`, factPaths: [`facts.${name}.taxId`], evidenceIds: party.taxId.evidenceIds, observed: id, expected: '6 a 15 dígitos', recommendation: 'Confirmar tipo y número de identificación.' })
    const expectedDigit = id && party.identificationType.value === '31' ? colombianNitCheckDigit(id) : null
    if (expectedDigit && party.verificationDigit.value && party.verificationDigit.value !== expectedDigit) add({ code: 'CO-NIT-CHECK-DIGIT', category: 'identity', severity: 'error', title: 'Dígito de verificación de NIT inconsistente', description: `El dígito de verificación de ${name} no coincide con el NIT.`, factPaths: [`facts.${name}.taxId`, `facts.${name}.verificationDigit`], evidenceIds: [...party.taxId.evidenceIds, ...party.verificationDigit.evidenceIds], observed: party.verificationDigit.value, expected: expectedDigit, recommendation: 'Confirmar el NIT y su dígito de verificación.' })
  }
  const number = facts.document.number.value
  if (number && !/^[A-Za-z0-9-]{1,30}$/.test(number)) add({ code: 'CO-DOCUMENT-NUMBER-FORMAT', category: 'identity', severity: 'error', title: 'Número de factura inválido', description: 'El número contiene caracteres o longitud no admitidos.', factPaths: ['facts.document.number'], evidenceIds: facts.document.number.evidenceIds, observed: number, expected: '1-30 caracteres alfanuméricos o guion', recommendation: 'Revisar prefijo y consecutivo.' })
  if (context.duplicateDocumentId) add({ code: 'CO-DUPLICATE-DOCUMENT-NUMBER', category: 'identity', severity: 'critical', title: 'Número de factura duplicado', description: 'Ya existe otro documento del mismo emisor y número en la organización.', factPaths: ['facts.supplier.taxId', 'facts.document.number'], evidenceIds: [...facts.supplier.taxId.evidenceIds, ...facts.document.number.evidenceIds], observed: number, expected: 'unique per supplier and organization', recommendation: 'Revisar si se cargó la misma factura o si existe un consecutivo reutilizado.' })

  return { findings, rulesPackage: CO_RULES_V1, recalculated: { lineExtension: lineExtension?.toString() ?? null, taxExclusive: taxExclusive?.toString() ?? null, taxAmount: taxAmount?.toString() ?? null, withholding: withholding?.toString() ?? null, taxInclusive: taxInclusive?.toString() ?? null, payable: payable?.toString() ?? null } }
}
