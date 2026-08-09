export const REVIEWSYNC_SCOPE_VERSION = '1.0.0' as const
export const REVIEWSYNC_INITIAL_PLATFORMS = ['google_business_profile'] as const
export const REVIEWSYNC_GOOGLE_SCOPE = 'https://www.googleapis.com/auth/business.manage' as const
export const REVIEWSYNC_SYNC_INTERVAL_MINUTES = 15 as const
export const REVIEWSYNC_CONTENT_RETENTION_DAYS = 30 as const
export const REVIEWSYNC_PUBLISH_MODE = 'human_approval_per_reply' as const
export const REVIEWSYNC_AUTOMATIC_PUBLISHING = false as const

export type ReviewSyncPlatform = (typeof REVIEWSYNC_INITIAL_PLATFORMS)[number]
export type ReviewSyncReplyState = 'synced' | 'draft_generated' | 'edited_optional' | 'approved' | 'publishing' | 'published' | 'failed'
export type ReviewSyncConnectionState = 'active' | 'reauthorization_required' | 'revoked' | 'error'
