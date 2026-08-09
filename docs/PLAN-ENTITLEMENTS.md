# Plan entitlements

Capabilities are derived from `plans.metadata.modules` and the effective state of a normalized `subscriptions` row. The legacy `tenants.plan` label is display-only and never grants access.

- New organizations receive one explicit 14-day `trial` subscription.
- Only `trialing` and `active` subscriptions inside their period grant modules and document quota.
- A trial additionally requires `trial_ends_at > now()`.
- `past_due`, `paused`, `canceled`, `expired`, missing, or elapsed subscriptions grant no modules.
- Stripe webhooks replace the automatic manual trial when a paid subscription becomes current.
- Module authorization and quota are enforced server-side; the dashboard lock state is informational and uses the same resolver.

Current MVP plans grant `docaudit`. `leasereader` and `reviewsync` stay locked until their plan metadata explicitly includes them.
