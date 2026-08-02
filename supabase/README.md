# Supabase database workflow

This directory is the reproducible source of truth for KRONOVA database changes.

## Existing remote schema

The project already contained:

- `public.tenants`: `id`, `name`, `plan`, `created_at`.
- `public.profiles`: `id`, `tenant_id`, `full_name`, `role`, `created_at`.
- `ia_audit_logs`: reported as existing, but not exposed through the public PostgREST OpenAPI schema during the audit.

The baseline migration preserves those tables and adds only compatible columns. `tenants` is the canonical organization table. `tenant_members` replaces the one-tenant-per-profile limitation without deleting the legacy `profiles.tenant_id` and `profiles.role` columns.

`ia_audit_logs` is intentionally untouched until its exact definition can be captured with a schema-level connection:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db pull
```

Review the generated diff before applying it. Do not print or commit database passwords.

## Migrations

Migrations run in timestamp order:

1. `20260802000100_baseline_existing_core.sql`
2. `20260802000200_create_saas_schema.sql`
3. `20260802000300_seed_plan_catalog.sql`
4. `20260802000400_create_rls_policies.sql`
5. `20260802000500_create_organizations_and_invitations.sql`
6. `20260802000600_create_api_rate_limits.sql`
7. `20260802000700_create_private_document_storage.sql`
8. `20260802000800_enforce_document_deduplication.sql`
9. `20260802000900_create_document_extractions.sql`
10. `20260802001000_create_job_leasing.sql`

The schema includes profiles, organizations, members, plans, billing customers, subscriptions, billing events, documents, analysis jobs, results, usage events, and alerts.

## Security state

RLS is enabled on every application table. The policies isolate tenants and enforce owner, administrator, analyst, and viewer permissions. Server-side `service_role` access bypasses RLS and must never be exposed to the browser.

Role mapping:

- `owner`: full membership administration and tenant settings.
- `admin`: tenant settings and regular member administration; cannot manage owners or other admins.
- `analyst`: regular member with read access to tenant business data.
- `viewer`: read-only member.

Writes to documents, processing jobs, results, usage, alerts, subscriptions, and billing events remain backend-only. This prevents browser clients from forging processing or billing state.

## Recommended local verification

Install and initialize the Supabase CLI, then run:

```bash
npx supabase start
npx supabase db reset
npx supabase status
```

For the existing remote project, first capture and reconcile its migration history. Do not run `db push` blindly against production.

## Remote deployment sequence

1. Create or select a non-production Supabase project.
2. Correct `NEXT_PUBLIC_SUPABASE_URL` so it contains only the project origin, without `/rest/v1/`.
3. Link the CLI to staging.
4. Pull the existing remote schema and compare it with the baseline.
5. Test a clean reset locally.
6. Push to staging.
7. Inspect constraints, indexes, migrated memberships, and RLS state.
8. Execute the RLS test suite from Tarea 05.
9. Only then schedule the production migration and backup.

## Important

After adopting migrations, do not make untracked schema changes directly in the production Dashboard. Every structural change must be represented by a new file under `supabase/migrations`.
