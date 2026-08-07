-- Bounce BTTS League clean-install schema.
-- The connected production Supabase project has already been migrated.

create extension if not exists "pgcrypto";
create schema if not exists private;

create type public.member_role as enum ('member', 'admin');
create type public.gameweek_status as enum ('open', 'locked', 'complete');

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  is_current boolean not null default false,
  starts_at date,
  ends_at date,
  created_at timestamptz not null default now()
);

create unique index seasons_one_current on public.seasons ((is_current)) where is_current = true;

create table public.league_settings (
  id boolean primary key default true check (id = true),
  league_name text not null default 'Bounce BTTS League',
  established_year integer not null default 2024,
  entry_fee numeric(8,2) not null default 20.00,
  current_season_label text not null default '2026/27',
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  role public.member_role not null default 'member',
  approved boolean not null default true,
  slot_number integer unique check (slot_number between 1 and 12),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.member_credentials (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  encrypted_password text not null,
  updated_at timestamptz not null default now()
);

create table public.season_memberships (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (season_id, profile_id)
);

create table public.gameweeks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete restrict,
  number integer not null check (number > 0),
  status public.gameweek_status not null default 'open',
  opens_at timestamptz,
  locks_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (season_id, number)
);

create table public.fixtures (
  id uuid primary key default gen_random_uuid(),
  gameweek_id uuid references public.gameweeks(id) on delete cascade,
  provider_fixture_id text unique,
  competition text not null,
  country text not null,
  home_team text not null,
  away_team text not null,
  kickoff_at timestamptz not null,
  status text not null default 'NS',
  home_score integer,
  away_score integer,
  completed_at timestamptz,
  source text not null default 'manual',
  is_eligible boolean not null default true,
  admin_note text,
  odds_fractional text,
  odds_checked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint fixtures_no_excluded_home check (
    lower(home_team) not like '%heart of midlothian%'
    and lower(home_team) not like '%hibernian%'
    and lower(home_team) !~ '(^|[^a-z])(hearts|hibs)([^a-z]|$)'
  ),
  constraint fixtures_no_excluded_away check (
    lower(away_team) not like '%heart of midlothian%'
    and lower(away_team) not like '%hibernian%'
    and lower(away_team) !~ '(^|[^a-z])(hearts|hibs)([^a-z]|$)'
  )
);

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  gameweek_id uuid not null references public.gameweeks(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  points_awarded integer check (points_awarded in (-1, 1, 3)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gameweek_id, member_id),
  unique (gameweek_id, fixture_id)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.league_settings (id) values (true);
insert into public.seasons (label, is_current, starts_at, ends_at)
values ('2026/27', true, '2026-07-01', '2027-06-30');

create or replace function private.is_approved()
returns boolean language sql stable security definer
set search_path = public, auth
as $$ select exists(select 1 from public.profiles where id = auth.uid() and approved = true); $$;

create or replace function private.is_admin()
returns boolean language sql stable security definer
set search_path = public, auth
as $$ select exists(select 1 from public.profiles where id = auth.uid() and approved = true and active = true and role = 'admin'); $$;

create or replace function public.validate_prediction()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  gw public.gameweeks;
  fx public.fixtures;
begin
  select * into gw from public.gameweeks where id = new.gameweek_id;
  select * into fx from public.fixtures where id = new.fixture_id;
  if gw.status <> 'open' or now() >= gw.locks_at then raise exception 'Predictions are locked'; end if;
  if fx.gameweek_id <> new.gameweek_id or fx.is_eligible is not true then raise exception 'Fixture is not eligible for this gameweek'; end if;
  if fx.kickoff_at <= now() then raise exception 'Fixture has already started'; end if;
  return new;
end;
$$;

create trigger prediction_validation
before insert or update on public.predictions
for each row execute function public.validate_prediction();

alter table public.profiles enable row level security;
alter table public.seasons enable row level security;
alter table public.season_memberships enable row level security;
alter table public.member_credentials enable row level security;
alter table public.league_settings enable row level security;
alter table public.gameweeks enable row level security;
alter table public.fixtures enable row level security;
alter table public.predictions enable row level security;
alter table public.audit_log enable row level security;

create policy profiles_read on public.profiles for select using (private.is_approved() or id = auth.uid());
create policy profiles_admin_all on public.profiles for all using (private.is_admin()) with check (private.is_admin());
create policy seasons_member_read on public.seasons for select using (private.is_approved());
create policy seasons_admin_all on public.seasons for all using (private.is_admin()) with check (private.is_admin());
create policy memberships_member_read on public.season_memberships for select using (private.is_approved());
create policy memberships_admin_all on public.season_memberships for all using (private.is_admin()) with check (private.is_admin());
create policy settings_member_read on public.league_settings for select using (private.is_approved());
create policy settings_admin_all on public.league_settings for all using (private.is_admin()) with check (private.is_admin());
create policy gameweeks_member_read on public.gameweeks for select using (private.is_approved());
create policy gameweeks_admin_all on public.gameweeks for all using (private.is_admin()) with check (private.is_admin());
create policy fixtures_member_read on public.fixtures for select using (private.is_approved());
create policy fixtures_admin_all on public.fixtures for all using (private.is_admin()) with check (private.is_admin());
create policy predictions_member_read on public.predictions for select using (private.is_approved());
create policy predictions_insert_own on public.predictions for insert with check (private.is_approved() and member_id = auth.uid());
create policy predictions_update_own on public.predictions for update using (private.is_approved() and member_id = auth.uid()) with check (private.is_approved() and member_id = auth.uid());
create policy predictions_delete_own on public.predictions for delete using (private.is_approved() and member_id = auth.uid());
create policy predictions_admin_all on public.predictions for all using (private.is_admin()) with check (private.is_admin());
create policy audit_admin_all on public.audit_log for all using (private.is_admin()) with check (private.is_admin());

-- No client policy is created for member_credentials. Only the service-role-backed
-- admin API can read or write encrypted passwords.
