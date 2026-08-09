begin;

do $$ begin
  assert (select metadata -> 'modules' ? 'leasereader' from public.plans where code = 'trial'),
    'Trial must expose LeaseReader for evaluation';
  assert (select metadata -> 'modules' ? 'leasereader' from public.plans where code = 'docaudit_growth'),
    'Growth must include LeaseReader';
  assert exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'document_reviews' and column_name = 'corrections'),
    'Human correction overlay is required';
end $$;

rollback;
