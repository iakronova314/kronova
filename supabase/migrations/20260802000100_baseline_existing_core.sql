-- KRONOVA baseline for the tables that already exist in the remote project.
-- This migration is intentionally additive so it can run against the current
-- database and can also reproduce the minimum schema on a clean project.

set lock_timeout = '10s';
set statement_timeout = '60s';

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete set null,
  full_name text,
  role text,
  created_at timestamptz not null default now()
);

alter table public.tenants
  add column if not exists slug text,
  add column if not exists country_code text,
  add column if not exists default_locale text,
  add column if not exists timezone text,
  add column if not exists status text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz;

update public.tenants
set
  created_at = coalesce(created_at, now()),
  country_code = coalesce(country_code, 'CO'),
  default_locale = coalesce(default_locale, 'es-CO'),
  timezone = coalesce(timezone, 'America/Bogota'),
  status = coalesce(status, 'active'),
  updated_at = coalesce(updated_at, created_at, now())
where
  created_at is null
  or country_code is null
  or default_locale is null
  or timezone is null
  or status is null
  or updated_at is null;

alter table public.tenants
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column country_code set default 'CO',
  alter column country_code set not null,
  alter column default_locale set default 'es-CO',
  alter column default_locale set not null,
  alter column timezone set default 'America/Bogota',
  alter column timezone set not null,
  alter column status set default 'active',
  alter column status set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists locale text,
  add column if not exists updated_at timestamptz;

update public.profiles
set
  created_at = coalesce(created_at, now()),
  locale = coalesce(locale, 'es-CO'),
  updated_at = coalesce(updated_at, created_at, now())
where created_at is null or locale is null or updated_at is null;

alter table public.profiles
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column locale set default 'es-CO',
  alter column locale set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

create unique index if not exists tenants_slug_key
  on public.tenants (lower(slug))
  where slug is not null;

create index if not exists profiles_tenant_id_idx
  on public.profiles (tenant_id)
  where tenant_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tenants_country_code_format'
      and conrelid = 'public.tenants'::regclass
  ) then
    alter table public.tenants
      add constraint tenants_country_code_format
      check (country_code is null or country_code ~ '^[A-Z]{2}$') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'tenants_status_check'
      and conrelid = 'public.tenants'::regclass
  ) then
    alter table public.tenants
      add constraint tenants_status_check
      check (status in ('active', 'suspended', 'deleted')) not valid;
  end if;
end
$$;

alter table public.tenants validate constraint tenants_country_code_format;
alter table public.tenants validate constraint tenants_status_check;

comment on table public.tenants is
  'Organizations (tenants) that own all business data in KRONOVA.';

comment on column public.tenants.plan is
  'Legacy plan label. Canonical billing state lives in plans and subscriptions.';

comment on column public.profiles.tenant_id is
  'Legacy primary tenant. Canonical memberships live in tenant_members.';

comment on column public.profiles.role is
  'Legacy role. Canonical per-tenant roles live in tenant_members.';

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;

-- ia_audit_logs is deliberately not altered here. It is not exposed through
-- the current public PostgREST schema, so its exact remote shape must first be
-- captured with `supabase db pull` or a schema-only dump.
