begin;

do $$ begin
  assert to_regclass('public.contract_deadlines') is not null, 'Contract deadlines table is required';
  assert to_regclass('public.alert_deliveries') is not null, 'Alert delivery history is required';
  assert to_regprocedure('public.claim_due_email_alerts(integer)') is not null, 'Atomic email alert claim function is required';
  assert exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'alerts' and column_name = 'idempotency_key' and is_nullable = 'NO'),
    'Every alert requires an idempotency key';
end $$;

rollback;
