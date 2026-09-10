export const FIXTURE_PRELOAD_WINDOW_DAYS = 21;
export const FIXTURE_ALERT_WINDOW_DAYS = 14;
export const FIXTURE_IMPORT_LOOKBACK_DAYS = 2;
export const FIXTURE_IMPORT_ATTEMPT_FRESHNESS_HOURS = 72;
export const MAX_FIXTURE_DATES_PER_AUTOMATIC_IMPORT = 6;

export function fixtureImportWindow(nowMs = Date.now()) {
  return {
    lowerMs: nowMs - FIXTURE_IMPORT_LOOKBACK_DAYS * 86_400_000,
    upperMs: nowMs + FIXTURE_PRELOAD_WINDOW_DAYS * 86_400_000,
  };
}

export function fixtureAlertUpperMs(nowMs = Date.now()) {
  return nowMs + FIXTURE_ALERT_WINDOW_DAYS * 86_400_000;
}

export function recentImportCutoffIso(nowMs = Date.now()) {
  return new Date(nowMs - FIXTURE_IMPORT_ATTEMPT_FRESHNESS_HOURS * 3_600_000).toISOString();
}
