import { createClient } from "@/lib/supabase/client";
import type { FixtureSharePick } from "./FixtureShareImage";

export async function refreshFixtureShareOdds(gameweekId: string, picks: FixtureSharePick[]): Promise<FixtureSharePick[]> {
  const { data: { session } } = await createClient().auth.getSession();
  if (!session?.access_token) throw new Error("Please sign in again to refresh odds.");
  const response = await fetch("/api/share/refresh-odds", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ gameweekId }),
    cache: "no-store"
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Could not refresh odds.");
  type Row = { home_team: string; away_team: string; kickoff_at: string; odds_fractional: string | null };
  const key = (h: string, a: string, date: string) => JSON.stringify([h, a, new Date(date).toISOString()]);
  const updated = new Map<string, string | null>((result.fixtures as Row[]).map(row => [key(row.home_team,row.away_team,row.kickoff_at),row.odds_fractional]));
  return picks.map(pick => {
    const matchKey = key(pick.homeTeam,pick.awayTeam,pick.kickoffAt);
    return updated.has(matchKey) ? { ...pick, odds: updated.get(matchKey) ?? pick.odds } : pick;
  });
}
