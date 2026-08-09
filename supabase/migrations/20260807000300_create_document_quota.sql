create or replace function private.resolve_document_quota(target_tenant_id uuid)
returns table (
  subscription_id uuid,
  plan_code text,
  document_limit integer,
  period_start timestamptz,
  period_end timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
declare
  legacy_plan text;
begin
  return query
  select s.id, s.plan_code, p.document_limit,
    coalesce(s.current_period_start, date_trunc('month', now())),
    coalesce(s.current_period_end, date_trunc('month', now()) + interval '1 month')
  from public.subscriptions s
  join public.plans p on p.code = s.plan_code and p.is_active
  where s.tenant_id = target_tenant_id
    and s.status in ('trialing', 'active')
    and (s.current_period_start is null or s.current_period_start <= now())
    and (s.current_period_end is null or s.current_period_end > now())
  order by s.created_at desc
  limit 1;
  if found then return; end if;

  select lower(coalesce(t.plan, 'starter')) into legacy_plan
  from public.tenants t where t.id = target_tenant_id and t.status = 'active';
  if not found then return; end if;

  return query
  select null::uuid, p.code, p.document_limit,
    date_trunc('month', now()), date_trunc('month', now()) + interval '1 month'
  from public.plans p
  where p.code = case
    when legacy_plan in ('trial', 'free trial') then 'trial'
    when legacy_plan in ('growth', 'docaudit growth', 'docaudit_growth') then 'docaudit_growth'
    else 'docaudit_starter'
  end and p.is_active
  limit 1;
end;
$$;

create or replace function public.get_tenant_document_usage(target_tenant_id uuid)
returns table (
  plan_code text,
  document_limit integer,
  used_units bigint,
  remaining_units bigint,
  period_start timestamptz,
  period_end timestamptz
)
language sql stable security definer set search_path = '' as $$
  with quota as (select * from private.resolve_document_quota(target_tenant_id))
  select q.plan_code, q.document_limit,
    count(distinct u.document_id) filter (where u.event_type in ('document_reserved', 'document_processed'))::bigint as used_units,
    greatest(q.document_limit::bigint - count(distinct u.document_id) filter (where u.event_type in ('document_reserved', 'document_processed')), 0)::bigint as remaining_units,
    q.period_start, q.period_end
  from quota q
  left join public.usage_events u on u.tenant_id = target_tenant_id
    and u.occurred_at >= q.period_start and u.occurred_at < q.period_end
  group by q.plan_code, q.document_limit, q.period_start, q.period_end;
$$;

create or replace function public.create_analysis_job_with_quota(
  target_tenant_id uuid,
  target_document_id uuid,
  requesting_user_id uuid,
  target_idempotency_key text,
  target_schema_version text
)
returns table (
  job_id uuid,
  job_status public.job_status,
  progress smallint,
  created boolean,
  allowed boolean,
  used_units bigint,
  document_limit integer,
  plan_code text,
  period_start timestamptz,
  period_end timestamptz
)
language plpgsql volatile security definer set search_path = '' as $$
declare
  quota record;
  existing_job public.analysis_jobs%rowtype;
  new_job public.analysis_jobs%rowtype;
  current_used bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(target_tenant_id::text, 19001));

  select * into existing_job from public.analysis_jobs
  where tenant_id = target_tenant_id and idempotency_key = target_idempotency_key;

  select * into quota from private.resolve_document_quota(target_tenant_id);
  if quota.plan_code is null then raise exception using errcode = 'P0001', message = 'QUOTA_PLAN_NOT_FOUND'; end if;

  select count(distinct document_id)::bigint into current_used
  from public.usage_events
  where tenant_id = target_tenant_id and event_type in ('document_reserved', 'document_processed')
    and occurred_at >= quota.period_start and occurred_at < quota.period_end;

  if existing_job.id is not null then
    return query select existing_job.id, existing_job.status, existing_job.progress, false, true,
      current_used, quota.document_limit, quota.plan_code, quota.period_start, quota.period_end;
    return;
  end if;

  if current_used >= quota.document_limit then
    return query select null::uuid, null::public.job_status, 0::smallint, false, false,
      current_used, quota.document_limit, quota.plan_code, quota.period_start, quota.period_end;
    return;
  end if;

  if not exists (
    select 1 from public.documents d where d.id = target_document_id and d.tenant_id = target_tenant_id
      and d.deleted_at is null and d.status in ('uploaded', 'queued', 'failed')
  ) then raise exception using errcode = 'P0001', message = 'DOCUMENT_NOT_AVAILABLE'; end if;

  insert into public.analysis_jobs (
    tenant_id, document_id, requested_by, job_type, status, progress,
    idempotency_key, schema_version, max_attempts
  ) values (
    target_tenant_id, target_document_id, requesting_user_id, 'document_pipeline', 'queued', 0,
    target_idempotency_key, target_schema_version, 3
  ) returning * into new_job;

  insert into public.usage_events (
    tenant_id, subscription_id, document_id, job_id, event_type, units, idempotency_key, metadata
  ) values (
    target_tenant_id, quota.subscription_id, target_document_id, new_job.id,
    'document_reserved', 1, 'quota:reserved:' || target_document_id::text,
    jsonb_build_object('plan_code', quota.plan_code, 'period_start', quota.period_start, 'period_end', quota.period_end)
  );

  update public.documents set status = 'queued' where id = target_document_id and tenant_id = target_tenant_id;
  return query select new_job.id, new_job.status, new_job.progress, true, true,
    current_used + 1, quota.document_limit, quota.plan_code, quota.period_start, quota.period_end;
end;
$$;

revoke all on function private.resolve_document_quota(uuid) from public, anon, authenticated;
revoke all on function public.get_tenant_document_usage(uuid) from public, anon, authenticated;
revoke all on function public.create_analysis_job_with_quota(uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function private.resolve_document_quota(uuid) to service_role;
grant execute on function public.get_tenant_document_usage(uuid) to service_role;
grant execute on function public.create_analysis_job_with_quota(uuid, uuid, uuid, text, text) to service_role;

comment on function public.create_analysis_job_with_quota(uuid, uuid, uuid, text, text) is
  'Atomically reserves one document unit and creates one idempotent analysis job.';
