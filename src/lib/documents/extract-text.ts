import { XMLParser, XMLValidator } from 'fast-xml-parser'

export interface ExtractedPage { page: number; text: string; characterCount: number }
export interface ExtractionResult {
  status: 'completed' | 'ocr_required'
  method: 'plain_text' | 'structured_text' | 'pdf_digital' | 'pdf_scanned'
  text: string
  pages: ExtractedPage[]
  metadata: Record<string, unknown>
  pageCount: number
}

const normalize = (value: string) => value.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
const decode = (bytes: Uint8Array) => new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '')

function singlePage(text: string, method: ExtractionResult['method'], metadata: Record<string, unknown> = {}): ExtractionResult {
  const normalized = normalize(text)
  return { status: 'completed', method, text: normalized, pages: [{ page: 1, text: normalized, characterCount: normalized.length }], metadata, pageCount: 1 }
}

function xmlText(value: unknown, output: string[]) {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') output.push(String(value))
  else if (Array.isArray(value)) value.forEach((item) => xmlText(item, output))
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => xmlText(item, output))
}

async function extractPdf(bytes: Uint8Array): Promise<ExtractionResult> {
  // pdfjs-dist disables real workers in Node, but its fallback dynamically imports
  // pdf.worker.mjs. Next/Turbopack cannot resolve that relative import once bundled,
  // so preload the handler that PDF.js explicitly supports for its fake worker.
  const pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs')
  Object.assign(globalThis, { pdfjsWorker })
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const loadingTask = pdfjs.getDocument({ data: bytes, useWorkerFetch: false })
  const document = await loadingTask.promise
  const pages: ExtractedPage[] = []
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = normalize(content.items.map((item) => 'str' in item ? item.str : '').join(' '))
    pages.push({ page: pageNumber, text, characterCount: text.length })
    page.cleanup()
  }
  const text = normalize(pages.map((page) => page.text).join('\n\n'))
  const scanned = text.replace(/\s/g, '').length < Math.max(5, document.numPages * 5)
  const rawMetadata = await document.getMetadata().catch(() => null)
  const metadata = { pdfVersion: rawMetadata?.info && 'PDFFormatVersion' in rawMetadata.info ? rawMetadata.info.PDFFormatVersion : undefined, scannedCandidate: scanned }
  await loadingTask.destroy()
  return { status: scanned ? 'ocr_required' : 'completed', method: scanned ? 'pdf_scanned' : 'pdf_digital', text, pages, metadata, pageCount: pages.length }
}

export async function extractText(bytes: Uint8Array, mimeType: string, fileName: string): Promise<ExtractionResult> {
  if (mimeType === 'application/pdf') return extractPdf(bytes)
  const raw = decode(bytes)
  if (mimeType === 'application/json') {
    const parsed: unknown = JSON.parse(raw)
    return singlePage(JSON.stringify(parsed, null, 2), 'structured_text', { format: 'json' })
  }
  if (mimeType === 'application/xml' || mimeType === 'text/xml') {
    if (/<!DOCTYPE|<!ENTITY/i.test(raw)) throw new Error('XML_DTD_NOT_ALLOWED')
    const validation = XMLValidator.validate(raw, { allowBooleanAttributes: false })
    if (validation !== true) throw new Error('INVALID_XML')
    const parser = new XMLParser({ ignoreAttributes: false, processEntities: false, maxNestedTags: 100, trimValues: true })
    const parsed = parser.parse(raw) as unknown
    const output: string[] = []
    xmlText(parsed, output)
    const root = raw.match(/^\s*(?:<\?xml[^>]*>\s*)?<([\w:.-]+)/)?.[1]
    return singlePage(output.join('\n'), 'structured_text', { format: 'xml', rootElement: root })
  }
  return singlePage(raw, mimeType === 'text/csv' ? 'structured_text' : 'plain_text', { format: fileName.split('.').pop()?.toLowerCase() })
}
