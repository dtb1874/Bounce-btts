import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

type DeadlineOddsCapture = {
  gameweeksChecked: number;
  fixturesCaptured: number;
};

export async function captureDeadlineOdds(
  admin: AdminClient,
  requestedGameweekIds?: string[],
): Promise<DeadlineOddsCapture> {
  let gameweekQuery = admin.from("gameweeks").select("id,locks_at");
  if (requestedGameweekIds?.length) gameweekQuery = gameweekQuery.in("id", requestedGameweekIds);

  const { data: gameweeks, error: gameweekError } = await gameweekQuery;
  if (gameweekError) throw gameweekError;

  let fixturesCaptured = 0;
  for (const gameweek of gameweeks ?? []) {
    const deadlineMs = Date.parse(String(gameweek.locks_at ?? ""));
    if (!Number.isFinite(deadlineMs)) continue;

    const { data: predictions, error: predictionError } = await admin
      .from("predictions")
      .select("fixture_id")
      .eq("gameweek_id", gameweek.id)
      .not("fixture_id", "is", null);
    if (predictionError) throw predictionError;

    const fixtureIds = [...new Set((predictions ?? []).map((row: any) => String(row.fixture_id)).filter(Boolean))];
    if (!fixtureIds.length) continue;

    const { data: fixtures, error: fixtureError } = await admin
      .from("fixtures")
      .select("id,odds_fractional,odds_bookmaker,odds_checked_at")
      .in("id", fixtureIds);
    if (fixtureError) throw fixtureError;

    for (const fixture of fixtures ?? []) {
      if (!fixture.odds_fractional || !fixture.odds_checked_at) continue;
      const checkedMs = Date.parse(String(fixture.odds_checked_at));
      if (!Number.isFinite(checkedMs) || checkedMs > deadlineMs) continue;

      const { error: updateError } = await admin
        .from("fixtures")
        .update({
          odds_deadline_fractional: fixture.odds_fractional,
          odds_deadline_bookmaker: fixture.odds_bookmaker,
          odds_deadline_captured_at: fixture.odds_checked_at,
        })
        .eq("id", fixture.id);
      if (updateError) throw updateError;
      fixturesCaptured += 1;
    }
  }

  return { gameweeksChecked: (gameweeks ?? []).length, fixturesCaptured };
}
