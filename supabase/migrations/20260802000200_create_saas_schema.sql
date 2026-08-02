-- Core multi-tenant SaaS and document-processing schema.

set lock_timeout = '10s';
set statement_timeout = '120s';

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tenant_member_role') then
    create type public.tenant_member_role as enum ('owner', 'admin', 'analyst', 'viewer');
  end if;
  if not exists (select 1 from pg_type where typname = 'tenant_member_status') then
    create type public.tenant_member_status as enum ('invited', 'active', 'suspended');
  end if;
  if not exists (select 1 from pg_type where typname = 'billing_provider') then
    create type public.billing_provider as enum ('stripe', 'mercado_pago', 'wompi', 'manual');
  end if;
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum (
      'trialing', 'active', 'past_due', 'paused', 'canceled', 'expired'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'document_module') then
    create type public.document_module as enum ('docaudit', 'leasereader', 'reviewsync');
  end if;
  if not exists (select 1 from pg_type where typname = 'document_status') then
    create type public.document_status as enum (
      'pending_upload', 'uploaded', 'queued', 'processing', 'completed', 'failed', 'deleted'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'job_status') then
    create type public.job_status as enum (
      'queued', 'processing', 'retrying', 'completed', 'failed', 'canceled'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'alert_channel') then
    create type public.alert_channel as enum ('email', 'whatsapp', 'in_app', 'webhook');
  end if;
  if not exists (select 1 from pg_type where typname = 'alert_status') then
    create type public.alert_status as enum ('scheduled', 'processing', 'sent', 'failed', 'canceled');
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.tenant_member_role not null default 'analyst',
  status public.tenant_member_status not null default 'active',
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create table if not exists public.plans (
  code text primary key,
  name text not null,
  description text,
  currency text not null,
  unit_amount integer not null,
  billing_interval text not null default 'month',
  document_limit integer not null,
  user_limit integer not null,
  retention_days integer not null,
  api_access boolean not null default false,
  trial_days integer not null default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plans_code_format check (code ~ '^[a-z0-9_]+$'),
  constraint plans_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint plans_unit_amount_nonnegative check (unit_amount >= 0),
  constraint plans_document_limit_positive check (document_limit > 0),
  constraint plans_user_limit_positive check (user_limit > 0),
  constraint plans_retention_days_positive check (retention_days > 0),
  constraint plans_trial_days_nonnegative check (trial_days >= 0),
  constraint plans_billing_interval_check check (billing_interval in ('month', 'year'))
);

create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider public.billing_provider not null,
  external_customer_id text not null,
  email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, provider),
  unique (provider, external_customer_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_code text not null references public.plans(code),
  billing_customer_id uuid,
  provider public.billing_provider not null,
  external_subscription_id text,
  status public.subscription_status not null default 'trialing',
  currency text not null,
  unit_amount integer not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  provider_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  constraint subscriptions_billing_customer_tenant_fkey
    foreign key (tenant_id, billing_customer_id)
    references public.billing_customers (tenant_id, id),
  constraint subscriptions_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint subscriptions_unit_amount_nonnegative check (unit_amount >= 0),
  constraint subscriptions_period_order check (
    current_period_start is null
    or current_period_end is null
    or current_period_end > current_period_start
  )
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider public.billing_provider not null,
  external_event_id text not null,
  event_type text not null,
  tenant_id uuid references public.tenants(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  processing_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, external_event_id)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  module public.document_module not null default 'docaudit',
  jurisdiction text not null default 'CO',
  original_name text not null,
  bucket_name text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  sha256 text,
  status public.document_status not null default 'pending_upload',
  metadata jsonb not null default '{}'::jsonb,
  retention_until timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (bucket_name, storage_path),
  constraint documents_jurisdiction_format check (jurisdiction ~ '^[A-Z]{2}$'),
  constraint documents_size_positive check (size_bytes > 0),
  constraint documents_sha256_format check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$')
);

