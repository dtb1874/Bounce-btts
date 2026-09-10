export type CompactPickTone = "won" | "scoreNil" | "lost" | "live" | "waiting";

const LIVE_STATUSES = new Set(["1H", "2H", "HT", "ET", "P", "BT", "INT", "SUSP", "LIVE"]);
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);

export function isLiveFixtureStatus(status: string) {
  return LIVE_STATUSES.has(status);
}

export function isFinishedFixtureStatus(status: string) {
  return FINISHED_STATUSES.has(status);
}

export function formatFootballElapsed(status: string, elapsed: number | null | undefined) {
  if (status === "HT") return "HT";
  if (elapsed == null || !Number.isFinite(elapsed)) return isLiveFixtureStatus(status) ? "LIVE" : "—";
  const minute = Math.max(0, Math.trunc(elapsed));

  // API-Football can report first-half stoppage as 46, 47... while status is still 1H.
  if (status === "1H" && minute > 45) return `45+${minute - 45}′`;
  // The same applies after 90 while the fixture remains in the second half.
  if (status === "2H" && minute > 90) return `90+${minute - 90}′`;
  return `${minute}′`;
}

export function compactPickOutcome({
  status,
  homeScore,
  awayScore,
}: {
  status: string;
  homeScore: number | null;
  awayScore: number | null;
}): { label: "W" | "S-N" | "L" | "LIVE" | "—"; tone: CompactPickTone } {
  const home = homeScore ?? 0;
  const away = awayScore ?? 0;

  // A BTTS win is irreversible as soon as both teams have scored, even before FT.
  if (home > 0 && away > 0) return { label: "W", tone: "won" };

  if (isFinishedFixtureStatus(status)) {
    if (home === 0 && away === 0) return { label: "L", tone: "lost" };
    return { label: "S-N", tone: "scoreNil" };
  }

  if (isLiveFixtureStatus(status)) return { label: "LIVE", tone: "live" };
  return { label: "—", tone: "waiting" };
}
