begin;

do $$ begin
  assert to_regprocedure('public.get_tenant_entitlements(uuid)') is not null,
    'Entitlement resolver is required';
  assert (select metadata -> 'modules' ? 'docaudit' from public.plans where code = 'trial'),
    'Trial must include DocAudit';
end $$;

insert into public.tenants (id, name, plan)
values ('b1000000-0000-4000-8000-000000000001', 'Entitlement Tenant', 'Trial');

do $$
declare access record; quota record;
begin
  select * into access from public.get_tenant_entitlements('b1000000-0000-4000-8000-000000000001');
  select * into quota from private.resolve_document_quota('b1000000-0000-4000-8000-000000000001');
  assert access.subscription_status = 'trialing', 'New tenant must start an explicit trial';
  assert access.allowed_modules = array['docaudit'], 'Trial must grant only configured modules';
  assert quota.plan_code = 'trial', 'Valid trial must grant document quota';

  update public.subscriptions set trial_ends_at = now() - interval '1 minute',
    current_period_end = now() - interval '1 minute'
  where tenant_id = 'b1000000-0000-4000-8000-000000000001';
  select * into access from public.get_tenant_entitlements('b1000000-0000-4000-8000-000000000001');
  select * into quota from private.resolve_document_quota('b1000000-0000-4000-8000-000000000001');
  assert access.subscription_status = 'expired', 'Elapsed trial must be effectively expired';
  assert cardinality(access.allowed_modules) = 0, 'Expired subscription must grant no modules';
  assert quota.plan_code is null, 'Expired subscription must grant no quota';
end $$;

rollback;
