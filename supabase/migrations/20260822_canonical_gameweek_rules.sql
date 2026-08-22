-- Canonical per-gameweek opening and fixture eligibility controls.
-- Production already contains these columns; IF NOT EXISTS keeps this migration
-- safe for rebuilt/test environments and records the intended schema in Git.

alter table public.gameweeks
  add column if not exists selection_rule_mode text not null default 'exact_time',
  add column if not exists selection_weekday smallint not null default 6,
  add column if not exists selection_time time without time zone not null default '15:00';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gameweeks_selection_rule_mode_check'
  ) then
    alter table public.gameweeks
      add constraint gameweeks_selection_rule_mode_check
      check (selection_rule_mode in ('exact_time', 'any_kickoff'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'gameweeks_selection_weekday_check'
  ) then
    alter table public.gameweeks
      add constraint gameweeks_selection_weekday_check
      check (selection_weekday between 1 and 7);
  end if;
end $$;

create or replace function public.validate_prediction()
returns trigger
language plpgsql
security definer
set search_path = public, auth, private
as $$
declare
  gw public.gameweeks;
  fx public.fixtures;
  privileged boolean := coalesce(auth.role(), '') = 'service_role' or private.is_admin();
begin
  -- Result/scoring jobs may update only the score-related fields on an existing
  -- prediction after the selection window has closed. Identity must not change.
  if tg_op = 'UPDATE'
     and privileged
     and new.gameweek_id is not distinct from old.gameweek_id
     and new.member_id is not distinct from old.member_id
     and new.fixture_id is not distinct from old.fixture_id then
    return new;
  end if;

  select * into gw from public.gameweeks where id = new.gameweek_id;
  select * into fx from public.fixtures where id = new.fixture_id;

  if gw.id is null then
    raise exception 'Gameweek not found';
  end if;

  if not privileged and now() < coalesce(gw.opens_at, '-infinity'::timestamptz) then
    raise exception 'Selections are not open yet';
  end if;

  if not privileged and (gw.status <> 'open' or now() >= gw.locks_at) then
    raise exception 'Predictions are locked';
  end if;

  if fx.gameweek_id <> new.gameweek_id or fx.is_eligible is not true then
    raise exception 'Fixture is not eligible for this gameweek';
  end if;

  if not privileged and fx.kickoff_at <= now() then
    raise exception 'Fixture has already started';
  end if;

  return new;
end;
$$;
