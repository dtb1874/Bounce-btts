alter table public.fixtures
  add column if not exists home_shots integer,
  add column if not exists away_shots integer,
  add column if not exists home_shots_on_target integer,
  add column if not exists away_shots_on_target integer,
  add column if not exists stats_checked_at timestamptz;

comment on column public.fixtures.home_shots is 'API-Football Total Shots for the home team.';
comment on column public.fixtures.away_shots is 'API-Football Total Shots for the away team.';
comment on column public.fixtures.home_shots_on_target is 'API-Football Shots on Goal for the home team.';
comment on column public.fixtures.away_shots_on_target is 'API-Football Shots on Goal for the away team.';
comment on column public.fixtures.stats_checked_at is 'Last time post-match shot statistics were checked with API-Football.';
