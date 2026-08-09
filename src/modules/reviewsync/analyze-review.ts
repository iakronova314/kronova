export type ReviewInsight = { sentiment: 'positive' | 'neutral' | 'negative'; score: number; priority: 'low' | 'normal' | 'high' | 'urgent'; suggestedReply: string }
export function analyzeReview(input: { stars: number; comment: string | null; reviewerName: string | null }): ReviewInsight {
  const text = (input.comment ?? '').toLowerCase(); const positive = ['excelente','bueno','amable','recomiendo','great','excellent','love'].filter((word) => text.includes(word)).length
  const negative = ['malo','pésimo','terrible','demora','queja','bad','worst','rude'].filter((word) => text.includes(word)).length
  const score = Math.max(-1, Math.min(1, (input.stars - 3) / 2 + (positive - negative) * 0.15))
  const sentiment = score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral'
  const priority = input.stars <= 1 ? 'urgent' : input.stars <= 2 ? 'high' : sentiment === 'negative' ? 'high' : input.stars === 3 ? 'normal' : 'low'
  const name = input.reviewerName?.trim() ? `, ${input.reviewerName.trim()}` : ''
  const suggestedReply = sentiment === 'positive' ? `Gracias${name} por compartir tu experiencia. Nos alegra saber que tu visita fue positiva y esperamos atenderte nuevamente.` : sentiment === 'negative' ? `Hola${name}. Lamentamos que tu experiencia no haya cumplido tus expectativas. Queremos revisar lo ocurrido y encontrar una solución; por favor contáctanos por nuestros canales oficiales.` : `Gracias${name} por compartir tus comentarios. Los tendremos en cuenta para seguir mejorando nuestro servicio.`
  return { sentiment, score: Number(score.toFixed(4)), priority, suggestedReply }
}
