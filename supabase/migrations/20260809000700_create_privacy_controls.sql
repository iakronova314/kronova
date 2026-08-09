create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade, document_id uuid references public.documents(id) on delete cascade,
  purpose text not null check (purpose in ('account_terms','privacy_policy','document_processing')),
  policy_version text not null, accepted_at timestamptz not null default now(), source text not null default 'web',
  evidence jsonb not null default '{}', unique(user_id,purpose,policy_version,document_id), check(pg_column_size(evidence)<=2048)
);
create table public.tenant_privacy_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  document_retention_days integer not null default 30 check(document_retention_days between 1 and 3650),
  legal_hold boolean not null default false, updated_by uuid references auth.users(id) on delete set null, updated_at timestamptz not null default now()
);
create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(), tenant_id uuid references public.tenants(id) on delete set null,
  requested_by uuid not null references auth.users(id) on delete restrict,
  kind text not null check(kind in ('tenant_export','tenant_deletion')),
  status text not null default 'pending' check(status in ('pending','processing','completed','canceled','blocked','failed')),
  execute_after timestamptz, completed_at timestamptz, reason_code text, trace_id uuid not null default gen_random_uuid(), created_at timestamptz not null default now()
);
create unique index privacy_one_pending_deletion_idx on public.privacy_requests(tenant_id) where kind='tenant_deletion' and status in ('pending','processing');
create index privacy_requests_due_idx on public.privacy_requests(execute_after) where status='pending' and kind='tenant_deletion';

alter table public.legal_acceptances enable row level security;
alter table public.tenant_privacy_settings enable row level security;
alter table public.privacy_requests enable row level security;
revoke all on public.legal_acceptances,public.tenant_privacy_settings,public.privacy_requests from anon,authenticated;
grant select,insert on public.legal_acceptances to authenticated;
grant select on public.tenant_privacy_settings,public.privacy_requests to authenticated;
grant all on public.legal_acceptances,public.tenant_privacy_settings,public.privacy_requests to service_role;
create policy legal_acceptances_own_select on public.legal_acceptances for select to authenticated using(user_id=(select auth.uid()));
create policy legal_acceptances_own_insert on public.legal_acceptances for insert to authenticated with check(user_id=(select auth.uid()) and (tenant_id is null or (select private.is_tenant_member(tenant_id))));
create policy privacy_settings_manager_select on public.tenant_privacy_settings for select to authenticated using((select private.has_tenant_role(tenant_id,array['owner','admin']::public.tenant_member_role[])));
create policy privacy_requests_manager_select on public.privacy_requests for select to authenticated using((select private.has_tenant_role(tenant_id,array['owner','admin']::public.tenant_member_role[])));

insert into public.tenant_privacy_settings(tenant_id) select id from public.tenants on conflict do nothing;
alter table public.documents alter column retention_until set default (now()+interval '30 days');

create or replace function public.capture_signup_legal_acceptance() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.raw_user_meta_data->>'legal_consent_version' is not null then
    insert into public.legal_acceptances(user_id,purpose,policy_version,accepted_at,source,evidence)
    values(new.id,'account_terms',new.raw_user_meta_data->>'legal_consent_version',coalesce((new.raw_user_meta_data->>'legal_consent_at')::timestamptz,now()),'registration',jsonb_build_object('privacy',true,'terms',true));
    insert into public.legal_acceptances(user_id,purpose,policy_version,accepted_at,source,evidence)
    values(new.id,'privacy_policy',new.raw_user_meta_data->>'legal_consent_version',coalesce((new.raw_user_meta_data->>'legal_consent_at')::timestamptz,now()),'registration',jsonb_build_object('privacy',true,'terms',true));
  end if;
  return new;
end $$;
create trigger capture_signup_legal_acceptance after insert on auth.users for each row execute function public.capture_signup_legal_acceptance();
