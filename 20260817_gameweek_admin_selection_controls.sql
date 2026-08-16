alter table public.gameweeks
  add column if not exists selection_rule_mode text not null default 'exact_time',
  add column if not exists selection_weekday smallint not null default 6,
  add column if not exists selection_time time without time zone not null default '15:00';

alter table public.gameweeks
  drop constraint if exists gameweeks_selection_rule_mode_check,
  add constraint gameweeks_selection_rule_mode_check check (selection_rule_mode in ('exact_time','any_kickoff'));

alter table public.gameweeks
  drop constraint if exists gameweeks_selection_weekday_check,
  add constraint gameweeks_selection_weekday_check check (selection_weekday between 1 and 7);

create or replace function public.apply_gameweek_fixture_eligibility()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  gw public.gameweeks%rowtype;
  local_kickoff timestamp without time zone;
  teams text;
begin
  if new.gameweek_id is null then return new; end if;
  select * into gw from public.gameweeks where id = new.gameweek_id;
  if not found then return new; end if;
  local_kickoff := new.kickoff_at at time zone 'Europe/London';
  teams := lower(coalesce(new.home_team,'') || ' ' || coalesce(new.away_team,''));
  new.is_eligible :=
    new.country in ('England','Scotland','Wales','Northern Ireland','Northern-Ireland','United Kingdom')
    and extract(isodow from local_kickoff)::smallint = gw.selection_weekday
    and (gw.selection_rule_mode = 'any_kickoff' or local_kickoff::time = gw.selection_time)
    and teams !~ '(^|[^a-z])(hearts|hibs)([^a-z]|$)'
    and teams not like '%heart of midlothian%'
    and teams not like '%hibernian%'
    and new.status in ('NS','TBD');
  return new;
end;
$$;

drop trigger if exists fixtures_apply_gameweek_eligibility on public.fixtures;
create trigger fixtures_apply_gameweek_eligibility
before insert or update of gameweek_id,country,home_team,away_team,kickoff_at,status,is_eligible
on public.fixtures
for each row execute function public.apply_gameweek_fixture_eligibility();

create or replace function public.refresh_gameweek_fixture_eligibility()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.selection_rule_mode is distinct from old.selection_rule_mode
     or new.selection_weekday is distinct from old.selection_weekday
     or new.selection_time is distinct from old.selection_time then
    update public.fixtures set is_eligible = is_eligible where gameweek_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists gameweeks_refresh_fixture_eligibility on public.gameweeks;
create trigger gameweeks_refresh_fixture_eligibility
after update of selection_rule_mode,selection_weekday,selection_time
on public.gameweeks
for each row execute function public.refresh_gameweek_fixture_eligibility();
