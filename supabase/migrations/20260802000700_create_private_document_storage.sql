-- Private document storage. All object operations are mediated by trusted server routes.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents', 'documents', false, 10485760,
  array['application/pdf', 'application/xml', 'text/xml', 'text/plain', 'text/markdown', 'application/json', 'text/csv']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Deliberately no anon/authenticated policies on storage.objects for this bucket.
-- The service role creates short-lived signed URLs after application-level RLS checks.
comment on table public.documents is
  'Private document metadata. Object paths are tenant-scoped and access is issued through short-lived signed URLs.';
