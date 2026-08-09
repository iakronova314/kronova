update public.plans set metadata = jsonb_set(metadata, '{modules}', '["docaudit","leasereader"]'::jsonb, true)
where code in ('trial', 'docaudit_growth');

alter table public.document_reviews add column if not exists corrections jsonb not null default '[]'::jsonb;
alter table public.document_reviews drop constraint if exists document_reviews_corrections_array;
alter table public.document_reviews add constraint document_reviews_corrections_array
  check (jsonb_typeof(corrections) = 'array' and jsonb_array_length(corrections) <= 150);

comment on table public.document_reviews is 'Latest human disposition and auditable correction overlay for a document analysis.';
comment on column public.document_reviews.corrections is 'Validated correction overlay; immutable machine output remains in analysis_results.';
