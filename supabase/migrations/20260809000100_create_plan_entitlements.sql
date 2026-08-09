-- Plan capabilities and explicit trial lifecycle. Authorization is derived from subscriptions, never tenant.plan.

update public.plans set metadata = metadata || '{"modules":["docaudit"]}'::jsonb
where code in ('trial', 'docaudit_starter', 'docaudit_growth');

create or replace function private.create_tenant_trial()
returns trigger language plpgsql security definer set search_path = '' as $$
declare trial_plan public.plans%rowtype;
begin
  select * into trial_plan from public.plans where code = 'trial' and is_active;
  if trial_plan.code is not null then
    insert into public.subscriptions (
      tenant_id, plan_code, provider, status, currency, unit_amount,
      current_period_start, current_period_end, trial_ends_at, provider_state
    ) values (
      new.id, trial_plan.code, 'manual', 'trialing', trial_plan.currency, 0,
      now(), now() + make_interval(days => trial_plan.trial_days),
      now() + make_interval(days => trial_plan.trial_days), '{"source":"automatic_trial"}'::jsonb
    ) on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists create_tenant_trial on public.tenants;
create trigger create_tenant_trial after insert on public.tenants
for each row execute function private.create_tenant_trial();

-- Existing workspaces receive the same explicit trial once; this replaces the unsafe legacy Starter fallback.
insert into public.subscriptions (
  tenant_id, plan_code, provider, status, currency, unit_amount,
  current_period_start, current_period_end, trial_ends_at, provider_state
)
select t.id, p.code, 'manual', 'trialing', p.currency, 0,
  now(), now() + make_interval(days => p.trial_days),
  now() + make_interval(days => p.trial_days), '{"source":"entitlements_migration"}'::jsonb
from public.tenants t cross join public.plans p
where p.code = 'trial' and p.is_active
  and not exists (select 1 from public.subscriptions s where s.tenant_id = t.id);

create or replace function private.resolve_document_quota(target_tenant_id uuid)
returns table (
  subscription_id uuid, plan_code text, document_limit integer,
  period_start timestamptz, period_end timestamptz
)
language sql stable security definer set search_path = '' as $$
  select s.id, s.plan_code, p.document_limit,
    coalesce(s.current_period_start, date_trunc('month', now())),
    coalesce(s.current_period_end, date_trunc('month', now()) + interval '1 month')
  from public.subscriptions s
  join public.plans p on p.code = s.plan_code and p.is_active
  join public.tenants t on t.id = s.tenant_id and t.status = 'active'
  where s.tenant_id = target_tenant_id
    and s.status in ('trialing', 'active')
    and (s.current_period_start is null or s.current_period_start <= now())
    and (s.current_period_end is null or s.current_period_end > now())
    and (s.status <> 'trialing' or (s.trial_ends_at is not null and s.trial_ends_at > now()))
  order by case when s.provider = 'stripe' then 0 else 1 end, s.created_at desc
  limit 1;
$$;

create or replace function public.get_tenant_entitlements(target_tenant_id uuid)
returns table (
  subscription_id uuid, plan_code text, plan_name text, subscription_status text,
  allowed_modules text[], document_limit integer, trial_ends_at timestamptz,
  period_start timestamptz, period_end timestamptz
)
language sql stable security definer set search_path = '' as $$
  with selected as (
    select s.*, p.name, p.document_limit, p.metadata,
      case
        when s.status = 'trialing' and (s.trial_ends_at is null or s.trial_ends_at <= now()) then 'expired'
        when s.status in ('trialing', 'active') and s.current_period_end is not null and s.current_period_end <= now() then 'expired'
        else s.status::text
      end as effective_status
    from public.subscriptions s join public.plans p on p.code = s.plan_code and p.is_active
    where s.tenant_id = target_tenant_id
    order by case when s.status in ('trialing','active') then 0 else 1 end,
      case when s.provider = 'stripe' then 0 else 1 end, s.created_at desc limit 1
  )
  select s.id, s.plan_code, s.name, s.effective_status,
    case when s.effective_status in ('trialing','active')
      then coalesce(array(select jsonb_array_elements_text(s.metadata -> 'modules')), array[]::text[])
      else array[]::text[] end,
    s.document_limit, s.trial_ends_at, s.current_period_start, s.current_period_end
  from selected s;
$$;

revoke all on function private.create_tenant_trial() from public, anon, authenticated;
revoke all on function public.get_tenant_entitlements(uuid) from public, anon, authenticated;
grant execute on function public.get_tenant_entitlements(uuid) to service_role;

comment on function public.get_tenant_entitlements(uuid) is
  'Returns effective server-side capabilities; expired or non-access subscriptions receive no modules.';
