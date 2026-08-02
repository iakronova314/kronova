-- Atomic, server-side rate limiting for costly API operations.

set lock_timeout = '10s';
set statement_timeout = '60s';

create table if not exists private.api_rate_limits (
  scope text not null,
  subject_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null,
  updated_at timestamptz not null default now(),
  primary key (scope, subject_hash),
  constraint api_rate_limits_scope_check check (scope in ('user', 'tenant', 'ip')),
  constraint api_rate_limits_count_positive check (request_count > 0)
);

revoke all on private.api_rate_limits from public, anon, authenticated;

create or replace function private.consume_rate_bucket(
  bucket_scope text, bucket_subject text, bucket_limit integer, window_seconds integer
) returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare current_count integer;
begin
  insert into private.api_rate_limits (scope, subject_hash, window_started_at, request_count)
  values (bucket_scope, bucket_subject, clock_timestamp(), 1)
  on conflict (scope, subject_hash) do update set
    window_started_at = case
      when private.api_rate_limits.window_started_at <= clock_timestamp() - make_interval(secs => window_seconds)
      then clock_timestamp() else private.api_rate_limits.window_started_at end,
    request_count = case
      when private.api_rate_limits.window_started_at <= clock_timestamp() - make_interval(secs => window_seconds)
      then 1 else private.api_rate_limits.request_count + 1 end,
    updated_at = clock_timestamp()
  returning request_count into current_count;
  return current_count <= bucket_limit;
end;
$$;

create or replace function public.consume_api_rate_limit(
  actor_user_id uuid, target_tenant_id uuid, ip_hash text
) returns table (allowed boolean, retry_after_seconds integer)
language plpgsql volatile security definer set search_path = '' as $$
declare user_allowed boolean; tenant_allowed boolean; ip_allowed boolean;
begin
  if not exists (
    select 1 from public.tenant_members
    where tenant_id = target_tenant_id and user_id = actor_user_id and status = 'active'
  ) then
    return query select false, 60;
    return;
  end if;
  user_allowed := private.consume_rate_bucket('user', actor_user_id::text, 10, 60);
  tenant_allowed := private.consume_rate_bucket('tenant', target_tenant_id::text, 60, 60);
  ip_allowed := private.consume_rate_bucket('ip', ip_hash, 30, 60);
  return query select user_allowed and tenant_allowed and ip_allowed, 60;
end;
$$;

revoke all on function private.consume_rate_bucket(text, text, integer, integer) from public;
revoke all on function public.consume_api_rate_limit(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(uuid, uuid, text) to service_role;

comment on function public.consume_api_rate_limit(uuid, uuid, text) is
  'Service-only atomic limiter: 10/user, 60/tenant and 30/IP per minute.';
