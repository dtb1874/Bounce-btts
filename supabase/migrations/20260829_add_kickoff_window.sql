-- Flexible per-gameweek kick-off window. Standard weeks use 15:00 to 15:00.
alter table public.gameweeks
  add column if not exists selection_time_from time without time zone not null default '15:00',
  add column if not exists selection_time_to time without time zone not null default '15:00';

update public.gameweeks
set selection_time_from = selection_time,
    selection_time_to = selection_time
where selection_time_from is null or selection_time_to is null;

alter table public.gameweeks
  drop constraint if exists gameweeks_selection_time_window_check;
alter table public.gameweeks
  add constraint gameweeks_selection_time_window_check
  check (selection_time_from <= selection_time_to);
