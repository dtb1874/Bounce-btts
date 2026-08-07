-- Automatic missed-selection penalties with admin override support.

alter table public.league_settings
  add column if not exists missed_pick_points integer not null default -1;

create table if not exists public.score_adjustments (
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

alter table public.score_adjustments enable row level security;

drop policy if exists adjustments_member_read on public.score_adjustments;
create policy adjustments_member_read
  on public.score_adjustments for select
  using (private.is_approved());

drop policy if exists adjustments_admin_all on public.score_adjustments;
create policy adjustments_admin_all
  on public.score_adjustments for all
  using (private.is_admin())
  with check (private.is_admin());

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
  select gw.id,
         sm.profile_id,
         default_points,
         'Missed selection',
         'automatic'
    from public.gameweeks gw
    join public.season_memberships sm
      on sm.season_id = gw.season_id
     and sm.active = true
    join public.profiles p
      on p.id = sm.profile_id
     and p.approved = true
     and p.active = true
   where (p_gameweek_id is null or gw.id = p_gameweek_id)
     and (gw.status in ('locked', 'complete') or gw.locks_at <= now())
     and not exists (
       select 1
         from public.predictions pr
        where pr.gameweek_id = gw.id
          and pr.member_id = sm.profile_id
     )
  on conflict (gameweek_id, member_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.apply_missed_pick_penalties(uuid) from public;
grant execute on function public.apply_missed_pick_penalties(uuid) to service_role;


-- Service-role admin APIs may add or correct selections after the member deadline.
create or replace function public.validate_prediction()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  gw public.gameweeks;
  fx public.fixtures;
  service_override boolean := coalesce(auth.role(), '') = 'service_role';
begin
  select * into gw from public.gameweeks where id = new.gameweek_id;
  select * into fx from public.fixtures where id = new.fixture_id;
  if not service_override and (gw.status <> 'open' or now() >= gw.locks_at) then
    raise exception 'Predictions are locked';
  end if;
  if fx.gameweek_id <> new.gameweek_id or fx.is_eligible is not true then
    raise exception 'Fixture is not eligible for this gameweek';
  end if;
  if not service_override and fx.kickoff_at <= now() then
    raise exception 'Fixture has already started';
  end if;
  return new;
end;
$$;

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

drop trigger if exists clear_automatic_missed_pick_penalty on public.predictions;
create trigger clear_automatic_missed_pick_penalty
after insert or update on public.predictions
for each row execute function public.clear_automatic_missed_pick_penalty();

-- Apply the rule to any gameweek whose deadline has already passed.
select public.apply_missed_pick_penalties(null);
