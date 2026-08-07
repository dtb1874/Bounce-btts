delete from public.fixtures
where lower(home_team) like '%hibernian%'
   or lower(away_team) like '%hibernian%'
   or lower(home_team) ~ '(^|[^a-z])(hibs)([^a-z]|$)'
   or lower(away_team) ~ '(^|[^a-z])(hibs)([^a-z]|$)';

alter table public.fixtures
  add constraint fixtures_no_excluded_home check (
    lower(home_team) not like '%heart of midlothian%'
    and lower(home_team) not like '%hibernian%'
    and lower(home_team) !~ '(^|[^a-z])(hearts|hibs)([^a-z]|$)'
  ),
  add constraint fixtures_no_excluded_away check (
    lower(away_team) not like '%heart of midlothian%'
    and lower(away_team) not like '%hibernian%'
    and lower(away_team) !~ '(^|[^a-z])(hearts|hibs)([^a-z]|$)'
  );
