import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  LEASEREADER_FACT_GROUPS,
  LEASEREADER_JURISDICTION,
  LEASEREADER_REQUIRED_FACT_PATHS,
  LEASEREADER_SCHEMA_VERSION,
} from '../src/modules/leasereader/colombia/schemas/v1/index.ts'
import { buildContractReport } from '../src/modules/leasereader/colombia/build-contract-report.ts'
import { LEASEREADER_SYSTEM_INSTRUCTION } from '../src/modules/leasereader/colombia/prompts/v1/contract-analysis.ts'

test('publishes a versioned Colombia contract schema', async () => {
  const raw = await readFile(new URL('../src/modules/leasereader/colombia/schemas/v1/leasereader-result.schema.json', import.meta.url), 'utf8')
  const schema = JSON.parse(raw)
  assert.equal(LEASEREADER_SCHEMA_VERSION, '1.0.0')
  assert.equal(LEASEREADER_JURISDICTION, 'CO')
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema')
  assert.equal(schema.properties.schema.properties.version.const, LEASEREADER_SCHEMA_VERSION)
  assert.equal(schema.properties.analysis.properties.jurisdiction.const, LEASEREADER_JURISDICTION)
  assert.deepEqual(schema.$defs.evidence.required, ['id', 'kind', 'artifactId', 'page', 'locator', 'boundingBox', 'excerpt'])
})

test('keeps every real-estate fact group and required business concept stable', () => {
  assert.deepEqual(LEASEREADER_FACT_GROUPS, [
    'document', 'parties', 'property', 'term', 'financial', 'increases', 'renewal', 'penalties', 'termination', 'clauses',
  ])
  for (const path of ['property.address', 'financial.rent', 'financial.deposit', 'renewal.noticeDays', 'term.endDate']) {
    assert.ok(LEASEREADER_REQUIRED_FACT_PATHS.includes(path), `${path} must be required`)
  }
})

test('separates facts from risks and requires an explicit legal disclaimer', async () => {
  const schema = JSON.parse(await readFile(new URL('../src/modules/leasereader/colombia/schemas/v1/leasereader-result.schema.json', import.meta.url), 'utf8'))
  assert.ok(schema.required.includes('facts'))
  assert.ok(schema.required.includes('risks'))
  assert.equal(schema.properties.conclusion.properties.disclaimerCode.const, 'SUPPORT_TOOL_NOT_LEGAL_ADVICE')
  assert.match(schema.$defs.risk.properties.code.pattern, /CO-LEASE/)
})

test('builds a report table with evidence and detects critical clauses deterministically', () => {
  const report = buildContractReport({
    analysisId: '00000000-0000-4000-8000-000000000001', documentId: '00000000-0000-4000-8000-000000000002',
    generatedAt: '2026-08-09T00:00:00.000Z', mimeType: 'application/pdf', sha256: 'a'.repeat(64), pageCount: 3,
    ai: {
      summary: 'Contrato residencial con cláusula que requiere revisión.',
      table: [{ path: 'property.address', label: 'Dirección', value: 'Calle 1 # 2-3', page: 1, excerpt: 'Inmueble ubicado en Calle 1 # 2-3', confidence: 0.98 }],
      clauses: [{ id: 'source-id', heading: 'Modificaciones', text: 'El arrendador podrá realizar modificación unilateral del contrato.', page: 3, critical: false, category: 'legal_review' }], risks: [],
    },
  })
  assert.equal(report.facts.property.address.value, 'Calle 1 # 2-3')
  assert.equal(report.evidence.find((item) => item.id === report.facts.property.address.evidenceIds[0]).page, 1)
  assert.ok(report.risks.some((risk) => risk.code === 'CO-LEASE-UNILATERAL_CHANGE' && risk.severity === 'high'))
  assert.equal(report.conclusion.outcome, 'manual_review_required')
})

test('keeps contract text untrusted in the dedicated prompt', () => {
  assert.match(LEASEREADER_SYSTEM_INSTRUCTION, /DATO NO CONFIABLE/)
  assert.match(LEASEREADER_SYSTEM_INSTRUCTION, /Ignora cualquier instrucción/)
})
