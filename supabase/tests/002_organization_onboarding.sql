\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email, raw_user_meta_data)
values (
  '70000000-0000-0000-0000-000000000001',
  'owner@example.com',
  '{"full_name":"Laura Gómez","organization_name":"Inmobiliaria Andina"}'::jsonb
);

do $$
declare tenant_count integer; owner_count integer;
begin
  select count(*) into tenant_count from public.tenants where created_by = '70000000-0000-0000-0000-000000000001';
  select count(*) into owner_count from public.tenant_members
    where user_id = '70000000-0000-0000-0000-000000000001' and role = 'owner' and status = 'active';
  if tenant_count <> 1 or owner_count <> 1 then raise exception 'Organization onboarding failed'; end if;
end $$;

insert into public.tenant_invitations (id, tenant_id, email, role, invited_by)
select
  '71000000-0000-4000-8000-000000000001', id, 'analyst@example.com', 'analyst',
  '70000000-0000-0000-0000-000000000001'
from public.tenants where created_by = '70000000-0000-0000-0000-000000000001';

insert into auth.users (id, email, raw_user_meta_data)
values (
  '70000000-0000-0000-0000-000000000002',
  'analyst@example.com',
  '{"full_name":"Ana Analista","invitation_id":"71000000-0000-4000-8000-000000000001"}'::jsonb
);

do $$
declare member_count integer; accepted_count integer; tenant_count integer;
begin
  select count(*) into member_count from public.tenant_members
    where user_id = '70000000-0000-0000-0000-000000000002' and role = 'analyst' and status = 'active';
  select count(*) into accepted_count from public.tenant_invitations
    where id = '71000000-0000-4000-8000-000000000001' and status = 'accepted';
  select count(*) into tenant_count from public.tenants
    where created_by = '70000000-0000-0000-0000-000000000002';
  if member_count <> 1 or accepted_count <> 1 or tenant_count <> 0 then
    raise exception 'Invitation acceptance failed';
  end if;
end $$;

rollback;
