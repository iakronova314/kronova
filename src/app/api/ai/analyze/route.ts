import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'

const SUPPORTED_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash-lite'] as const
const DEFAULT_MODEL = SUPPORTED_MODELS[0]
const MAX_TEXT_LENGTH = 200_000

type SupportedModel = (typeof SUPPORTED_MODELS)[number]

function isSupportedModel(model: unknown): model is SupportedModel {
  return typeof model === 'string' && SUPPORTED_MODELS.includes(model as SupportedModel)
}

function getErrorStatus(error: unknown) {
  if (typeof error !== 'object' || error === null || !('status' in error)) return undefined
  return typeof error.status === 'number' ? error.status : undefined
}

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY no está configurada.')
      return NextResponse.json(
        { success: false, error: 'El servicio de IA no está configurado.' },
        { status: 503 },
      )
    }

    const body: unknown = await req.json()
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ success: false, error: 'Solicitud inválida.' }, { status: 400 })
    }

    const { textContent, model } = body as { textContent?: unknown; model?: unknown }
    if (typeof textContent !== 'string' || !textContent.trim()) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó texto.' },
        { status: 400 },
      )
    }

    if (textContent.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { success: false, error: 'El documento supera el límite de 200.000 caracteres.' },
        { status: 413 },
      )
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const response = await ai.models.generateContent({
      model: isSupportedModel(model) ? model : DEFAULT_MODEL,
      contents: `Analiza el siguiente documento y genera un resumen clave.\n\n${textContent}`,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          properties: {
            resumen: { type: 'string' },
            puntos_clave: { type: 'array', items: { type: 'string' } },
            riesgos: { type: 'array', items: { type: 'string' } },
          },
          required: ['resumen', 'puntos_clave', 'riesgos'],
          additionalProperties: false,
        },
      },
    })

    if (!response.text) throw new Error('Gemini devolvió una respuesta vacía.')
    return NextResponse.json({ success: true, data: JSON.parse(response.text) })
  } catch (error: unknown) {
    const status = getErrorStatus(error)
    const message = error instanceof Error ? error.message : 'Error procesando la solicitud'

    if (status === 429 || message.includes('429')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Límite de peticiones alcanzado. Espera unos segundos y vuelve a intentar.',
        },
        { status: 429 },
      )
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'La solicitud o la respuesta de IA no contiene JSON válido.' },
        { status: 422 },
      )
    }

    console.error('Error en servidor Gemini:', error)
    return NextResponse.json(
      { success: false, error: status === 404 ? 'El modelo de IA no está disponible.' : message },
      { status: status && status >= 400 && status < 600 ? status : 500 },
    )
  }
}
