create table if not exists public.contract_deadlines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  document_id uuid not null,
  kind text not null,
  title text not null,
  due_at timestamptz not null,
  source_fact_path text not null,
  evidence_ids text[] not null default '{}',
  status text not null default 'active',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, document_id, kind, due_at),
  foreign key (tenant_id, document_id) references public.documents(tenant_id, id) on delete cascade,
  constraint contract_deadlines_kind_check check (kind in ('contract_start','contract_end','notice_deadline','rent_increase','payment_due','other')),
  constraint contract_deadlines_status_check check (status in ('active','completed','canceled'))
);

alter table public.alerts add column if not exists deadline_id uuid references public.contract_deadlines(id) on delete cascade;
alter table public.alerts add column if not exists idempotency_key text;
alter table public.alerts add column if not exists max_attempts smallint not null default 5;
alter table public.alerts add column if not exists next_attempt_at timestamptz;
alter table public.alerts add column if not exists locked_at timestamptz;
update public.alerts set idempotency_key = 'legacy:' || id::text where idempotency_key is null;
alter table public.alerts alter column idempotency_key set not null;
create unique index if not exists alerts_idempotency_key_idx on public.alerts(idempotency_key);
create index if not exists alerts_claim_email_idx on public.alerts(coalesce(next_attempt_at, scheduled_for), locked_at)
  where channel = 'email' and status in ('scheduled','processing');

create table if not exists public.alert_deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  alert_id uuid not null references public.alerts(id) on delete cascade,
  attempt_number smallint not null,
  provider text not null,
  status text not null,
  external_delivery_id text,
  error_code text,
  error_message text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (alert_id, attempt_number),
  constraint alert_deliveries_status_check check (status in ('sent','failed'))
);

create or replace function public.claim_due_email_alerts(batch_size integer default 10)
returns setof public.alerts language plpgsql volatile security definer set search_path = '' as $$
begin
  return query
  with candidates as (
    select id from public.alerts
    where channel = 'email'
      and status in ('scheduled','processing')
      and coalesce(next_attempt_at, scheduled_for) <= now()
      and (status = 'scheduled' or locked_at < now() - interval '10 minutes')
      and attempt_count < max_attempts
    order by coalesce(next_attempt_at, scheduled_for), created_at
    for update skip locked limit greatest(1, least(batch_size, 50))
  )
  update public.alerts a set status = 'processing', locked_at = now(), attempt_count = a.attempt_count + 1, updated_at = now()
  from candidates where a.id = candidates.id returning a.*;
end;
$$;

drop trigger if exists set_contract_deadlines_updated_at on public.contract_deadlines;
create trigger set_contract_deadlines_updated_at before update on public.contract_deadlines
for each row execute function public.set_updated_at();

alter table public.contract_deadlines enable row level security;
alter table public.alert_deliveries enable row level security;
revoke all on public.contract_deadlines, public.alert_deliveries from anon, authenticated;
grant select on public.contract_deadlines, public.alert_deliveries to authenticated;
grant all on public.contract_deadlines, public.alert_deliveries to service_role;
revoke all on function public.claim_due_email_alerts(integer) from public, anon, authenticated;
grant execute on function public.claim_due_email_alerts(integer) to service_role;

create policy contract_deadlines_select_member on public.contract_deadlines for select to authenticated
using ((select private.is_tenant_member(tenant_id)));
create policy alert_deliveries_select_member on public.alert_deliveries for select to authenticated
using ((select private.is_tenant_member(tenant_id)));
