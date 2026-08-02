\set ON_ERROR_STOP on

begin;

do $$
declare bucket_public boolean; bucket_limit bigint; direct_policy_count integer;
begin
  select public, file_size_limit into bucket_public, bucket_limit
  from storage.buckets where id = 'documents';
  if bucket_public is distinct from false then raise exception 'Documents bucket must be private'; end if;
  if bucket_limit <> 10485760 then raise exception 'Unexpected bucket size limit'; end if;

  select count(*) into direct_policy_count from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and (roles::text like '%anon%' or roles::text like '%authenticated%')
    and (qual like '%documents%' or with_check like '%documents%');
  if direct_policy_count <> 0 then raise exception 'Documents bucket has direct client policies'; end if;
end $$;

rollback;
