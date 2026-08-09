begin;

do $$
begin
  assert to_regprocedure('public.get_tenant_document_usage(uuid)') is not null,
    'Document usage function is required';
  assert to_regprocedure('public.create_analysis_job_with_quota(uuid,uuid,uuid,text,text)') is not null,
    'Atomic quota reservation function is required';
  assert (select document_limit = 300 from public.plans where code = 'docaudit_starter'),
    'DocAudit Starter must enforce 300 documents';
end
$$;

alter table auth.users disable trigger kronova_on_auth_user_created;
insert into auth.users (id) values ('a0000000-0000-4000-8000-000000000001');
alter table auth.users enable trigger kronova_on_auth_user_created;
insert into public.tenants (id, name, plan) values ('a1000000-0000-4000-8000-000000000001', 'Quota Tenant', 'Starter');
update public.plans set document_limit = 1 where code = 'trial';
insert into public.documents (id, tenant_id, uploaded_by, original_name, bucket_name, storage_path, mime_type, size_bytes, status)
values
  ('a2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'one.xml', 'documents', 'one.xml', 'application/xml', 1, 'uploaded'),
  ('a2000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'two.xml', 'documents', 'two.xml', 'application/xml', 1, 'uploaded');

do $$
declare first_call record; repeated_call record; excess_call record; event_count integer;
begin
  select * into first_call from public.create_analysis_job_with_quota(
    'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001', 'quota-test:first', '1.0.0'
  );
  select * into repeated_call from public.create_analysis_job_with_quota(
    'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001', 'quota-test:first', '1.0.0'
  );
  select * into excess_call from public.create_analysis_job_with_quota(
    'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001', 'quota-test:second', '1.0.0'
  );
  select count(*) into event_count from public.usage_events where tenant_id = 'a1000000-0000-4000-8000-000000000001';
  assert first_call.allowed and first_call.created and first_call.used_units = 1, 'First document must reserve one unit';
  assert repeated_call.allowed and not repeated_call.created and repeated_call.job_id = first_call.job_id, 'Retry must reuse the job';
  assert event_count = 1, 'Retry must not create a second usage event';
  assert not excess_call.allowed and excess_call.job_id is null, 'Document above the limit must be blocked';
end
$$;

rollback;
