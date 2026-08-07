alter table public.fixtures drop constraint if exists fixtures_no_excluded_home;
alter table public.fixtures drop constraint if exists fixtures_no_excluded_away;

alter table public.fixtures add constraint fixtures_no_excluded_home check (
  lower(trim(home_team)) not in (
    'heart of midlothian',
    'heart of midlothian fc',
    'hearts',
    'hearts fc',
    'hibernian',
    'hibernian fc',
    'hibs',
    'hibs fc'
  )
);

alter table public.fixtures add constraint fixtures_no_excluded_away check (
  lower(trim(away_team)) not in (
    'heart of midlothian',
    'heart of midlothian fc',
    'hearts',
    'hearts fc',
    'hibernian',
    'hibernian fc',
    'hibs',
    'hibs fc'
  )
);
