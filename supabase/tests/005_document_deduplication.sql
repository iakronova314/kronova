\set ON_ERROR_STOP on

begin;

alter table auth.users disable trigger kronova_on_auth_user_created;
insert into auth.users (id) values ('90000000-0000-0000-0000-000000000001');
alter table auth.users enable trigger kronova_on_auth_user_created;
insert into public.tenants (id, name) values ('91000000-0000-4000-8000-000000000001', 'Hash Tenant');

insert into public.documents (tenant_id, uploaded_by, original_name, bucket_name, storage_path, mime_type, size_bytes, status, sha256)
values ('91000000-0000-4000-8000-000000000001', '90000000-0000-0000-0000-000000000001', 'one.txt', 'documents', 'one.txt', 'text/plain', 4, 'uploaded', repeat('a', 64));

do $$ begin
  begin
    insert into public.documents (tenant_id, uploaded_by, original_name, bucket_name, storage_path, mime_type, size_bytes, status, sha256)
    values ('91000000-0000-4000-8000-000000000001', '90000000-0000-0000-0000-000000000001', 'two.txt', 'documents', 'two.txt', 'text/plain', 4, 'uploaded', repeat('a', 64));
    raise exception 'Duplicate hash was accepted';
  exception when unique_violation then null;
  end;
end $$;

rollback;
