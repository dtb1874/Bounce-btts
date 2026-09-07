create or replace function public.propagate_future_gameweek_schedule_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  open_delta interval;
  lock_delta interval;
begin
  if current_setting('bounce.gameweek_propagation', true) = '1' then
    return new;
  end if;

  if new.opens_at is not distinct from old.opens_at
     and new.locks_at is not distinct from old.locks_at then
    return new;
  end if;

  open_delta := case
    when old.opens_at is not null and new.opens_at is not null then new.opens_at - old.opens_at
    else interval '0 seconds'
  end;
  lock_delta := new.locks_at - old.locks_at;

  perform set_config('bounce.gameweek_propagation', '1', true);

  update public.gameweeks
  set opens_at = case
        when opens_at is not null and open_delta <> interval '0 seconds' then opens_at + open_delta
        else opens_at
      end,
      locks_at = case
        when lock_delta <> interval '0 seconds' then locks_at + lock_delta
        else locks_at
      end
  where season_id = old.season_id
    and number > old.number
    and coalesce(one_off_rule, false) = false;

  perform set_config('bounce.gameweek_propagation', '0', true);
  return new;
end;
$$;

drop trigger if exists trg_propagate_future_gameweek_schedule_changes on public.gameweeks;
create trigger trg_propagate_future_gameweek_schedule_changes
after update of opens_at, locks_at on public.gameweeks
for each row
execute function public.propagate_future_gameweek_schedule_changes();
