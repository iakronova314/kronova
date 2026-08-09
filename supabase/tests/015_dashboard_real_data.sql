begin;

do $$ begin
  assert to_regclass('public.api_keys') is not null, 'API keys are required';
  assert exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'api_keys' and column_name = 'key_hash'
  ), 'API keys must store a hash';
  assert not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'api_keys' and column_name in ('secret', 'token', 'key')
  ), 'API key secrets must never be persisted';
  assert (select relrowsecurity from pg_class where oid = 'public.api_keys'::regclass), 'API keys require RLS';
  assert exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'api_keys' and policyname = 'api_keys_select_manager'
  ), 'Only tenant managers may list API keys';
end $$;

rollback;
