create table public.observability_events (
  id uuid primary key default gen_random_uuid(),
  trace_id uuid not null,
  tenant_id uuid references public.tenants(id) on delete cascade,
  job_id uuid references public.analysis_jobs(id) on delete set null,
  document_id uuid references public.documents(id) on delete set null,
  source text not null,
  event_name text not null,
  level text not null check (level in ('info','warn','error')),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  metric_value numeric,
  error_code text,
  attributes jsonb not null default '{}',
  created_at timestamptz not null default now(),
  check (char_length(source) between 1 and 80),
  check (char_length(event_name) between 1 and 120),
  check (error_code is null or char_length(error_code) <= 100),
  check (pg_column_size(attributes) <= 4096)
);

create index observability_events_tenant_created_idx on public.observability_events(tenant_id, created_at desc);
create index observability_events_name_created_idx on public.observability_events(event_name, created_at desc);
create index observability_events_trace_idx on public.observability_events(trace_id);
create index observability_events_job_idx on public.observability_events(job_id) where job_id is not null;

create table public.operational_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  fingerprint text not null,
  severity text not null check (severity in ('warning','critical')),
  title text not null,
  error_code text,
  trace_id uuid,
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  metadata jsonb not null default '{}',
  unique nulls not distinct (tenant_id, fingerprint, status),
  check (pg_column_size(metadata) <= 4096)
);

create index operational_alerts_open_idx on public.operational_alerts(status, severity, last_seen_at desc);

alter table public.observability_events enable row level security;
alter table public.operational_alerts enable row level security;
revoke all on public.observability_events, public.operational_alerts from anon, authenticated;
grant select on public.observability_events, public.operational_alerts to authenticated;
grant all on public.observability_events, public.operational_alerts to service_role;

create policy observability_events_select_manager on public.observability_events for select to authenticated
using (tenant_id is not null and (select private.has_tenant_role(tenant_id,array['owner','admin']::public.tenant_member_role[])));
create policy operational_alerts_select_manager on public.operational_alerts for select to authenticated
using (tenant_id is not null and (select private.has_tenant_role(tenant_id,array['owner','admin']::public.tenant_member_role[])));

create or replace function public.record_operational_alert(
  target_tenant_id uuid, target_fingerprint text, target_severity text, target_title text,
  target_error_code text, target_trace_id uuid, target_metadata jsonb default '{}'
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare alert_id uuid;
begin
  insert into public.operational_alerts(tenant_id,fingerprint,severity,title,error_code,trace_id,metadata)
  values(target_tenant_id,target_fingerprint,target_severity,target_title,target_error_code,target_trace_id,target_metadata)
  on conflict (tenant_id,fingerprint,status)
  do update set occurrence_count=operational_alerts.occurrence_count+1,last_seen_at=now(),severity=excluded.severity,trace_id=excluded.trace_id
  returning id into alert_id;
  return alert_id;
end $$;
revoke all on function public.record_operational_alert(uuid,text,text,text,text,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.record_operational_alert(uuid,text,text,text,text,uuid,jsonb) to service_role;
