create table public.api_keys (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null, key_prefix text not null, key_hash text not null unique, scopes text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null, last_used_at timestamptz, expires_at timestamptz,
  revoked_at timestamptz, created_at timestamptz not null default now(),
  unique(tenant_id,name), check(char_length(name) between 1 and 80), check(key_prefix ~ '^kr_[a-zA-Z0-9]{8}$')
);
alter table public.api_keys enable row level security;
revoke all on public.api_keys from anon, authenticated;
grant select on public.api_keys to authenticated;
grant all on public.api_keys to service_role;
create policy api_keys_select_manager on public.api_keys for select to authenticated
using ((select private.has_tenant_role(tenant_id,array['owner','admin']::public.tenant_member_role[])));
