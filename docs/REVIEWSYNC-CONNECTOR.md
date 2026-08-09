# ReviewSync Google Business Profile connector

The implementation follows `REVIEWSYNC-MVP-SCOPE.md`: Google Business Profile only, OAuth Authorization Code with PKCE, encrypted offline credentials, selected verified locations, 15-minute synchronization, and per-reply human approval.

## Runtime flow

1. An owner or administrator starts OAuth at `/api/reviewsync/oauth/start`.
2. The callback consumes a single-use hashed state, exchanges the code and encrypts the refresh token with AES-256-GCM.
3. Accessible accounts and locations are discovered; only verified locations can be selected.
4. Manual or scheduled synchronization calls `ListReviews`, paginates, and upserts by tenant, provider and review ID.
5. A deterministic baseline assigns sentiment and priority and creates a Spanish suggested response. Existing Google replies never receive a new draft.
6. An authorized user edits the exact text and confirms publication. KRONOVA versions and hashes the approval before calling `UpdateReviewReply`.
7. Publication attempts and Google responses are auditable. Failures are returned to human review and never automatically rewritten or published.

Google content expires after 30 days. The scheduled worker removes review text and reviewer display names when retention expires. Refresh tokens, OAuth verifier values and client secrets are server-only and never returned by an API.

## Configuration

- `GOOGLE_BUSINESS_CLIENT_ID`
- `GOOGLE_BUSINESS_CLIENT_SECRET`
- `REVIEWSYNC_TOKEN_ENCRYPTION_KEY`: base64-encoded 32-byte random key, unique per environment
- `NEXT_PUBLIC_SITE_URL`
- `CRON_SECRET`

Register the exact callback `<site>/api/reviewsync/oauth/callback` in Google Cloud. Production remains blocked until Google grants basic Business Profile API access and a non-zero quota.