create table if not exists public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  document_id uuid not null,
  requested_by uuid references auth.users(id) on delete set null,
  job_type text not null,
  status public.job_status not null default 'queued',
  progress smallint not null default 0,
  attempt_count smallint not null default 0,
  max_attempts smallint not null default 3,
  idempotency_key text not null,
  correlation_id uuid not null default gen_random_uuid(),
  schema_version text not null,
  input_options jsonb not null default '{}'::jsonb,
  locked_by text,
  locked_until timestamptz,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, document_id, id),
  unique (tenant_id, idempotency_key),
  constraint analysis_jobs_document_tenant_fkey
    foreign key (tenant_id, document_id)
    references public.documents (tenant_id, id)
    on delete cascade,
  constraint analysis_jobs_progress_range check (progress between 0 and 100),
  constraint analysis_jobs_attempts_nonnegative check (attempt_count >= 0),
  constraint analysis_jobs_max_attempts_positive check (max_attempts > 0),
  constraint analysis_jobs_attempt_limit check (attempt_count <= max_attempts)
);

create table if not exists public.analysis_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  document_id uuid not null,
  job_id uuid not null unique,
  schema_version text not null,
  result jsonb not null,
  summary text,
  confidence numeric(5, 4),
  model_provider text,
  model_name text,
  model_version text,
  prompt_version text,
  rules_version text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now(),
  constraint analysis_results_job_tenant_fkey
    foreign key (tenant_id, document_id, job_id)
    references public.analysis_jobs (tenant_id, document_id, id)
    on delete cascade,
  constraint analysis_results_confidence_range check (
    confidence is null or confidence between 0 and 1
  ),
  constraint analysis_results_input_tokens_nonnegative check (
    input_tokens is null or input_tokens >= 0
  ),
  constraint analysis_results_output_tokens_nonnegative check (
    output_tokens is null or output_tokens >= 0
  )
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  subscription_id uuid,
  document_id uuid,
  job_id uuid,
  event_type text not null,
  units bigint not null default 1,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key),
  constraint usage_events_subscription_tenant_fkey
    foreign key (tenant_id, subscription_id)
    references public.subscriptions (tenant_id, id),
  constraint usage_events_document_tenant_fkey
    foreign key (tenant_id, document_id)
    references public.documents (tenant_id, id),
  constraint usage_events_job_tenant_fkey
    foreign key (tenant_id, document_id, job_id)
    references public.analysis_jobs (tenant_id, document_id, id),
  constraint usage_events_job_requires_document check (
    job_id is null or document_id is not null
  ),
  constraint usage_events_units_positive check (units > 0)
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  document_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  module public.document_module not null,
  channel public.alert_channel not null,
  status public.alert_status not null default 'scheduled',
  recipient text,
  subject text,
  template_key text not null,
  template_data jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null,
  attempt_count smallint not null default 0,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint alerts_document_tenant_fkey
    foreign key (tenant_id, document_id)
    references public.documents (tenant_id, id)
    on delete cascade,
  constraint alerts_attempt_count_nonnegative check (attempt_count >= 0)
);

-- Preserve current tenant assignments by creating canonical memberships.
insert into public.tenant_members (tenant_id, user_id, role, status, joined_at)
select
  p.tenant_id,
  p.id,
  case lower(coalesce(p.role, 'analyst'))
    when 'owner' then 'owner'::public.tenant_member_role
    when 'admin' then 'admin'::public.tenant_member_role
    when 'viewer' then 'viewer'::public.tenant_member_role
    else 'analyst'::public.tenant_member_role
  end,
  'active'::public.tenant_member_status,
  coalesce(p.created_at, now())
from public.profiles p
where p.tenant_id is not null
on conflict (tenant_id, user_id) do nothing;

create unique index if not exists subscriptions_external_id_key
  on public.subscriptions (provider, external_subscription_id)
  where external_subscription_id is not null;

create unique index if not exists subscriptions_one_current_per_tenant_idx
  on public.subscriptions (tenant_id)
  where status in ('trialing', 'active', 'past_due', 'paused');

