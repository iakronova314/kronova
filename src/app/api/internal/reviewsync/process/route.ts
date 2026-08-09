import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncReviewLocation } from '@/lib/server/reviewsync/sync-reviews'

export const maxDuration = 300
async function run(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  const admin = createAdminClient(); const cutoff = new Date(Date.now() - 15 * 60_000).toISOString()
  const { data: locations } = await admin.from('review_locations').select('id,tenant_id').eq('selected', true).or(`last_synced_at.is.null,last_synced_at.lt.${cutoff}`).limit(5)
  const outcomes: Array<{ id: string; status: string }> = []
  for (const location of locations ?? []) {
    try { await syncReviewLocation(location.id, location.tenant_id); outcomes.push({ id: location.id, status: 'completed' }) }
    catch { outcomes.push({ id: location.id, status: 'failed' }) }
  }
  await admin.from('reviews').update({ available: false, comment: null, reviewer_display_name: null }).lt('content_expires_at', new Date().toISOString()).eq('available', true)
  return NextResponse.json({ claimed: locations?.length ?? 0, outcomes })
}
export const GET = run
export const POST = run
