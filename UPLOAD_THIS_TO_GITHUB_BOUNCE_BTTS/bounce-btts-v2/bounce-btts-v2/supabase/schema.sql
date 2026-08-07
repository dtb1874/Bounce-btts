create extension if not exists "pgcrypto";

create type public.member_role as enum ('member', 'admin');
create type public.gameweek_status as enum ('open', 'locked', 'complete');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.member_role not null default 'member',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.gameweeks (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique check (number > 0),
  status public.gameweek_status not null default 'open',
  opens_at timestamptz,
  locks_at timestamptz not null,
  created_at timestamptz not null default now()
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
  created_at timestamptz not null default now(),
  check (lower(home_team) not like '%heart of midlothian%'),
  check (lower(away_team) not like '%heart of midlothian%')
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

create or replace function public.is_approved()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from profiles where id = auth.uid() and approved = true); $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from profiles where id = auth.uid() and approved = true and role = 'admin'); $$;

create or replace function public.validate_prediction()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  gw public.gameweeks;
  fx public.fixtures;
begin
  select * into gw from gameweeks where id = new.gameweek_id;
  select * into fx from fixtures where id = new.fixture_id;

  if gw.status <> 'open' or now() >= gw.locks_at then
    raise exception 'Predictions are locked';
  end if;
  if fx.gameweek_id <> new.gameweek_id or fx.is_eligible is not true then
    raise exception 'Fixture is not eligible for this gameweek';
  end if;
  if fx.kickoff_at <= now() then
    raise exception 'Fixture has already started';
  end if;
  return new;
end;
$$;

create trigger prediction_validation
before insert or update on public.predictions
for each row execute function public.validate_prediction();

alter table public.profiles enable row level security;
alter table public.gameweeks enable row level security;
alter table public.fixtures enable row level security;
alter table public.predictions enable row level security;
alter table public.audit_log enable row level security;

create policy "approved members read profiles" on public.profiles
for select using (public.is_approved());

create policy "users read own pending profile" on public.profiles
for select using (id = auth.uid());

create policy "admins manage profiles" on public.profiles
for all using (public.is_admin()) with check (public.is_admin());

create policy "approved members read gameweeks" on public.gameweeks
for select using (public.is_approved());

create policy "admins manage gameweeks" on public.gameweeks
for all using (public.is_admin()) with check (public.is_admin());

create policy "approved members read fixtures" on public.fixtures
for select using (public.is_approved());

create policy "admins manage fixtures" on public.fixtures
for all using (public.is_admin()) with check (public.is_admin());

create policy "approved members read predictions" on public.predictions
for select using (public.is_approved());

create policy "members create own prediction" on public.predictions
for insert with check (
  public.is_approved()
  and member_id = auth.uid()
);

create policy "members update own prediction" on public.predictions
for update using (
  public.is_approved()
  and member_id = auth.uid()
) with check (
  public.is_approved()
  and member_id = auth.uid()
);

create policy "members delete own prediction" on public.predictions
for delete using (
  public.is_approved()
  and member_id = auth.uid()
);

create policy "admins manage predictions" on public.predictions
for all using (public.is_admin()) with check (public.is_admin());

create policy "admins read audit" on public.audit_log
for select using (public.is_admin());

create policy "admins write audit" on public.audit_log
for insert with check (public.is_admin());

create or replace view public.league_table as
select
  p.id as member_id,
  p.display_name,
  count(pr.points_awarded) as played,
  count(*) filter (where pr.points_awarded = 3) as wins,
  count(*) filter (where pr.points_awarded = 1) as one_sided,
  count(*) filter (where pr.points_awarded = -1) as zero_zero_count,
  coalesce(sum(pr.points_awarded), 0) as points
from public.profiles p
left join public.predictions pr on pr.member_id = p.id
where p.approved = true
group by p.id, p.display_name
order by
  points desc,
  zero_zero_count asc,
  wins desc,
  p.display_name asc;
