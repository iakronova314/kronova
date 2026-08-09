-- Recover accounts created before the KRONOVA tenant and consent triggers existed.

set lock_timeout = '10s';
set statement_timeout = '60s';

do $$
declare
  account record;
  new_tenant_id uuid;
  organization_name text;
  display_name text;
  consent_version text;
  consent_at timestamptz;
begin
  for account in
    select user_account.*
    from auth.users as user_account
    where not exists (
      select 1 from public.profiles as profile where profile.id = user_account.id
    )
  loop
    display_name := nullif(trim(coalesce(account.raw_user_meta_data ->> 'full_name', '')), '');
    organization_name := coalesce(
      nullif(trim(account.raw_user_meta_data ->> 'organization_name'), ''),
      coalesce(display_name, split_part(account.email, '@', 1)) || ' Workspace'
    );

    insert into public.tenants (name, slug, plan, created_by)
    values (
      organization_name,
      lower(regexp_replace(organization_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(account.id::text, 1, 8),
      'Starter',
      account.id
    )
    returning id into new_tenant_id;

    insert into public.profiles (id, tenant_id, full_name, role)
    values (account.id, new_tenant_id, display_name, 'owner');

    insert into public.tenant_members (tenant_id, user_id, role, status, joined_at)
    values (new_tenant_id, account.id, 'owner', 'active', now());

    insert into public.tenant_privacy_settings (tenant_id)
    values (new_tenant_id)
    on conflict (tenant_id) do nothing;

    consent_version := nullif(account.raw_user_meta_data ->> 'legal_consent_version', '');
    if consent_version is not null then
      begin
        consent_at := coalesce(
          (account.raw_user_meta_data ->> 'legal_consent_at')::timestamptz,
          account.created_at,
          now()
        );
      exception when invalid_text_representation then
        consent_at := coalesce(account.created_at, now());
      end;

      insert into public.legal_acceptances
        (user_id, tenant_id, purpose, policy_version, accepted_at, source, evidence)
      values
        (account.id, new_tenant_id, 'account_terms', consent_version, consent_at, 'registration', '{"privacy":true,"terms":true}'::jsonb),
        (account.id, new_tenant_id, 'privacy_policy', consent_version, consent_at, 'registration', '{"privacy":true,"terms":true}'::jsonb)
      on conflict do nothing;
    end if;
  end loop;
end
$$;
