\set ON_ERROR_STOP on
do $$ begin
  assert not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relname not in ('plans') and not c.relrowsecurity
  ), 'Every application table except public plan catalog must have RLS';
  assert to_regprocedure('public.get_tenant_document_usage(uuid)') is not null, 'Quota function is missing';
  assert to_regprocedure('public.create_analysis_job_with_quota(uuid,uuid,uuid,text,text)') is not null, 'Atomic quota reservation is missing';
  assert exists(select 1 from pg_indexes where schemaname='public' and tablename='usage_events' and indexdef ilike '%unique%'), 'Usage idempotency index is missing';
  assert exists(select 1 from pg_policies where schemaname='public' and tablename='documents'), 'Document isolation policy is missing';
end $$;
