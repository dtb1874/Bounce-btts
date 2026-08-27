alter table public.fixtures
  add column if not exists odds_deadline_fractional text,
  add column if not exists odds_deadline_bookmaker text,
  add column if not exists odds_deadline_captured_at timestamptz;

-- Preserve the odds values already used by historical statistics as the
-- initial deadline snapshot. Active selected fixtures will be refreshed into
-- these fields again before their gameweek deadline.
update public.fixtures
set
  odds_deadline_fractional = odds_fractional,
  odds_deadline_bookmaker = odds_bookmaker,
  odds_deadline_captured_at = coalesce(odds_checked_at, now())
where odds_fractional is not null
  and odds_deadline_fractional is null;
