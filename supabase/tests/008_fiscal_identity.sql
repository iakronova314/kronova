begin;

do $$
begin
  assert exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'documents' and column_name = 'fiscal_document_number'
  ), 'documents.fiscal_document_number is required';
  assert exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'documents' and column_name = 'fiscal_supplier_tax_id'
  ), 'documents.fiscal_supplier_tax_id is required';
  assert to_regclass('public.documents_tenant_fiscal_identity_idx') is not null,
    'Fiscal identity lookup index is required';
end
$$;

rollback;
