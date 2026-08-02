\set ON_ERROR_STOP on
begin;
alter table auth.users disable trigger kronova_on_auth_user_created;
insert into auth.users (id) values ('a0000000-0000-0000-0000-000000000001');
alter table auth.users enable trigger kronova_on_auth_user_created;
insert into public.tenants (id,name) values ('a1000000-0000-4000-8000-000000000001','Queue Tenant');
insert into public.documents (id,tenant_id,uploaded_by,original_name,bucket_name,storage_path,mime_type,size_bytes,status)
values ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','a0000000-0000-0000-0000-000000000001','q.txt','documents','q.txt','text/plain',1,'uploaded');
insert into public.analysis_jobs (id,tenant_id,document_id,requested_by,job_type,idempotency_key,schema_version)
values ('a3000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a0000000-0000-0000-0000-000000000001','pipeline','queue-test','v1');
set local role service_role;
do $$ declare first_claim record; second_count integer;
begin
  select * into first_claim from public.claim_analysis_jobs('worker-a',1,240);
  if first_claim.id is null or first_claim.status <> 'processing' or first_claim.attempt_count <> 1 then raise exception 'First claim failed'; end if;
  select count(*) into second_count from public.claim_analysis_jobs('worker-b',1,240);
  if second_count <> 0 then raise exception 'Leased job was claimed twice'; end if;
end $$;
reset role;
rollback;
