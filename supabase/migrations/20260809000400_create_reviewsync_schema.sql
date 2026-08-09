create table public.review_connections (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null default 'google_business_profile', external_account_email text,
  encrypted_refresh_token text not null, granted_scopes text[] not null default '{}', status text not null default 'active',
  token_expires_at timestamptz, last_error text, connected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(tenant_id, provider), check (provider = 'google_business_profile'),
  check (status in ('active','reauthorization_required','revoked','error'))
);
create table public.review_oauth_states (
  state_hash text primary key, tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, encrypted_code_verifier text not null,
  expires_at timestamptz not null, consumed_at timestamptz, created_at timestamptz not null default now()
);
create table public.review_locations (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  connection_id uuid not null references public.review_connections(id) on delete cascade,
  provider text not null, external_account_id text not null, external_location_id text not null,
  name text not null, address text, timezone text, verified boolean not null default false, selected boolean not null default false,
  sync_cursor text, last_synced_at timestamptz, sync_status text not null default 'idle', last_error text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(tenant_id,provider, external_location_id), unique(tenant_id,id),
  check (sync_status in ('idle','syncing','error','reauthorization_required'))
);
create table public.reviews (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  location_id uuid not null, provider text not null, external_review_id text not null, external_resource_name text not null,
  star_rating smallint not null, comment text, reviewer_display_name text, reviewer_anonymous boolean not null default false,
  provider_created_at timestamptz not null, provider_updated_at timestamptz not null,
  reply_text text, reply_updated_at timestamptz, sentiment text, sentiment_score numeric(5,4), priority text,
  content_expires_at timestamptz not null, available boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(tenant_id,location_id) references public.review_locations(tenant_id,id) on delete cascade,
  unique(tenant_id,provider,external_review_id), unique(tenant_id,id), check(star_rating between 1 and 5),
  check(sentiment is null or sentiment in ('positive','neutral','negative')),
  check(priority is null or priority in ('low','normal','high','urgent'))
);
create table public.review_reply_drafts (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  review_id uuid not null, version integer not null, text text not null, status text not null default 'draft_generated',
  model_provider text, model_name text, prompt_version text, text_hash text not null,
  created_by uuid references auth.users(id) on delete set null, approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(tenant_id,review_id) references public.reviews(tenant_id,id) on delete cascade,
  unique(review_id,version), unique(tenant_id,id),
  check(status in ('draft_generated','edited_optional','approved','publishing','published','failed')),
  check(char_length(text) between 1 and 4096)
);
create table public.review_publications (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  review_id uuid not null, draft_id uuid not null, idempotency_key text not null unique,
  status text not null, attempted_by uuid not null references auth.users(id) on delete restrict,
  external_response jsonb not null default '{}', error_code text, error_message text,
  created_at timestamptz not null default now(), completed_at timestamptz,
  foreign key(tenant_id,review_id) references public.reviews(tenant_id,id) on delete cascade,
  foreign key(tenant_id,draft_id) references public.review_reply_drafts(tenant_id,id) on delete cascade,
  check(status in ('publishing','published','failed'))
);
create table public.review_sync_runs (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  location_id uuid not null, status text not null, imported_count integer not null default 0, updated_count integer not null default 0,
  page_count integer not null default 0, error_code text, error_message text, started_at timestamptz not null default now(), completed_at timestamptz,
  foreign key(tenant_id,location_id) references public.review_locations(tenant_id,id) on delete cascade,
  check(status in ('running','completed','failed'))
);
create index reviews_tenant_updated_idx on public.reviews(tenant_id,provider_updated_at desc);
create index reviews_expiry_idx on public.reviews(content_expires_at) where available;
create index review_locations_selected_idx on public.review_locations(tenant_id,selected) where selected;

do $$ declare table_name text; begin foreach table_name in array array['review_connections','review_oauth_states','review_locations','reviews','review_reply_drafts','review_publications','review_sync_runs'] loop
  execute format('alter table public.%I enable row level security', table_name);
  execute format('revoke all on public.%I from anon, authenticated', table_name);
  execute format('grant all on public.%I to service_role', table_name);
end loop; end $$;
grant select on public.review_locations, public.reviews, public.review_reply_drafts, public.review_publications, public.review_sync_runs to authenticated;
create policy review_locations_select on public.review_locations for select to authenticated using ((select private.is_tenant_member(tenant_id)));
create policy reviews_select on public.reviews for select to authenticated using ((select private.is_tenant_member(tenant_id)));
create policy review_drafts_select on public.review_reply_drafts for select to authenticated using ((select private.is_tenant_member(tenant_id)));
create policy review_publications_select on public.review_publications for select to authenticated using ((select private.is_tenant_member(tenant_id)));
create policy review_sync_runs_select on public.review_sync_runs for select to authenticated using ((select private.is_tenant_member(tenant_id)));

update public.plans set metadata = jsonb_set(metadata, '{modules}', '["docaudit","leasereader","reviewsync"]'::jsonb, true)
where code in ('trial','docaudit_growth');

do $$ declare table_name text; begin foreach table_name in array array['review_connections','review_locations','reviews','review_reply_drafts'] loop
  execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
end loop; end $$;
