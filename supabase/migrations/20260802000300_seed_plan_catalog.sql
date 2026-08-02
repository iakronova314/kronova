-- Initial commercial catalog approved in MVP-SCOPE-COLOMBIA.md.
-- USD values are references until fixed COP launch prices are approved.

insert into public.plans (
  code,
  name,
  description,
  currency,
  unit_amount,
  billing_interval,
  document_limit,
  user_limit,
  retention_days,
  api_access,
  trial_days,
  is_active,
  metadata
)
values
  (
    'trial',
    'Free trial',
    'Evaluation access for DocAudit Colombia.',
    'USD',
    0,
    'month',
    20,
    2,
    90,
    false,
    14,
    true,
    '{"commercial_status":"planned"}'::jsonb
  ),
  (
    'docaudit_starter',
    'DocAudit Starter',
    'Initial plan for small Colombian teams.',
    'USD',
    2900,
    'month',
    300,
    3,
    90,
    false,
    0,
    true,
    '{"commercial_status":"planned","country":"CO"}'::jsonb
  ),
  (
    'docaudit_growth',
    'DocAudit Growth',
    'Higher-volume plan with planned integration access.',
    'USD',
    5900,
    'month',
    1000,
    10,
    90,
    true,
    0,
    true,
    '{"commercial_status":"planned","country":"CO"}'::jsonb
  )
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  currency = excluded.currency,
  unit_amount = excluded.unit_amount,
  billing_interval = excluded.billing_interval,
  document_limit = excluded.document_limit,
  user_limit = excluded.user_limit,
  retention_days = excluded.retention_days,
  api_access = excluded.api_access,
  trial_days = excluded.trial_days,
  is_active = excluded.is_active,
  metadata = excluded.metadata,
  updated_at = now();
