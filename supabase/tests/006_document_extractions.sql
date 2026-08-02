\set ON_ERROR_STOP on

begin;
do $$ begin
  if not exists (select 1 from pg_class where oid = 'public.document_extractions'::regclass and relrowsecurity) then
    raise exception 'document_extractions must have RLS enabled';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'document_extractions' and policyname = 'document_extractions_select_member') then
    raise exception 'Missing extraction tenant policy';
  end if;
end $$;
rollback;
