export type ScoreOutcome = "btts" | "score-nil" | "zero-zero" | "pending";

export function outcomeForScore(homeScore: number | null, awayScore: number | null, finished = false): ScoreOutcome {
  if (homeScore == null || awayScore == null) return "pending";
  if (homeScore > 0 && awayScore > 0) return "btts";
  if (homeScore === 0 && awayScore === 0) return finished ? "zero-zero" : "pending";
  return finished ? "score-nil" : "pending";
}

export function pointsForFinishedScore(homeScore: number, awayScore: number): 3 | 1 | -1 {
  if (homeScore > 0 && awayScore > 0) return 3;
  if (homeScore === 0 && awayScore === 0) return -1;
  return 1;
}

export function provisionalPoints(homeScore: number | null, awayScore: number | null, finished = false): number | null {
  if (homeScore == null || awayScore == null) return null;
  if (homeScore > 0 && awayScore > 0) return 3;
  if (!finished) return 0;
  return pointsForFinishedScore(homeScore, awayScore);
}

export function outcomeLabel(homeScore: number | null, awayScore: number | null, status: string, awarded: number | null) {
  const finished = ["FT", "AET", "PEN"].includes(status);
  if (homeScore == null || awayScore == null) return { label: "Not started", points: awarded, tone: "neutral" as const };
  if (finished) {
    const points = awarded ?? pointsForFinishedScore(homeScore, awayScore);
    if (points === 3) return { label: "Won — BTTS", points, tone: "good" as const };
    if (points === 1) return { label: "Score–nil", points, tone: "warn" as const };
    if (points === -1) return { label: "0–0", points, tone: "bad" as const };
    return { label: "Finished", points, tone: "neutral" as const };
  }
  if (homeScore > 0 && awayScore > 0) return { label: "Winning — BTTS currently in", points: 3, tone: "good" as const };
  return { label: "Not winning — BTTS not currently in", points: 0, tone: "neutral" as const };
}
