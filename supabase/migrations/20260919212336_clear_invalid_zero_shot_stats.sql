-- The National League fallback occasionally returned explicit statistic rows
-- with blank values. Those blanks were previously coerced to zero, making a
-- scored match look like complete zero-shot data. Preserve the provider check
-- timestamps so unavailable fixtures are not repeatedly retried.
update public.fixtures
set
  home_shots = null,
  away_shots = null,
  home_shots_on_target = null,
  away_shots_on_target = null,
  stats_source = null
where status in ('FT', 'AET', 'PEN')
  and coalesce(home_score, 0) + coalesce(away_score, 0) > 0
  and home_shots is not null
  and away_shots is not null
  and home_shots + away_shots = 0;
