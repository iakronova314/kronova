-- Organization onboarding and member invitations.

set lock_timeout = '10s';
set statement_timeout = '120s';

do $$ begin
  if not exists (select 1 from pg_type where typname = 'tenant_invitation_status') then
    create type public.tenant_invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
  end if;
end $$;

create table if not exists public.tenant_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  role public.tenant_member_role not null default 'analyst',
  status public.tenant_invitation_status not null default 'pending',
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_invitations_email_normalized check (email = lower(trim(email))),
  constraint tenant_invitations_expiry_order check (expires_at > created_at)
);

create unique index if not exists tenant_invitations_one_pending_email
  on public.tenant_invitations (tenant_id, email) where status = 'pending';
create index if not exists tenant_invitations_tenant_created_idx
  on public.tenant_invitations (tenant_id, created_at desc);

drop trigger if exists set_tenant_invitations_updated_at on public.tenant_invitations;
create trigger set_tenant_invitations_updated_at before update on public.tenant_invitations
for each row execute function public.set_updated_at();

create or replace function private.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  invitation public.tenant_invitations%rowtype;
  new_tenant_id uuid;
  organization_name text;
  display_name text;
  invitation_id_text text;
begin
  display_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  invitation_id_text := new.raw_user_meta_data ->> 'invitation_id';

  if invitation_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    select * into invitation from public.tenant_invitations
    where id = invitation_id_text::uuid
      and email = lower(trim(new.email))
      and status = 'pending'::public.tenant_invitation_status
      and expires_at > now()
    for update;
  end if;

  if invitation.id is not null then
    insert into public.profiles (id, tenant_id, full_name, role)
    values (new.id, invitation.tenant_id, display_name, invitation.role::text)
    on conflict (id) do update set
      tenant_id = excluded.tenant_id,
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      role = excluded.role;

    insert into public.tenant_members (tenant_id, user_id, role, status, invited_by, invited_at, joined_at)
    values (invitation.tenant_id, new.id, invitation.role, 'active', invitation.invited_by, invitation.created_at, now())
    on conflict (tenant_id, user_id) do update set status = 'active', joined_at = now();

    update public.tenant_invitations set status = 'accepted', accepted_at = now() where id = invitation.id;
    return new;
  end if;

  organization_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'organization_name'), ''),
    coalesce(display_name, split_part(new.email, '@', 1)) || ' Workspace');
  insert into public.tenants (name, slug, plan, created_by)
  values (organization_name, lower(regexp_replace(organization_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(new.id::text, 1, 8), 'Starter', new.id)
  returning id into new_tenant_id;

  insert into public.profiles (id, tenant_id, full_name, role)
  values (new.id, new_tenant_id, display_name, 'owner')
  on conflict (id) do update set
    tenant_id = excluded.tenant_id,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    role = excluded.role;
  insert into public.tenant_members (tenant_id, user_id, role, status, joined_at)
  values (new_tenant_id, new.id, 'owner', 'active', now());
  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public;
drop trigger if exists kronova_on_auth_user_created on auth.users;
create trigger kronova_on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_auth_user();

alter table public.tenant_invitations enable row level security;
revoke all on public.tenant_invitations from anon, authenticated;
grant select on public.tenant_invitations to authenticated;
grant all on public.tenant_invitations to service_role;

drop policy if exists tenant_invitations_select_manager on public.tenant_invitations;
create policy tenant_invitations_select_manager on public.tenant_invitations
for select to authenticated using ((select private.has_tenant_role(
  tenant_id, array['owner', 'admin']::public.tenant_member_role[]
)));

comment on table public.tenant_invitations is 'Auditable invitations; privileged writes are server-only.';
