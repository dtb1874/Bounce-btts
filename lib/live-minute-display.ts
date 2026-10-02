type LiveFixture = { id: string; status: string; live_elapsed?: number | null };
const LIVE_PHASES = new Set(["1H", "2H", "ET", "P", "BT", "INT"]);

/** Database reads omit the live clock; retain it only within the same match phase. */
export function retainLiveMinutes<T extends LiveFixture>(previous: readonly T[], incoming: readonly T[]): T[] {
  const byId = new Map(previous.map(row => [row.id, row]));
  return incoming.map(row => {
    const old = byId.get(row.id);
    if (row.live_elapsed != null || !old || old.status !== row.status || !LIVE_PHASES.has(row.status)) return row;
    return old.live_elapsed != null ? { ...row, live_elapsed: old.live_elapsed } : row;
  });
}

export function liveMinuteLabel(status: string, elapsed: number | null | undefined): string {
  if (!LIVE_PHASES.has(status)) return status;
  return elapsed != null && Number.isInteger(elapsed) && elapsed >= 0 ? `${elapsed}′` : "LIVE";
}
