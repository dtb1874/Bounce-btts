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
  missed_pick_points integer not null default -1,
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
    lower(trim(home_team)) not in (
      'heart of midlothian', 'heart of midlothian fc', 'hearts', 'hearts fc',
      'hibernian', 'hibernian fc', 'hibs', 'hibs fc'
    )
  ),
  constraint fixtures_no_excluded_away check (
    lower(trim(away_team)) not in (
      'heart of midlothian', 'heart of midlothian fc', 'hearts', 'hearts fc',
      'hibernian', 'hibernian fc', 'hibs', 'hibs fc'
    )
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

create table public.score_adjustments (
  id uuid primary key default gen_random_uuid(),
  gameweek_id uuid not null references public.gameweeks(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null,
  reason text not null default 'Missed selection',
  source text not null default 'automatic' check (source in ('automatic', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gameweek_id, member_id)
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
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  gw public.gameweeks;
  fx public.fixtures;
  service_override boolean := coalesce(auth.role(), '') = 'service_role';
begin
  select * into gw from public.gameweeks where id = new.gameweek_id;
  select * into fx from public.fixtures where id = new.fixture_id;
  if not service_override and (gw.status <> 'open' or now() >= gw.locks_at) then raise exception 'Predictions are locked'; end if;
  if fx.gameweek_id <> new.gameweek_id or fx.is_eligible is not true then raise exception 'Fixture is not eligible for this gameweek'; end if;
  if not service_override and fx.kickoff_at <= now() then raise exception 'Fixture has already started'; end if;
  return new;
end;
$$;

create trigger prediction_validation
before insert or update on public.predictions
for each row execute function public.validate_prediction();

create or replace function public.apply_missed_pick_penalties(p_gameweek_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
  default_points integer := -1;
begin
  select coalesce(missed_pick_points, -1)
    into default_points
    from public.league_settings
   where id = true;

  insert into public.score_adjustments (gameweek_id, member_id, points, reason, source)
  select gw.id, sm.profile_id, default_points, 'Missed selection', 'automatic'
    from public.gameweeks gw
    join public.season_memberships sm on sm.season_id = gw.season_id and sm.active = true
    join public.profiles p on p.id = sm.profile_id and p.approved = true and p.active = true
   where (p_gameweek_id is null or gw.id = p_gameweek_id)
     and (gw.status in ('locked', 'complete') or gw.locks_at <= now())
     and not exists (
       select 1 from public.predictions pr
        where pr.gameweek_id = gw.id and pr.member_id = sm.profile_id
     )
  on conflict (gameweek_id, member_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.apply_missed_pick_penalties(uuid) from public;
grant execute on function public.apply_missed_pick_penalties(uuid) to service_role;

create or replace function public.clear_automatic_missed_pick_penalty()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.score_adjustments
   where gameweek_id = new.gameweek_id
     and member_id = new.member_id
     and source = 'automatic';
  return new;
end;
$$;

create trigger clear_automatic_missed_pick_penalty
after insert or update on public.predictions
for each row execute function public.clear_automatic_missed_pick_penalty();

alter table public.profiles enable row level security;
alter table public.seasons enable row level security;
alter table public.season_memberships enable row level security;
alter table public.member_credentials enable row level security;
alter table public.league_settings enable row level security;
alter table public.gameweeks enable row level security;
alter table public.fixtures enable row level security;
alter table public.predictions enable row level security;
alter table public.score_adjustments enable row level security;
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
create policy adjustments_member_read on public.score_adjustments for select using (private.is_approved());
create policy adjustments_admin_all on public.score_adjustments for all using (private.is_admin()) with check (private.is_admin());
create policy audit_admin_all on public.audit_log for all using (private.is_admin()) with check (private.is_admin());

-- No client policy is created for member_credentials. Only the service-role-backed
-- admin API can read or write encrypted passwords.
