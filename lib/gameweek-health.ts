import type { SupabaseClient } from "@supabase/supabase-js";

const ALERT_TYPE = "gameweek_fixture_availability";
const WARNING_THRESHOLD = 5;

export async function checkGameweekFixtureHealth(admin: SupabaseClient) {
  const now = new Date();
  const horizon = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString();
  const { data: season } = await admin.from("seasons").select("id").eq("is_current", true).maybeSingle();
  if (!season?.id) return { checked: 0, alertsCreated: 0, alertsResolved: 0 };

  const { data: gameweeks, error: gameweekError } = await admin
    .from("gameweeks")
    .select("id,number,opens_at,locks_at,status")
    .eq("season_id", season.id)
    .lte("opens_at", horizon)
    .gte("locks_at", now.toISOString())
    .order("number");
  if (gameweekError) throw gameweekError;

  let alertsCreated = 0;
  let alertsResolved = 0;
  for (const gameweek of gameweeks ?? []) {
    const { count, error: fixtureError } = await admin
      .from("fixtures")
      .select("id", { count: "exact", head: true })
      .eq("gameweek_id", gameweek.id)
      .eq("is_eligible", true);
    if (fixtureError) throw fixtureError;

    const eligibleCount = count ?? 0;
    const { data: existing } = await admin
      .from("admin_alerts")
      .select("id,resolved")
      .eq("alert_type", ALERT_TYPE)
      .eq("gameweek_id", gameweek.id)
      .eq("resolved", false)
      .limit(1)
      .maybeSingle();

    if (eligibleCount >= WARNING_THRESHOLD) {
      if (existing?.id) {
        await admin.from("admin_alerts").update({ resolved: true, resolved_at: new Date().toISOString() }).eq("id", existing.id);
        alertsResolved += 1;
      }
      continue;
    }

    const severity = eligibleCount === 0 ? "critical" : "warning";
    const title = eligibleCount === 0
      ? `GW${gameweek.number}: no eligible fixtures`
      : `GW${gameweek.number}: low fixture availability`;
    const message = eligibleCount === 0
      ? "No eligible fixtures were found for this gameweek. Review the gameweek dates and selection rule before members make picks."
      : `Only ${eligibleCount} eligible fixtures were found. This may be an international or cup weekend; review the gameweek schedule if required.`;
    const details = { eligibleCount, threshold: WARNING_THRESHOLD, checkedAt: new Date().toISOString() };

    if (existing?.id) {
      await admin.from("admin_alerts").update({ severity, title, message, details }).eq("id", existing.id);
    } else {
      const { error: alertError } = await admin.from("admin_alerts").insert({
        alert_type: ALERT_TYPE,
        severity,
        title,
        message,
        gameweek_id: gameweek.id,
        details,
      });
      if (alertError) throw alertError;
      alertsCreated += 1;
    }
  }

  return { checked: (gameweeks ?? []).length, alertsCreated, alertsResolved };
}
