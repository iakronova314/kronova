import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { analyzeReview } from '@/modules/reviewsync/analyze-review'
import { sha256Base64Url } from './secrets'
import { connectionAccessToken, googleGet } from './google'

const stars: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }
type GoogleReview = { name: string; reviewId: string; reviewer?: { displayName?: string; isAnonymous?: boolean }; starRating: string; comment?: string; createTime: string; updateTime: string; reviewReply?: { comment?: string; updateTime?: string } }

export async function syncReviewLocation(locationId: string, tenantId: string) {
  const admin = createAdminClient(); const { data: location, error } = await admin.from('review_locations').select('*,review_connections!inner(id,status)').eq('id', locationId).eq('tenant_id', tenantId).eq('selected', true).single()
  if (error || !location) throw new Error('REVIEW_LOCATION_NOT_SELECTED')
  const connection = location.review_connections as unknown as { id: string; status: string }
  const run = await admin.from('review_sync_runs').insert({ tenant_id: tenantId, location_id: locationId, status: 'running' }).select('id').single()
  if (run.error) throw run.error
  await admin.from('review_locations').update({ sync_status: 'syncing', last_error: null }).eq('id', locationId)
  let pageToken = ''; let pageCount = 0; let imported = 0
  try {
    const token = await connectionAccessToken(connection.id)
    do {
      const suffix = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
      const response = await googleGet<{ reviews?: GoogleReview[]; nextPageToken?: string }>(`https://mybusiness.googleapis.com/v4/${location.external_location_id}/reviews?pageSize=50&orderBy=update_time%20desc${suffix}`, token)
      pageCount++
      for (const review of response.reviews ?? []) {
        const rating = stars[review.starRating] ?? 3; const insight = analyzeReview({ stars: rating, comment: review.comment ?? null, reviewerName: review.reviewer?.displayName ?? null })
        const { data: saved, error: saveError } = await admin.from('reviews').upsert({
          tenant_id: tenantId, location_id: locationId, provider: 'google_business_profile', external_review_id: review.reviewId,
          external_resource_name: review.name, star_rating: rating, comment: review.comment ?? null,
          reviewer_display_name: review.reviewer?.displayName ?? null, reviewer_anonymous: Boolean(review.reviewer?.isAnonymous),
          provider_created_at: review.createTime, provider_updated_at: review.updateTime, reply_text: review.reviewReply?.comment ?? null,
          reply_updated_at: review.reviewReply?.updateTime ?? null, sentiment: insight.sentiment, sentiment_score: insight.score,
          priority: insight.priority, content_expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(), available: true,
        }, { onConflict: 'tenant_id,provider,external_review_id' }).select('id').single()
        if (saveError) throw saveError
        const { data: draft } = await admin.from('review_reply_drafts').select('id').eq('review_id', saved.id).limit(1).maybeSingle()
        if (!draft && !review.reviewReply?.comment) await admin.from('review_reply_drafts').insert({
          tenant_id: tenantId, review_id: saved.id, version: 1, text: insight.suggestedReply, status: 'draft_generated',
          model_provider: 'kronova', model_name: 'review-response-rules-es@1.0.0', prompt_version: 'review-response@1.0.0', text_hash: await sha256Base64Url(insight.suggestedReply),
        })
        imported++
      }
      pageToken = response.nextPageToken ?? ''
    } while (pageToken && pageCount < 100)
    await admin.from('review_locations').update({ sync_status: 'idle', sync_cursor: null, last_synced_at: new Date().toISOString(), last_error: null }).eq('id', locationId)
    await admin.from('review_sync_runs').update({ status: 'completed', imported_count: imported, page_count: pageCount, completed_at: new Date().toISOString() }).eq('id', run.data.id)
    return { imported, pageCount }
  } catch (cause) {
    const message = (cause instanceof Error ? cause.message : 'SYNC_FAILED').slice(0, 500)
    await admin.from('review_locations').update({ sync_status: message.includes('invalid_grant') ? 'reauthorization_required' : 'error', last_error: message }).eq('id', locationId)
    await admin.from('review_sync_runs').update({ status: 'failed', error_code: message.split(':')[0], error_message: message, page_count: pageCount, completed_at: new Date().toISOString() }).eq('id', run.data.id)
    throw cause
  }
}
