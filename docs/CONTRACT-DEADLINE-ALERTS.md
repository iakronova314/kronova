# Contract deadline alerts

LeaseReader persists normalized dates in `contract_deadlines` and derives email alerts 30, 7 and 1 day before each future deadline. Contract start, contract end, renewal notice deadlines and rent-increase dates are supported. Dates are scheduled for 09:00 America/Bogota (14:00 UTC).

## Delivery lifecycle

1. Report processing upserts deadlines and cancels obsolete deadline rows.
2. Owner and administrator email addresses receive independently idempotent alert rows.
3. `/api/internal/alerts/process` atomically claims due email work with `FOR UPDATE SKIP LOCKED`.
4. Resend receives a stable `Idempotency-Key`, preventing duplicate sends during retries.
5. Each attempt is recorded in `alert_deliveries`; `alerts` retains latest status and error.
6. Failures retry with exponential backoff up to five attempts, then become `failed`.

The worker requires `CRON_SECRET`, `ALERT_EMAIL_ENABLED=true`, `RESEND_API_KEY`, and a verified `ALERT_EMAIL_FROM`. Vercel invokes it every five minutes. The email contains no contract excerpt or sensitive party data.

## WhatsApp

WhatsApp is intentionally not claimed or sent. The schema already supports the channel, but activation is deferred until email delivery rates, bounce handling, retries and operational monitoring are stable. Adding it later requires a provider-specific consent and template policy.
