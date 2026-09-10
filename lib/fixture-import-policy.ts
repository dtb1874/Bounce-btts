// Canonical timing policy for fixture catalogue preloading and availability alerts.
// Keep importer and health checks aligned here rather than duplicating horizons.
export const FIXTURE_PRELOAD_DAYS = 21;
export const FIXTURE_HEALTH_ALERT_DAYS = 14;
export const FIXTURE_IMPORT_LOOKBACK_DAYS = 2;
export const FIXTURE_IMPORT_ATTEMPT_FRESHNESS_HOURS = 72;

export function fixtureDateWithinDays(fixtureDate: string, nowMs: number, aheadDays: number, lookbackDays = 0) {
  const fixtureDay = Date.parse(`${fixtureDate}T12:00:00Z`);
  if (!Number.isFinite(fixtureDay)) return false;
  return fixtureDay >= nowMs - lookbackDays * 86_400_000 && fixtureDay <= nowMs + aheadDays * 86_400_000;
}

export function recentFixtureImportCutoffIso(nowMs = Date.now()) {
  return new Date(nowMs - FIXTURE_IMPORT_ATTEMPT_FRESHNESS_HOURS * 3_600_000).toISOString();
}