create index if not exists tenant_members_user_id_idx
  on public.tenant_members (user_id, status);

create index if not exists subscriptions_tenant_status_idx
  on public.subscriptions (tenant_id, status);

create index if not exists subscriptions_period_end_idx
  on public.subscriptions (current_period_end)
  where status in ('trialing', 'active', 'past_due');

create index if not exists billing_events_unprocessed_idx
  on public.billing_events (received_at)
  where processed_at is null;

create index if not exists documents_tenant_created_idx
  on public.documents (tenant_id, created_at desc);

create index if not exists documents_tenant_status_idx
  on public.documents (tenant_id, status);

create index if not exists documents_tenant_sha256_idx
  on public.documents (tenant_id, sha256)
  where sha256 is not null and deleted_at is null;

create index if not exists documents_retention_idx
  on public.documents (retention_until)
  where deleted_at is null and retention_until is not null;

create index if not exists analysis_jobs_tenant_created_idx
  on public.analysis_jobs (tenant_id, created_at desc);

create index if not exists analysis_jobs_queue_idx
  on public.analysis_jobs (status, queued_at)
  where status in ('queued', 'retrying');

create index if not exists analysis_jobs_lease_idx
  on public.analysis_jobs (locked_until)
  where status = 'processing';

create index if not exists analysis_results_tenant_created_idx
  on public.analysis_results (tenant_id, created_at desc);

create index if not exists analysis_results_document_id_idx
  on public.analysis_results (document_id);

create index if not exists usage_events_tenant_occurred_idx
  on public.usage_events (tenant_id, occurred_at desc);

create index if not exists usage_events_subscription_idx
  on public.usage_events (subscription_id, occurred_at)
  where subscription_id is not null;

create index if not exists alerts_due_idx
  on public.alerts (scheduled_for)
  where status = 'scheduled';

create index if not exists alerts_tenant_created_idx
  on public.alerts (tenant_id, created_at desc);

drop trigger if exists set_tenants_updated_at on public.tenants;
create trigger set_tenants_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_tenant_members_updated_at on public.tenant_members;
create trigger set_tenant_members_updated_at
before update on public.tenant_members
for each row execute function public.set_updated_at();

drop trigger if exists set_plans_updated_at on public.plans;
create trigger set_plans_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

drop trigger if exists set_billing_customers_updated_at on public.billing_customers;
create trigger set_billing_customers_updated_at
before update on public.billing_customers
for each row execute function public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

drop trigger if exists set_analysis_jobs_updated_at on public.analysis_jobs;
create trigger set_analysis_jobs_updated_at
before update on public.analysis_jobs
for each row execute function public.set_updated_at();

drop trigger if exists set_alerts_updated_at on public.alerts;
create trigger set_alerts_updated_at
before update on public.alerts
for each row execute function public.set_updated_at();

alter table public.tenant_members enable row level security;
alter table public.plans enable row level security;
alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;
alter table public.documents enable row level security;
alter table public.analysis_jobs enable row level security;
alter table public.analysis_results enable row level security;
alter table public.usage_events enable row level security;
alter table public.alerts enable row level security;

comment on table public.tenant_members is 'Canonical many-to-many membership and role per tenant.';
comment on table public.plans is 'Versioned application plan catalog; prices are stored in minor currency units.';
comment on table public.billing_customers is 'Provider-neutral mapping between a tenant and billing customers.';
comment on table public.subscriptions is 'Normalized subscription state used to grant application access.';
comment on table public.billing_events is 'Idempotent payment webhook inbox. Payload retention must be limited.';
comment on table public.documents is 'Private document metadata; file bytes live in Supabase Storage.';
comment on table public.analysis_jobs is 'Asynchronous, retryable document-processing jobs.';
comment on table public.analysis_results is 'Versioned structured outputs and model/rules traceability.';
comment on table public.usage_events is 'Immutable billable and operational usage ledger.';
comment on table public.alerts is 'Scheduled email, WhatsApp, in-app, or webhook notifications.';
