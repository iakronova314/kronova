import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 })
  const { data: job } = await supabase.from('analysis_jobs').select('id,status,progress,attempt_count,max_attempts,error_code,document_id').eq('id', id).maybeSingle()
  if (!job) return NextResponse.json({ error: 'Trabajo no encontrado.' }, { status: 404 })
  const { data: result } = job.status === 'completed' ? await supabase.from('analysis_results').select('result').eq('job_id', id).maybeSingle() : { data: null }
  return NextResponse.json({ ...job, data: result?.result }, { headers: { 'Cache-Control': 'no-store' } })
}
