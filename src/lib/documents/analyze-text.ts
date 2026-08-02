import { GoogleGenAI } from '@google/genai'

export async function analyzeText(text: string) {
  if (!process.env.GEMINI_API_KEY) throw new Error('AI_NOT_CONFIGURED')
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: `Analiza el siguiente documento y genera un resumen clave.\n\n${text.slice(0, 200_000)}`,
    config: {
      httpOptions: { timeout: 60_000 }, responseMimeType: 'application/json',
      responseJsonSchema: {
        type: 'object', properties: {
          resumen: { type: 'string' }, puntos_clave: { type: 'array', items: { type: 'string' } },
          riesgos: { type: 'array', items: { type: 'string' } },
        }, required: ['resumen', 'puntos_clave', 'riesgos'], additionalProperties: false,
      },
    },
  })
  if (!response.text) throw new Error('EMPTY_AI_RESPONSE')
  return { result: JSON.parse(response.text) as Record<string, unknown>, model: response.modelVersion ?? 'gemini-3.6-flash', usage: response.usageMetadata }
}
