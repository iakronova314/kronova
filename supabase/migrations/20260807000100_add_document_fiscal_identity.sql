alter table public.documents
  add column if not exists fiscal_document_number text,
  add column if not exists fiscal_supplier_tax_id text;

alter table public.documents
  add constraint documents_fiscal_number_length
    check (fiscal_document_number is null or char_length(fiscal_document_number) between 1 and 80),
  add constraint documents_fiscal_supplier_id_length
    check (fiscal_supplier_tax_id is null or char_length(fiscal_supplier_tax_id) between 1 and 40);

create index if not exists documents_tenant_fiscal_identity_idx
  on public.documents (tenant_id, jurisdiction, fiscal_supplier_tax_id, fiscal_document_number)
  where deleted_at is null
    and fiscal_supplier_tax_id is not null
    and fiscal_document_number is not null;

comment on column public.documents.fiscal_document_number is
  'Normalized fiscal document number used to detect semantic duplicates.';
comment on column public.documents.fiscal_supplier_tax_id is
  'Normalized supplier identifier paired with the fiscal document number.';
