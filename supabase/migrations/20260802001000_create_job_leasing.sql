create or replace function public.claim_analysis_jobs(worker_name text, batch_size integer default 1, lease_seconds integer default 240)
returns setof public.analysis_jobs language plpgsql volatile security definer set search_path = '' as $$
begin
  return query
  with candidates as (
    select id from public.analysis_jobs
    where status in ('queued', 'retrying')
      and queued_at <= now()
      and (locked_until is null or locked_until < now())
      and attempt_count < max_attempts
    order by queued_at
    for update skip locked
    limit greatest(1, least(batch_size, 10))
  )
  update public.analysis_jobs job set
    status = 'processing', locked_by = worker_name,
    locked_until = now() + make_interval(secs => lease_seconds),
    attempt_count = job.attempt_count + 1,
    started_at = coalesce(job.started_at, now()), updated_at = now()
  from candidates where job.id = candidates.id
  returning job.*;
end;
$$;

revoke all on function public.claim_analysis_jobs(text, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_analysis_jobs(text, integer, integer) to service_role;

create index if not exists analysis_jobs_claim_idx on public.analysis_jobs (queued_at, locked_until)
where status in ('queued', 'retrying');
