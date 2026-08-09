import assert from 'node:assert/strict'
import test from 'node:test'
import {
  REVIEWSYNC_AUTOMATIC_PUBLISHING, REVIEWSYNC_CONTENT_RETENTION_DAYS, REVIEWSYNC_GOOGLE_SCOPE,
  REVIEWSYNC_INITIAL_PLATFORMS, REVIEWSYNC_PUBLISH_MODE, REVIEWSYNC_SCOPE_VERSION, REVIEWSYNC_SYNC_INTERVAL_MINUTES,
} from '../src/modules/reviewsync/scope.ts'
import { analyzeReview } from '../src/modules/reviewsync/analyze-review.ts'

test('closes ReviewSync MVP to Google Business Profile', () => {
  assert.equal(REVIEWSYNC_SCOPE_VERSION, '1.0.0')
  assert.deepEqual(REVIEWSYNC_INITIAL_PLATFORMS, ['google_business_profile'])
  assert.equal(REVIEWSYNC_GOOGLE_SCOPE, 'https://www.googleapis.com/auth/business.manage')
})

test('requires per-reply human approval and bounded synchronization', () => {
  assert.equal(REVIEWSYNC_AUTOMATIC_PUBLISHING, false)
  assert.equal(REVIEWSYNC_PUBLISH_MODE, 'human_approval_per_reply')
  assert.equal(REVIEWSYNC_SYNC_INTERVAL_MINUTES, 15)
  assert.equal(REVIEWSYNC_CONTENT_RETENTION_DAYS, 30)
})

test('classifies sentiment and generates a bounded suggested response', () => {
  const negative = analyzeReview({ stars: 1, comment: 'Pésimo servicio y mucha demora', reviewerName: 'Ana' })
  assert.equal(negative.sentiment, 'negative')
  assert.equal(negative.priority, 'urgent')
  assert.match(negative.suggestedReply, /Lamentamos/)
  const positive = analyzeReview({ stars: 5, comment: 'Excelente y muy amable', reviewerName: null })
  assert.equal(positive.sentiment, 'positive')
  assert.match(positive.suggestedReply, /Gracias/)
})
