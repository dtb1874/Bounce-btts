import type { SupabaseClient } from "@supabase/supabase-js";
import { fixtureDateForGameweek } from "@/lib/gameweek-rules";
import {
  FIXTURE_ALERT_WINDOW_DAYS,
  FIXTURE_IMPORT_LOOKBACK_DAYS,
  fixtureAlertUpperMs,
  recentImportCutoffIso,
} from "@/lib/fixture-schedule-policy";

const ALERT_TYPE = "gameweek_fixture_availability";
const WARNING_THRESHOLD = 12;

export async function checkGameweekFixtureHealth(admin: SupabaseClient) {
  const now = new Date();
  const nowMs = now.getTime();
  const upper = fixtureAlertUpperMs(nowMs);
  const lower = nowMs - FIXTURE_IMPORT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

  const { data: season } = await admin.from("seasons").select("id").eq("is_current", true).maybeSingle();
  if (!season?.id) return { checked: 0, deferred: 0, alertsCreated: 0, alertsResolved: 0 };

  const [{ data: gameweeks, error: gameweekError }, { data: recentImports, error: importError }] = await Promise.all([
    admin
      .from("gameweeks")
      .select("id,number,opens_at,locks_at,status,selection_rule_mode,selection_weekday,selection_time,selection_times")
      .eq("season_id", season.id)
      .gte("locks_at", now.toISOString())
      .order("number"),
    admin
      .from("fixture_import_runs")
      .select("completed_at,status,details")
      .in("status", ["success", "partial"])
      .gte("completed_at", recentImportCutoffIso(nowMs))
      .order("completed_at", { ascending: false })
      .limit(12),
  ]);
  if (gameweekError) throw gameweekError;
  if (importError) throw importError;

  const attemptedDates = new Set<string>();
  let latestImportCompletedAt: string | null = null;
  for (const row of recentImports ?? []) {
    if (!latestImportCompletedAt && row.completed_at) latestImportCompletedAt = String(row.completed_at);
    const dates = Array.isArray((row as any)?.details?.dates) ? (row as any).details.dates : [];
    for (const value of dates) attemptedDates.add(String(value));
  }

  let checked = 0;
  let deferred = 0;
  let alertsCreated = 0;
  let alertsResolved = 0;

  for (const gameweek of gameweeks ?? []) {
    const fixtureDate = fixtureDateForGameweek(gameweek as any);
    const fixtureDay = Date.parse(`${fixtureDate}T12:00:00Z`);
    if (!Number.isFinite(fixtureDay) || fixtureDay < lower || fixtureDay > upper) continue;

    const { data: existing } = await admin
      .from("admin_alerts")
      .select("id,resolved")
      .eq("alert_type", ALERT_TYPE)
      .eq("gameweek_id", gameweek.id)
      .eq("resolved", false)
      .limit(1)
      .maybeSingle();

    // Fixture availability is only meaningful after the provider importer has
    // attempted this exact fixture date recently. An empty fixtures table before
    // preload is a data-not-loaded state, not evidence that no eligible games exist.
    if (!attemptedDates.has(fixtureDate)) {
      deferred += 1;
      if (existing?.id) {
        await admin.from("admin_alerts").update({ resolved: true, resolved_at: new Date().toISOString() }).eq("id", existing.id);
        alertsResolved += 1;
      }
      continue;
    }

    checked += 1;
    const { count, error: fixtureError } = await admin
      .from("fixtures")
      .select("id", { count: "exact", head: true })
      .eq("gameweek_id", gameweek.id)
      .eq("is_eligible", true);
    if (fixtureError) throw fixtureError;

    const eligibleCount = count ?? 0;
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
      ? "No eligible fixtures were found after the provider preload completed for this fixture date. Review the gameweek dates and selection rule before members make picks."
      : `Only ${eligibleCount} eligible fixtures were found after provider preload. This may be an international or cup weekend; review the gameweek schedule if required.`;
    const details = {
      eligibleCount,
      threshold: WARNING_THRESHOLD,
      alertWindowDays: FIXTURE_ALERT_WINDOW_DAYS,
      fixtureDate,
      providerDateAttempted: true,
      latestImportCompletedAt,
      checkedAt: new Date().toISOString(),
    };

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

  return { checked, deferred, alertsCreated, alertsResolved };
}
