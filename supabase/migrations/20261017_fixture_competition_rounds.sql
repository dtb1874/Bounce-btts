-- Preserve provider round/stage names for every UK cup or knockout competition.
alter table public.fixtures add column if not exists fixture_round text;
create table if not exists public.fixture_round_settings (
 country text not null check(country in ('England','Scotland','Wales','Northern Ireland','Northern-Ireland')),
 competition text not null,
 fixture_round text not null check (length(trim(fixture_round))>0),
 enabled boolean not null default true,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null,
 primary key(country,competition,fixture_round)
);
alter table public.fixture_round_settings enable row level security;
