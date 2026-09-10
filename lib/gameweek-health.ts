import type { SupabaseClient } from "@supabase/supabase-js";
import { fixtureDateForGameweek } from "@/lib/gameweek-rules";
import {
  FIXTURE_HEALTH_ALERT_DAYS,
  FIXTURE_IMPORT_LOOKBACK_DAYS,
  FIXTURE_PRELOAD_DAYS,
  fixtureDateWithinDays,
} from "@/lib/fixture-import-policy";

const ALERT_TYPE = "gameweek_fixture_availability";
const WARNING_THRESHOLD = 12;

export async function checkGameweekFixtureHealth(admin: SupabaseClient) {
  const now = new Date();
  const nowMs = now.getTime();

  const { data: season } = await admin.from("seasons").select("id").eq("is_current", true).maybeSingle();
  if (!season?.id) return { checked: 0, deferred: 0, alertsCreated: 0, alertsResolved: 0 };

  const [
    { data: gameweeks, error: gameweekError },
    { data: latestImport },
    { data: activeAlerts, error: activeAlertsError },
  ] = await Promise.all([
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
      .eq("trigger_source", "cron")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("admin_alerts")
      .select("id,gameweek_id,resolved")
      .eq("alert_type", ALERT_TYPE)
      .eq("resolved", false),
  ]);
  if (gameweekError) throw gameweekError;
  if (activeAlertsError) throw activeAlertsError;

  const attemptedDates = new Set<string>(
    Array.isArray((latestImport as any)?.details?.dates)
      ? (latestImport as any).details.dates.map((value: unknown) => String(value))
      : [],
  );
  const alertByGameweek = new Map(
    (activeAlerts ?? []).filter((row: any) => row.gameweek_id).map((row: any) => [String(row.gameweek_id), row]),
  );

  let checked = 0;
  let deferred = 0;
  let alertsCreated = 0;
  let alertsResolved = 0;

  async function resolveExisting(gameweekId: string) {
    const existing = alertByGameweek.get(gameweekId) as any;
    if (!existing?.id) return;
    const { error } = await admin
      .from("admin_alerts")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
    alertByGameweek.delete(gameweekId);
    alertsResolved += 1;
  }

  for (const gameweek of gameweeks ?? []) {
    const fixtureDate = fixtureDateForGameweek(gameweek as any);
    const inAlertWindow = fixtureDateWithinDays(
      fixtureDate,
      nowMs,
      FIXTURE_HEALTH_ALERT_DAYS,
      FIXTURE_IMPORT_LOOKBACK_DAYS,
    );

    // Fixture catalogue loading begins a full week before the alert window.
    // If a gameweek is not yet within the 14-day health window, any older
    // premature availability warning should be cleared rather than retained.
    if (!inAlertWindow) {
      await resolveExisting(String(gameweek.id));
      continue;
    }

    // The daily cron importer runs before this health check and preloads a
    // 21-day horizon. Do not interpret an empty fixture table as a genuine
    // zero-fixture condition unless this exact fixture date was attempted by
    // that cron import.
    if (!attemptedDates.has(fixtureDate)) {
      deferred += 1;
      await resolveExisting(String(gameweek.id));
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
    const existing = alertByGameweek.get(String(gameweek.id)) as any;
    if (eligibleCount >= WARNING_THRESHOLD) {
      await resolveExisting(String(gameweek.id));
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
      fixtureDate,
      preloadWindowDays: FIXTURE_PRELOAD_DAYS,
      alertWindowDays: FIXTURE_HEALTH_ALERT_DAYS,
      providerDateAttempted: true,
      latestCronImportCompletedAt: (latestImport as any)?.completed_at ?? null,
      checkedAt: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error } = await admin.from("admin_alerts").update({ severity, title, message, details }).eq("id", existing.id);
      if (error) throw error;
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
