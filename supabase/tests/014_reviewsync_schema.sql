begin;
do $$ begin
  assert to_regclass('public.review_connections') is not null, 'OAuth connections are required';
  assert to_regclass('public.review_locations') is not null, 'Review locations are required';
  assert to_regclass('public.reviews') is not null, 'Deduplicated reviews are required';
  assert to_regclass('public.review_reply_drafts') is not null, 'Reply drafts are required';
  assert to_regclass('public.review_publications') is not null, 'Publication audit is required';
  assert (select metadata -> 'modules' ? 'reviewsync' from public.plans where code = 'trial'), 'Trial must expose ReviewSync for evaluation';
end $$;
rollback;
