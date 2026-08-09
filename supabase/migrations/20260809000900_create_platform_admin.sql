create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','finance','operations')),
  created_at timestamptz not null default now()
);

create table public.platform_expenses (
  id uuid primary key default gen_random_uuid(),
  occurred_on date not null default current_date,
  category text not null check (category in ('ai','infrastructure','marketing','legal','accounting','payroll','software','taxes','other')),
  vendor text not null,
  description text,
  currency text not null default 'COP' check (currency ~ '^[A-Z]{3}$'),
  amount integer not null check (amount > 0),
  recurring boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index platform_expenses_occurred_idx on public.platform_expenses(occurred_on desc);
create trigger set_platform_expenses_updated_at before update on public.platform_expenses
for each row execute function public.set_updated_at();

alter table public.platform_admins enable row level security;
alter table public.platform_expenses enable row level security;
revoke all on public.platform_admins, public.platform_expenses from anon, authenticated;
grant all on public.platform_admins, public.platform_expenses to service_role;

comment on table public.platform_admins is 'KRONOVA internal operators; never inferred from tenant roles.';
comment on table public.platform_expenses is 'Actual platform expenses in minor currency units.';
