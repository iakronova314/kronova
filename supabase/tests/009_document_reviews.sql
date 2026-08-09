begin;

do $$
begin
  assert to_regclass('public.document_reviews') is not null, 'document_reviews table is required';
  assert (select relrowsecurity from pg_class where oid = 'public.document_reviews'::regclass),
    'document_reviews must have RLS enabled';
  assert exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'document_reviews'
      and policyname = 'document_reviews_select_member'
  ), 'document_reviews member select policy is required';
  assert exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'document_reviews'
      and policyname = 'document_reviews_insert_reviewer'
  ), 'document_reviews reviewer insert policy is required';
end
$$;

rollback;
