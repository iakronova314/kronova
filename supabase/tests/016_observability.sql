begin;
do $$ begin
  assert to_regclass('public.observability_events') is not null, 'Structured observations are required';
  assert to_regclass('public.operational_alerts') is not null, 'Operational alerts are required';
  assert (select relrowsecurity from pg_class where oid='public.observability_events'::regclass), 'Observations require RLS';
  assert (select relrowsecurity from pg_class where oid='public.operational_alerts'::regclass), 'Operational alerts require RLS';
  assert not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='observability_events'
    and column_name in ('document_text','request_body','response_body','secret','token','headers')
  ), 'Observability must not store payloads or secrets';
  assert exists (select 1 from pg_proc where proname='record_operational_alert'), 'Alert deduplication function is required';
end $$;
rollback;
