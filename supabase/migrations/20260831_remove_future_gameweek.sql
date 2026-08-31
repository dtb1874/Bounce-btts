-- Safely remove a future, unused gameweek and close the numbering gap.
-- Imported fixtures may exist and are intentionally removed by the existing
-- fixtures.gameweek_id ON DELETE CASCADE relationship. Player/scoring data blocks removal.

create or replace function public.remove_future_gameweek(p_gameweek_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  target public.gameweeks;
  shift_by integer;
  prediction_count integer;
  adjustment_count integer;
  later_count integer;
begin
  select * into target
  from public.gameweeks
  where id = p_gameweek_id
  for update;

  if target.id is null then
    raise exception 'Gameweek not found';
  end if;

  -- Once a round has opened, it is part of the live league and cannot be removed.
  if target.opens_at is null or target.opens_at <= now() then
    raise exception 'Only a gameweek that has not opened yet can be removed';
  end if;

  select count(*) into prediction_count from public.predictions where gameweek_id = target.id;
  if prediction_count > 0 then
    raise exception 'This gameweek has player selections and cannot be removed';
  end if;

  select count(*) into adjustment_count from public.score_adjustments where gameweek_id = target.id;
  if adjustment_count > 0 then
    raise exception 'This gameweek has score adjustments and cannot be removed';
  end if;

  select count(*) into later_count
  from public.gameweeks
  where season_id = target.season_id and number > target.number;

  -- Delete first. Existing FK rules cascade imported fixtures/predictions/adjustments;
  -- predictions/adjustments were explicitly proven empty above. Admin alerts SET NULL.
  delete from public.gameweeks where id = target.id;

  -- Move later rows through a collision-free temporary number range, preserving IDs.
  if later_count > 0 then
    select coalesce(max(number), 0) + 1000 into shift_by
    from public.gameweeks
    where season_id = target.season_id;

    update public.gameweeks
      set number = number + shift_by
      where season_id = target.season_id and number > target.number;

    update public.gameweeks
      set number = number - shift_by - 1
      where season_id = target.season_id and number > target.number + shift_by;
  end if;

  return jsonb_build_object(
    'removedId', target.id,
    'removedNumber', target.number,
    'shiftedGameweeks', later_count
  );
end;
$$;

revoke all on function public.remove_future_gameweek(uuid) from public;
revoke all on function public.remove_future_gameweek(uuid) from anon;
revoke all on function public.remove_future_gameweek(uuid) from authenticated;
grant execute on function public.remove_future_gameweek(uuid) to service_role;
