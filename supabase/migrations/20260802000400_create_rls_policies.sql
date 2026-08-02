-- Multi-tenant Row Level Security policies for KRONOVA.

set lock_timeout = '10s';
set statement_timeout = '120s';

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_tenant_member(target_tenant_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tenant_members membership
    where membership.tenant_id = target_tenant_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'::public.tenant_member_status
  );
$$;

create or replace function private.has_tenant_role(
  target_tenant_id uuid,
  allowed_roles public.tenant_member_role[]
)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tenant_members membership
    where membership.tenant_id = target_tenant_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'::public.tenant_member_status
      and membership.role = any(allowed_roles)
  );
$$;

create or replace function private.shares_tenant(target_user_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenant_members mine
    join public.tenant_members theirs
      on theirs.tenant_id = mine.tenant_id
     and theirs.status = 'active'::public.tenant_member_status
    where mine.user_id = (select auth.uid())
      and mine.status = 'active'::public.tenant_member_status
      and theirs.user_id = target_user_id
  );
$$;

create or replace function private.can_manage_tenant_member(
  target_tenant_id uuid,
  target_role public.tenant_member_role
)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((
    select
      manager.role = 'owner'::public.tenant_member_role
      or (
        manager.role = 'admin'::public.tenant_member_role
        and target_role in (
          'analyst'::public.tenant_member_role,
          'viewer'::public.tenant_member_role
        )
      )
    from public.tenant_members manager
    where manager.tenant_id = target_tenant_id
      and manager.user_id = (select auth.uid())
      and manager.status = 'active'::public.tenant_member_status
  ), false);
$$;

create or replace function private.ensure_active_tenant_owner()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  removes_active_owner boolean;
  remaining_owners integer;
begin
  removes_active_owner :=
    old.role = 'owner'::public.tenant_member_role
    and old.status = 'active'::public.tenant_member_status
    and (
      tg_op = 'DELETE'
      or new.role <> 'owner'::public.tenant_member_role
      or new.status <> 'active'::public.tenant_member_status
    );

  if not removes_active_owner then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  select count(*) into remaining_owners
  from public.tenant_members membership
  where membership.tenant_id = old.tenant_id
    and membership.user_id <> old.user_id
    and membership.role = 'owner'::public.tenant_member_role
    and membership.status = 'active'::public.tenant_member_status;

  if remaining_owners = 0 then
    raise exception 'A tenant must retain at least one active owner.'
      using errcode = '23514';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.is_tenant_member(uuid) from public;
revoke all on function private.has_tenant_role(uuid, public.tenant_member_role[]) from public;
revoke all on function private.shares_tenant(uuid) from public;
revoke all on function private.can_manage_tenant_member(uuid, public.tenant_member_role) from public;
revoke all on function private.ensure_active_tenant_owner() from public;

grant execute on function private.is_tenant_member(uuid) to authenticated, service_role;
grant execute on function private.has_tenant_role(uuid, public.tenant_member_role[]) to authenticated, service_role;
grant execute on function private.shares_tenant(uuid) to authenticated, service_role;
grant execute on function private.can_manage_tenant_member(uuid, public.tenant_member_role) to authenticated, service_role;

drop trigger if exists ensure_active_tenant_owner on public.tenant_members;
create trigger ensure_active_tenant_owner
before update of role, status or delete on public.tenant_members
for each row execute function private.ensure_active_tenant_owner();

revoke all on all tables in schema public from anon, authenticated;

grant select on public.profiles to authenticated;
grant insert (id, full_name, avatar_url, locale) on public.profiles to authenticated;
grant update (full_name, avatar_url, locale) on public.profiles to authenticated;
grant select on public.tenants to authenticated;
grant update (name, slug, country_code, default_locale, timezone) on public.tenants to authenticated;
grant select, insert, delete on public.tenant_members to authenticated;
grant update (role, status, invited_at, joined_at) on public.tenant_members to authenticated;
grant select on public.plans to authenticated;
grant select on public.billing_customers to authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.documents to authenticated;
grant select on public.analysis_jobs to authenticated;
grant select on public.analysis_results to authenticated;
grant select on public.usage_events to authenticated;
grant select on public.alerts to authenticated;

