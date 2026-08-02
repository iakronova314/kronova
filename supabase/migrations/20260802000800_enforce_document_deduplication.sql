-- Enforce one active copy of the same content per tenant.

drop index if exists public.documents_tenant_sha256_idx;
create unique index documents_tenant_sha256_idx
  on public.documents (tenant_id, sha256)
  where sha256 is not null and deleted_at is null;

comment on column public.documents.sha256 is
  'Server-calculated SHA-256 used to prevent active duplicates inside one tenant.';
