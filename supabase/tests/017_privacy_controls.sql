begin;
do $$ begin
  assert to_regclass('public.legal_acceptances') is not null, 'Versioned legal acceptance is required';
  assert to_regclass('public.tenant_privacy_settings') is not null, 'Retention settings are required';
  assert to_regclass('public.privacy_requests') is not null, 'Export and deletion requests are required';
  assert (select relrowsecurity from pg_class where oid='public.legal_acceptances'::regclass), 'Legal acceptance requires RLS';
  assert (select relrowsecurity from pg_class where oid='public.privacy_requests'::regclass), 'Privacy requests require RLS';
  assert exists(select 1 from pg_trigger where tgname='capture_signup_legal_acceptance'), 'Registration consent must be retained';
  assert exists(select 1 from information_schema.columns where table_schema='public' and table_name='documents' and column_name='retention_until' and column_default is not null), 'Documents require default retention';
end $$;
rollback;
