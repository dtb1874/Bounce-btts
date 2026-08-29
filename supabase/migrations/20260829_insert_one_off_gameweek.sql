-- Insert a one-off gameweek between existing scheduled rounds without repurposing
-- the following normal gameweek. Future gameweek numbers move up by one, while
-- their ids, dates, fixtures and predictions remain unchanged.

create or replace function public.insert_one_off_gameweek(
  p_after_gameweek_id uuid,
  p_opens_at timestamptz,
  p_locks_at timestamptz,
  p_selection_rule_mode text,
  p_selection_weekday smallint,
  p_selection_time_from text,
  p_selection_time_to text
)
returns public.gameweeks
language plpgsql
security invoker
set search_path = public
as $$
declare
  anchor public.gameweeks;
  inserted public.gameweeks;
  shift_by integer;
  from_time time;
  to_time time;
begin
  select * into anchor from public.gameweeks where id = p_after_gameweek_id for update;
  if anchor.id is null then raise exception 'Anchor gameweek not found'; end if;
  if p_opens_at is null or p_locks_at is null or p_opens_at >= p_locks_at then raise exception 'One-off gameweek must open before its deadline'; end if;
  if p_selection_rule_mode not in ('exact_time', 'any_kickoff') then raise exception 'Invalid selection rule mode'; end if;
  if p_selection_weekday < 1 or p_selection_weekday > 7 then raise exception 'Invalid fixture weekday'; end if;
  if p_selection_time_from !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or p_selection_time_to !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Invalid kick-off time window'; end if;

  from_time := p_selection_time_from::time;
  to_time := p_selection_time_to::time;
  if from_time > to_time then raise exception 'Kick-off From time must not be later than To time'; end if;

  select coalesce(max(number), 0) + 1000 into shift_by from public.gameweeks where season_id = anchor.season_id;
  update public.gameweeks set number = number + shift_by where season_id = anchor.season_id and number > anchor.number;
  update public.gameweeks set number = number - shift_by + 1 where season_id = anchor.season_id and number > anchor.number + shift_by;

  insert into public.gameweeks (
    season_id, number, status, opens_at, locks_at,
    selection_rule_mode, selection_weekday, selection_time, selection_times,
    selection_time_from, selection_time_to, one_off_rule
  ) values (
    anchor.season_id, anchor.number + 1, 'open', p_opens_at, p_locks_at,
    p_selection_rule_mode, p_selection_weekday, from_time,
    case when from_time = to_time then array[p_selection_time_from] else array[p_selection_time_from,p_selection_time_to] end,
    from_time, to_time, true
  ) returning * into inserted;

  return inserted;
end;
$$;

revoke all on function public.insert_one_off_gameweek(uuid,timestamptz,timestamptz,text,smallint,text,text) from public;
revoke all on function public.insert_one_off_gameweek(uuid,timestamptz,timestamptz,text,smallint,text,text) from anon;
revoke all on function public.insert_one_off_gameweek(uuid,timestamptz,timestamptz,text,smallint,text,text) from authenticated;
grant execute on function public.insert_one_off_gameweek(uuid,timestamptz,timestamptz,text,smallint,text,text) to service_role;
