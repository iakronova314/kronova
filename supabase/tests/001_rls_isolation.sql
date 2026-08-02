\set ON_ERROR_STOP on

begin;

alter table auth.users disable trigger kronova_on_auth_user_created;

create or replace function pg_temp.expect_denied(statement text)
returns boolean
language plpgsql security invoker
as $$
begin
  execute statement;
  return false;
exception
  when insufficient_privilege or check_violation or restrict_violation then
    return true;
end;
$$;

insert into auth.users (id)
values
  ('00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000103'),
  ('00000000-0000-0000-0000-000000000201'),
  ('00000000-0000-0000-0000-000000000301')
on conflict (id) do nothing;

alter table auth.users enable trigger kronova_on_auth_user_created;

insert into public.tenants (id, name, slug)
values
  ('10000000-0000-0000-0000-000000000001', 'Tenant A', 'tenant-a'),
  ('20000000-0000-0000-0000-000000000002', 'Tenant B', 'tenant-b');

insert into public.profiles (id, full_name)
values
  ('00000000-0000-0000-0000-000000000101', 'Owner A'),
  ('00000000-0000-0000-0000-000000000102', 'Admin A'),
  ('00000000-0000-0000-0000-000000000103', 'Member A'),
  ('00000000-0000-0000-0000-000000000201', 'Owner B'),
  ('00000000-0000-0000-0000-000000000301', 'Unassigned User');

insert into public.tenant_members (tenant_id, user_id, role, status, joined_at)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'owner', 'active', now()),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000102', 'admin', 'active', now()),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000103', 'analyst', 'active', now()),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000201', 'owner', 'active', now());

insert into public.documents (
  id, tenant_id, uploaded_by, original_name, bucket_name,
  storage_path, mime_type, size_bytes, status
)
values
  (
    '11000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000101',
    'tenant-a.txt', 'documents', 'tenant-a/document.txt',
    'text/plain', 100, 'uploaded'
  ),
  (
    '22000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000201',
    'tenant-b.txt', 'documents', 'tenant-b/document.txt',
    'text/plain', 100, 'uploaded'
  );

-- Owner A: own tenant only, tenant settings allowed, cross-tenant denied,
-- and the last active owner cannot be deleted.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true
);
select 1 / ((select count(*) = 1 from public.tenants)::integer);
select 1 / ((select count(*) = 1 from public.documents)::integer);
select 1 / ((select count(*) = 0 from public.documents
  where tenant_id = '20000000-0000-0000-0000-000000000002')::integer);
select 1 / ((select count(*) = 3 from public.profiles)::integer);

with changed as (
  update public.tenants set name = 'Tenant A updated by owner'
  where id = '10000000-0000-0000-0000-000000000001' returning id
)
select 1 / ((select count(*) = 1 from changed)::integer);

with changed as (
  update public.tenants set name = 'Cross-tenant update must not happen'
  where id = '20000000-0000-0000-0000-000000000002' returning id
)
select 1 / ((select count(*) = 0 from changed)::integer);

select 1 / (pg_temp.expect_denied(
  $$delete from public.tenant_members
    where tenant_id = '10000000-0000-0000-0000-000000000001'
      and user_id = '00000000-0000-0000-0000-000000000101'$$
)::integer);
reset role;

-- Admin A: tenant settings and regular members only.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true
);
with changed as (
  update public.tenants set name = 'Tenant A updated by admin'
  where id = '10000000-0000-0000-0000-000000000001' returning id
)
select 1 / ((select count(*) = 1 from changed)::integer);

insert into public.tenant_members (tenant_id, user_id, role, status)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000301', 'viewer', 'active'
);
delete from public.tenant_members
where tenant_id = '10000000-0000-0000-0000-000000000001'
  and user_id = '00000000-0000-0000-0000-000000000301';

select 1 / (pg_temp.expect_denied(
  $$insert into public.tenant_members (tenant_id, user_id, role, status)
    values ('10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000301', 'owner', 'active')$$
)::integer);
select 1 / (pg_temp.expect_denied(
  $$insert into public.tenant_members (tenant_id, user_id, role, status)
    values ('20000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000301', 'viewer', 'active')$$
)::integer);
reset role;

-- Member A: read own tenant, no administration and no direct document writes.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '00000000-0000-0000-0000-000000000103', true
);
select 1 / ((select count(*) = 1 from public.documents)::integer);
select 1 / ((select count(*) = 0 from public.documents
  where tenant_id = '20000000-0000-0000-0000-000000000002')::integer);

with changed as (
  update public.tenants set name = 'Member must not update tenant'
  where id = '10000000-0000-0000-0000-000000000001' returning id
)
select 1 / ((select count(*) = 0 from changed)::integer);

select 1 / (pg_temp.expect_denied(
  $$insert into public.tenant_members (tenant_id, user_id, role, status)
    values ('10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000301', 'viewer', 'active')$$
)::integer);
select 1 / (pg_temp.expect_denied(
  $$update public.documents set original_name = 'forged.txt'
    where id = '11000000-0000-0000-0000-000000000001'$$
)::integer);
reset role;

-- Owner B cannot observe Tenant A.
set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true
);
select 1 / ((select count(*) = 1 from public.tenants)::integer);
select 1 / ((select count(*) = 1 from public.documents)::integer);
select 1 / ((select count(*) = 0 from public.documents
  where tenant_id = '10000000-0000-0000-0000-000000000001')::integer);
reset role;

rollback;
