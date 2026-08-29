-- Allow a gameweek to whitelist multiple UK kick-off times and explicitly mark
-- temporary fixture-rule overrides that must not become the next GW default.

alter table public.gameweeks
  add column if not exists selection_times text[] not null default array['15:00'],
  add column if not exists one_off_rule boolean not null default false;

-- Backfill the new list from the existing canonical single-time column.
update public.gameweeks
set selection_times = array[to_char(selection_time, 'HH24:MI')]
where selection_times is null
   or cardinality(selection_times) = 0;

-- Keep malformed values out of the stored whitelist while allowing any number
-- of explicitly chosen kick-off times.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gameweeks_selection_times_check'
  ) then
    alter table public.gameweeks
      add constraint gameweeks_selection_times_check
      check (
        cardinality(selection_times) >= 1
        and not exists (
          select 1
          from unnest(selection_times) as t(value)
          where value !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        )
      );
  end if;
end $$;
