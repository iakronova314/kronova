do $$
begin
  if not exists (select 1 from pg_type where typname = 'document_review_decision') then
    create type public.document_review_decision as enum ('approved', 'rejected', 'needs_review');
  end if;
end
$$;

create table if not exists public.document_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  document_id uuid not null,
  decision public.document_review_decision not null,
  note text,
  decided_by uuid not null references auth.users(id) on delete restrict,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, document_id),
  constraint document_reviews_document_tenant_fkey
    foreign key (tenant_id, document_id) references public.documents (tenant_id, id) on delete cascade,
  constraint document_reviews_note_length check (note is null or char_length(note) <= 1000)
);

create index if not exists document_reviews_tenant_decided_idx
  on public.document_reviews (tenant_id, decided_at desc);

drop trigger if exists set_document_reviews_updated_at on public.document_reviews;
create trigger set_document_reviews_updated_at before update on public.document_reviews
for each row execute function public.set_updated_at();

alter table public.document_reviews enable row level security;
revoke all on public.document_reviews from anon, authenticated;
grant select, insert, update on public.document_reviews to authenticated;
grant all on public.document_reviews to service_role;

drop policy if exists document_reviews_select_member on public.document_reviews;
create policy document_reviews_select_member on public.document_reviews for select to authenticated
using ((select private.is_tenant_member(tenant_id)));

drop policy if exists document_reviews_insert_reviewer on public.document_reviews;
create policy document_reviews_insert_reviewer on public.document_reviews for insert to authenticated
with check (
  decided_by = (select auth.uid())
  and exists (
    select 1 from public.tenant_members tm
    where tm.tenant_id = document_reviews.tenant_id and tm.user_id = (select auth.uid())
      and tm.status = 'active' and tm.role in ('owner', 'admin', 'analyst')
  )
);

drop policy if exists document_reviews_update_reviewer on public.document_reviews;
create policy document_reviews_update_reviewer on public.document_reviews for update to authenticated
using (
  exists (
    select 1 from public.tenant_members tm
    where tm.tenant_id = document_reviews.tenant_id and tm.user_id = (select auth.uid())
      and tm.status = 'active' and tm.role in ('owner', 'admin', 'analyst')
  )
)
with check (
  decided_by = (select auth.uid())
  and exists (
    select 1 from public.tenant_members tm
    where tm.tenant_id = document_reviews.tenant_id and tm.user_id = (select auth.uid())
      and tm.status = 'active' and tm.role in ('owner', 'admin', 'analyst')
  )
);

comment on table public.document_reviews is 'Latest explicit human disposition for a DocAudit report.';