grant all on public.profiles, public.tenants, public.tenant_members,
  public.plans, public.billing_customers, public.subscriptions,
  public.billing_events, public.documents, public.analysis_jobs,
  public.analysis_results, public.usage_events, public.alerts
to service_role;

drop policy if exists profiles_select_shared_tenant on public.profiles;
create policy profiles_select_shared_tenant on public.profiles
for select to authenticated
using (
  (select auth.uid()) is not null
  and (id = (select auth.uid()) or (select private.shares_tenant(id)))
);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
for insert to authenticated
with check (
  (select auth.uid()) is not null
  and id = (select auth.uid())
  and tenant_id is null
  and role is null
);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists tenants_select_member on public.tenants;
create policy tenants_select_member on public.tenants
for select to authenticated
using ((select private.is_tenant_member(id)));

drop policy if exists tenants_update_owner_admin on public.tenants;
create policy tenants_update_owner_admin on public.tenants
for update to authenticated
using ((select private.has_tenant_role(
  id, array['owner', 'admin']::public.tenant_member_role[]
)))
with check ((select private.has_tenant_role(
  id, array['owner', 'admin']::public.tenant_member_role[]
)));

drop policy if exists tenant_members_select_member on public.tenant_members;
create policy tenant_members_select_member on public.tenant_members
for select to authenticated
using ((select private.is_tenant_member(tenant_id)));

drop policy if exists tenant_members_insert_manager on public.tenant_members;
create policy tenant_members_insert_manager on public.tenant_members
for insert to authenticated
with check ((select private.can_manage_tenant_member(tenant_id, role)));

drop policy if exists tenant_members_update_manager on public.tenant_members;
create policy tenant_members_update_manager on public.tenant_members
for update to authenticated
using ((select private.can_manage_tenant_member(tenant_id, role)))
with check ((select private.can_manage_tenant_member(tenant_id, role)));

drop policy if exists tenant_members_delete_manager on public.tenant_members;
create policy tenant_members_delete_manager on public.tenant_members
for delete to authenticated
using ((select private.can_manage_tenant_member(tenant_id, role)));

drop policy if exists plans_select_authenticated on public.plans;
create policy plans_select_authenticated on public.plans
for select to authenticated
using ((select auth.uid()) is not null and is_active);

drop policy if exists billing_customers_select_owner_admin on public.billing_customers;
create policy billing_customers_select_owner_admin on public.billing_customers
for select to authenticated
using ((select private.has_tenant_role(
  tenant_id, array['owner', 'admin']::public.tenant_member_role[]
)));

drop policy if exists subscriptions_select_owner_admin on public.subscriptions;
create policy subscriptions_select_owner_admin on public.subscriptions
for select to authenticated
using ((select private.has_tenant_role(
  tenant_id, array['owner', 'admin']::public.tenant_member_role[]
)));

drop policy if exists usage_events_select_owner_admin on public.usage_events;
create policy usage_events_select_owner_admin on public.usage_events
for select to authenticated
using ((select private.has_tenant_role(
  tenant_id, array['owner', 'admin']::public.tenant_member_role[]
)));

drop policy if exists documents_select_member on public.documents;
create policy documents_select_member on public.documents
for select to authenticated
using ((select private.is_tenant_member(tenant_id)));

drop policy if exists analysis_jobs_select_member on public.analysis_jobs;
create policy analysis_jobs_select_member on public.analysis_jobs
for select to authenticated
using ((select private.is_tenant_member(tenant_id)));

drop policy if exists analysis_results_select_member on public.analysis_results;
create policy analysis_results_select_member on public.analysis_results
for select to authenticated
using ((select private.is_tenant_member(tenant_id)));

drop policy if exists alerts_select_member on public.alerts;
create policy alerts_select_member on public.alerts
for select to authenticated
using ((select private.is_tenant_member(tenant_id)));

-- billing_events deliberately has no authenticated policy or grant.
