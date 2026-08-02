\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email, raw_user_meta_data)
values (
  '80000000-0000-0000-0000-000000000001',
  'rate-owner@example.com',
  '{"full_name":"Rate Owner","organization_name":"Rate Tenant"}'::jsonb
);

set local role service_role;

do $$
declare
  tenant_id uuid;
  result record;
  attempt integer;
begin
  select tm.tenant_id into tenant_id from public.tenant_members tm
  where tm.user_id = '80000000-0000-0000-0000-000000000001';

  for attempt in 1..10 loop
    select * into result from public.consume_api_rate_limit(
      '80000000-0000-0000-0000-000000000001', tenant_id, 'test-ip-hash'
    );
    if not result.allowed then raise exception 'Request % should be allowed', attempt; end if;
  end loop;

  select * into result from public.consume_api_rate_limit(
    '80000000-0000-0000-0000-000000000001', tenant_id, 'test-ip-hash'
  );
  if result.allowed or result.retry_after_seconds <> 60 then
    raise exception 'Eleventh user request should be rate limited';
  end if;

  select * into result from public.consume_api_rate_limit(
    '80000000-0000-0000-0000-000000000001', gen_random_uuid(), 'other-ip-hash'
  );
  if result.allowed then raise exception 'Cross-tenant limiter request should be denied'; end if;
end $$;

reset role;
rollback;
