create table if not exists public.document_extractions (
  document_id uuid primary key references public.documents(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  status text not null check (status in ('completed', 'ocr_required', 'failed')),
  extraction_method text not null check (extraction_method in ('plain_text', 'structured_text', 'pdf_digital', 'pdf_scanned')),
  normalized_text text not null default '',
  pages jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  page_count integer not null default 1 check (page_count > 0),
  character_count integer not null default 0 check (character_count >= 0),
  extracted_at timestamptz not null default now(),
  unique (tenant_id, document_id)
);

create index if not exists document_extractions_tenant_status_idx on public.document_extractions (tenant_id, status);
alter table public.document_extractions enable row level security;
revoke all on public.document_extractions from anon, authenticated;
grant select on public.document_extractions to authenticated;
grant all on public.document_extractions to service_role;
drop policy if exists document_extractions_select_member on public.document_extractions;
create policy document_extractions_select_member on public.document_extractions for select to authenticated
using ((select private.is_tenant_member(tenant_id)));
