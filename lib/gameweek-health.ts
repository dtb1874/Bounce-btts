import type { SupabaseClient } from "@supabase/supabase-js";
import { fixtureDateForGameweek } from "@/lib/gameweek-rules";

const ALERT_TYPE = "gameweek_fixture_availability";
const WARNING_THRESHOLD = 12;
const PRELOAD_WINDOW_DAYS = 15;

export async function checkGameweekFixtureHealth(admin: SupabaseClient) {
  const now = new Date();
  const upper = now.getTime() + PRELOAD_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const lower = now.getTime() - 2 * 24 * 60 * 60 * 1000;

  const { data: season } = await admin.from("seasons").select("id").eq("is_current", true).maybeSingle();
  if (!season?.id) return { checked: 0, deferred: 0, alertsCreated: 0, alertsResolved: 0 };

  const [{ data: gameweeks, error: gameweekError }, { data: latestImport }] = await Promise.all([
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
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (gameweekError) throw gameweekError;

  const attemptedDates = new Set<string>(
    Array.isArray((latestImport as any)?.details?.dates)
      ? (latestImport as any).details.dates.map((value: unknown) => String(value))
      : [],
  );

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

    // The daily importer runs before this health check. Do not treat an empty
    // database as "no fixtures" until this exact fixture date was actually
    // attempted by the latest completed provider import.
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
      ? "No eligible fixtures were found after the scheduled provider preload completed for this fixture date. Review the gameweek dates and selection rule before members make picks."
      : `Only ${eligibleCount} eligible fixtures were found after provider preload. This may be an international or cup weekend; review the gameweek schedule if required.`;
    const details = {
      eligibleCount,
      threshold: WARNING_THRESHOLD,
      preloadWindowDays: PRELOAD_WINDOW_DAYS,
      fixtureDate,
      providerDateAttempted: true,
      latestImportCompletedAt: (latestImport as any)?.completed_at ?? null,
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
