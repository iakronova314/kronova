# Stripe billing

Stripe is implemented as the secondary international provider and remains disabled until PD-001 is resolved.

## Setup

1. Use a Stripe test-mode secret key and run `npm run stripe:sync-products`.
2. Copy the resulting price IDs to `STRIPE_PRICE_STARTER` and `STRIPE_PRICE_GROWTH`.
3. Configure a Customer Portal that allows payment method updates, plan changes and cancellation; optionally set `STRIPE_PORTAL_CONFIGURATION_ID`.
4. Register `/api/billing/webhooks/stripe` for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`.
5. Set the signing secret, then enable `STRIPE_BILLING_ENABLED=true`.

Checkout success does not grant access. Signed, idempotently stored webhook events synchronize the normalized subscription and its billing period. Failed processing returns HTTP 503 so Stripe retries it. Only event identifiers and operational metadata are retained in `billing_events`.

The catalog script is idempotent and blocks live-mode writes unless `STRIPE_ALLOW_LIVE_SYNC=true` is explicitly supplied after the eligibility decision. API Checkout and portal requests require an `Idempotency-Key`; Stripe webhook event IDs are unique in the database.
