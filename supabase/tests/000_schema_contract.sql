begin;

do $$
declare
  required_table text;
  required_tables constant text[] := array[
    'tenants',
    'profiles',
    'tenant_members',
    'plans',
    'billing_customers',
    'subscriptions',
    'billing_events',
    'documents',
    'analysis_jobs',
    'analysis_results',
    'usage_events',
    'alerts'
  ];
begin
  foreach required_table in array required_tables loop
    assert to_regclass('public.' || required_table) is not null,
      format('Missing required table public.%s', required_table);
  end loop;

  assert (
    select count(*) = 3
    from public.plans
    where code in ('trial', 'docaudit_starter', 'docaudit_growth')
  ), 'Initial plan catalog is incomplete';

  assert (
    select bool_and(c.relrowsecurity)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any(required_tables)
  ), 'RLS must be enabled on every application table';
end
$$;

rollback;
