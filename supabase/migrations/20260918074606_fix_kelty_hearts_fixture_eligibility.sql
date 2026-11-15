-- Keep the Hearts/Hibs rule specific to the excluded Edinburgh clubs.
-- The previous word-boundary check also matched Kelty Hearts.
create or replace function public.apply_gameweek_fixture_eligibility()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  gw public.gameweeks%rowtype;
  local_kickoff timestamp without time zone;
  home_name text;
  away_name text;
  excluded_names text[] := array['heart of midlothian', 'hearts', 'hibernian', 'hibs'];
begin
  if new.gameweek_id is null then
    return new;
  end if;

  select * into gw from public.gameweeks where id = new.gameweek_id;
  if not found then
    return new;
  end if;

  local_kickoff := new.kickoff_at at time zone 'Europe/London';
  home_name := trim(regexp_replace(lower(coalesce(new.home_team, '')), '[^a-z0-9]+', ' ', 'g'));
  away_name := trim(regexp_replace(lower(coalesce(new.away_team, '')), '[^a-z0-9]+', ' ', 'g'));

  new.is_eligible :=
    new.country in ('England', 'Scotland', 'Wales', 'Northern Ireland', 'Northern-Ireland', 'United Kingdom')
    and extract(isodow from local_kickoff)::smallint = gw.selection_weekday
    and (
      gw.selection_rule_mode = 'any_kickoff'
      or local_kickoff::time = gw.selection_time
    )
    and not exists (
      select 1
      from unnest(excluded_names) as excluded(name)
      where home_name = excluded.name
         or home_name like excluded.name || ' %'
         or away_name = excluded.name
         or away_name like excluded.name || ' %'
    )
    and new.status in ('NS', 'TBD');

  return new;
end;
$$;

-- Re-run the corrected trigger for already-imported Kelty Hearts fixtures.
update public.fixtures
set is_eligible = is_eligible
where gameweek_id is not null
  and (
    lower(trim(home_team)) = 'kelty hearts'
    or lower(trim(away_team)) = 'kelty hearts'
  );
