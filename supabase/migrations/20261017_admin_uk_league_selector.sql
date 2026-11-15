-- Admin-controlled UK competition eligibility. Unconfigured leagues remain enabled
-- for backward compatibility until an admin explicitly changes them.
create table if not exists public.fixture_competition_settings (
  country text not null check (country in ('England','Scotland','Wales','Northern Ireland','Northern-Ireland')),
  competition text not null check (length(trim(competition)) > 0),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (country, competition)
);
alter table public.fixture_competition_settings enable row level security;
-- Access is deliberately server-only via the service-role admin API.
