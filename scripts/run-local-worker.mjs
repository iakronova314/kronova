import nextEnv from '@next/env'

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd())

const secret = process.env.CRON_SECRET
const origin = (process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const intervalMs = 3_000

if (!secret || secret.length < 32) {
  console.error('Falta CRON_SECRET o tiene menos de 32 caracteres en .env.local.')
  process.exit(1)
}

console.log(`Worker local de KRONOVA activo en ${origin}. Presiona Ctrl+C para detenerlo.`)

let stopped = false
process.on('SIGINT', () => { stopped = true })
process.on('SIGTERM', () => { stopped = true })

while (!stopped) {
  try {
    const response = await fetch(`${origin}/api/internal/jobs/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`)
    if (result.claimed > 0) {
      console.log(`[${new Date().toLocaleTimeString('es-CO')}] Procesados: ${result.claimed}; resultado: ${(result.outcomes || []).join(', ')}`)
      continue
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString('es-CO')}] Worker: ${error instanceof Error ? error.message : 'error desconocido'}`)
  }
  await new Promise((resolve) => setTimeout(resolve, intervalMs))
}

console.log('Worker local detenido.')
