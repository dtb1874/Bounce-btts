import { createAdminClient } from "@/lib/supabase/admin";
import { pointsForScore } from "@/lib/scoring";
import {
  fixtureDateForGameweek,
  fixtureMatchesSelectionRule,
  isEligibleProviderFixture,
} from "@/lib/gameweek-rules";

const API_BASE = "https://v3.football.api-sports.io";
const UK_COUNTRIES = new Set(["England", "Scotland", "Wales", "Northern Ireland", "Northern-Ireland"]);
const FINISHED = new Set(["FT", "AET", "PEN"]);
const AFFECTING_STATUSES = new Set(["PST", "CANC", "ABD", "SUSP", "INT", "TBD"]);
const BOOKMAKER_PRIORITY = ["Bet365", "Paddy Power", "William Hill", "Sky Bet", "Betfair"];

function canonicalTeam(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function sameFixtureTeams(left: { home_team?: string; away_team?: string }, right: { home_team?: string; away_team?: string }) {
  return canonicalTeam(String(left.home_team ?? "")) === canonicalTeam(String(right.home_team ?? ""))
    && canonicalTeam(String(left.away_team ?? "")) === canonicalTeam(String(right.away_team ?? ""));
}

function decimalToFractional(value: string | number | null | undefined) {
  const decimal = Number(value);
  if (!Number.isFinite(decimal) || decimal <= 1) return null;
  const target = decimal - 1;
  let bestN = 0, bestD = 1, bestError = Infinity;
  for (let d = 1; d <= 100; d += 1) {
    const n = Math.round(target * d);
    const error = Math.abs(target - n / d);
    if (error < bestError) { bestN = n; bestD = d; bestError = error; }
  }
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : Math.abs(a);
  const g = gcd(bestN, bestD) || 1;
  return `${bestN / g}/${bestD / g}`;
}

type Tracker = { used: number; limit: number | null; remaining: number | null };

async function api(path: string, params: Record<string, string>, tracker: Tracker) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY is not configured.");
  const url = new URL(path, API_BASE);
  for (const [keyName, value] of Object.entries(params)) url.searchParams.set(keyName, value);
  const response = await fetch(url, { headers: { "x-apisports-key": key }, cache: "no-store" });
  tracker.used += 1;
  const limit = Number(response.headers.get("x-ratelimit-requests-limit"));
  const remaining = Number(response.headers.get("x-ratelimit-requests-remaining"));
  if (Number.isFinite(limit)) tracker.limit = limit;
  if (Number.isFinite(remaining)) tracker.remaining = remaining;
  if (!response.ok) throw new Error(`API-Football ${path} returned ${response.status}.`);
  const payload = await response.json();
  if (payload.errors && Object.keys(payload.errors).length) throw new Error(`API-Football error: ${JSON.stringify(payload.errors)}`);
  return payload;
}

async function bttsBetId(tracker: Tracker) {
  const payload = await api("/odds/bets", { search: "Both Teams To Score" }, tracker);
  const exact = (payload.response ?? []).find((item: any) => String(item.name).toLowerCase().includes("both teams"));
  return exact?.id ? String(exact.id) : null;
}

async function fixtureOdds(providerId: string, betId: string, tracker: Tracker) {
  const bookmakers: any[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const payload = await api("/odds", { fixture: providerId, bet: betId, page: String(page) }, tracker);
    for (const item of payload.response ?? []) bookmakers.push(...(item.bookmakers ?? []));
    totalPages = Math.max(1, Number(payload.paging?.total) || 1);
    page += 1;
  } while (page <= totalPages && page <= 5 && (tracker.remaining === null || tracker.remaining > 8) && tracker.used < 75);

  const sorted = [...bookmakers].sort((a: any, b: any) => {
    const ai = BOOKMAKER_PRIORITY.indexOf(String(a.name));
    const bi = BOOKMAKER_PRIORITY.indexOf(String(b.name));
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });
  for (const bookmaker of sorted) {
    for (const bet of bookmaker.bets ?? []) {
      const yes = (bet.values ?? []).find((value: any) => String(value.value).trim().toLowerCase() === "yes");
      const fractional = decimalToFractional(yes?.odd);
      if (fractional) return { odds: fractional, bookmaker: String(bookmaker.name) };
    }
  }
  return { odds: null, bookmaker: null };
}

export async function runSelectedOddsRefresh(gameweekId: string) {
  const admin = createAdminClient();
  const tracker: Tracker = { used: 0, limit: null, remaining: null };
  const { data: predictions, error: predictionsError } = await admin.from("predictions").select("fixture_id").eq("gameweek_id", gameweekId).not("fixture_id", "is", null);
  if (predictionsError) throw predictionsError;
  const fixtureIds = [...new Set((predictions ?? []).map((row: any) => String(row.fixture_id)).filter(Boolean))];
  if (!fixtureIds.length) return { checked: 0, updated: 0, unavailable: 0, requestsUsed: 0 };
  const { data: fixtures, error: fixturesError } = await admin.from("fixtures").select("id,provider_fixture_id,status").in("id", fixtureIds).in("status", ["NS", "TBD"]);
  if (fixturesError) throw fixturesError;
  const betId = await bttsBetId(tracker);
  if (!betId) throw new Error("BTTS odds market could not be found.");
  let checked = 0, updated = 0, unavailable = 0;
  for (const fixture of fixtures ?? []) {
    const providerId = String(fixture.provider_fixture_id ?? "").trim();
    if (!/^\d+$/.test(providerId)) { unavailable += 1; continue; }
    if (tracker.remaining !== null && tracker.remaining <= 8) break;
    if (tracker.used >= 75) break;
    const result = await fixtureOdds(providerId, betId, tracker);
    checked += 1;
    const oddsPatch = result.odds
      ? { odds_fractional: result.odds, odds_bookmaker: result.bookmaker, odds_checked_at: new Date().toISOString() }
      : { odds_checked_at: new Date().toISOString() };
    const { error } = await admin.from("fixtures").update(oddsPatch).eq("id", fixture.id);
    if (error) throw error;
    if (result.odds) updated += 1; else unavailable += 1;
  }
  return { checked, updated, unavailable, requestsUsed: tracker.used };
}

function sameInstant(a: unknown, b: unknown) {
  const left = Date.parse(String(a ?? ""));
  const right = Date.parse(String(b ?? ""));
  return Number.isFinite(left) && Number.isFinite(right) && left === right;
}

async function createAffectedAlerts(admin: ReturnType<typeof createAdminClient>, fixture: any, before: any, after: any) {
  const { data: predictions } = await admin.from("predictions").select("id,member_id,gameweek_id").eq("fixture_id", fixture.id);
  if (!predictions?.length) return 0;

  const changes: string[] = [];
  const kickoffChanged = !sameInstant(before.kickoff_at, after.kickoff_at);
  const teamsChanged = before.home_team !== after.home_team || before.away_team !== after.away_team;
  const enteredAffectingStatus = before.status !== after.status && AFFECTING_STATUSES.has(String(after.status));

  if (kickoffChanged) changes.push(`Kick-off changed from ${before.kickoff_at} to ${after.kickoff_at}`);
  if (enteredAffectingStatus) changes.push(`Status changed from ${before.status} to ${after.status}`);
  if (teamsChanged) changes.push("Teams changed");
  if (!changes.length) return 0;

  const selectionInvalidated = kickoffChanged && Boolean(before.is_eligible) && !Boolean(after.is_eligible);
  const alerts = predictions.map((prediction: any) => ({
    alert_type: "fixture_change_affecting_pick",
    severity: enteredAffectingStatus || selectionInvalidated ? "critical" : "warning",
    title: `Pick affected: ${after.home_team} v ${after.away_team}`,
    message: changes.join(". "), fixture_id: fixture.id, gameweek_id: prediction.gameweek_id,
    prediction_id: prediction.id, member_id: prediction.member_id,
    details: { before, after },
  }));
  const { error } = await admin.from("admin_alerts").insert(alerts);
  if (error) throw error;
  return alerts.length;
}

export async function runFootballImport(triggerSource: "cron" | "admin", requestedGameweekIds?: string[]) {
  const admin = createAdminClient();
  const tracker: Tracker = { used: 0, limit: null, remaining: null };
  const { data: run, error: runError } = await admin.from("fixture_import_runs").insert({ trigger_source: triggerSource, status: "running" }).select().single();
  if (runError) throw runError;
  const summary = { fixturesAdded: 0, fixturesUpdated: 0, oddsUpdated: 0, resultsUpdated: 0, alertsCreated: 0, dates: [] as string[], errors: [] as string[] };
  try {
    const { data: season } = await admin.from("seasons").select("id").eq("is_current", true).maybeSingle();
    const { data: gameweeks } = season?.id
      ? await admin.from("gameweeks")
          .select("id,number,opens_at,locks_at,selection_rule_mode,selection_weekday,selection_time")
          .eq("season_id", season.id)
          .order("number")
      : { data: [] as any[] };

    const now = Date.now();
    const upper = now + 15 * 86400000;
    const requestedIds = new Set((requestedGameweekIds ?? []).filter(Boolean));
    const targetWeeks = requestedIds.size
      ? (gameweeks ?? []).filter((gw: any) => requestedIds.has(String(gw.id)))
      : (gameweeks ?? []).filter((gw: any) => {
          const fixtureDate = fixtureDateForGameweek(gw);
          const fixtureDay = Date.parse(`${fixtureDate}T12:00:00Z`);
          return fixtureDay >= now - 2 * 86400000 && fixtureDay <= upper;
        });

    if (requestedIds.size && !targetWeeks.length) throw new Error("The selected gameweek could not be found in the current season.");

    const dateToGameweeks = new Map<string, any[]>();
    for (const gw of targetWeeks) {
      const date = fixtureDateForGameweek(gw);
      dateToGameweeks.set(date, [...(dateToGameweeks.get(date) ?? []), gw]);
    }
    const dates = [...dateToGameweeks.keys()].sort().slice(0, 3);
    summary.dates = dates;

    for (const date of dates) {
      const payload = await api("/fixtures", { date, timezone: "Europe/London" }, tracker);
      const incoming = (payload.response ?? []).filter((item: any) => UK_COUNTRIES.has(String(item.league?.country ?? "")));
      const dateGameweeks = dateToGameweeks.get(date) ?? [];

      for (const item of incoming) {
        const providerId = String(item.fixture.id);
        const gameweek = dateGameweeks.find((gw: any) => fixtureMatchesSelectionRule(item, gw)) ?? dateGameweeks[0] ?? null;
        const next = {
          gameweek_id: gameweek?.id ?? null,
          provider_fixture_id: providerId,
          competition: String(item.league?.name ?? "Unknown competition"),
          country: String(item.league?.country ?? "United Kingdom"),
          home_team: String(item.teams?.home?.name ?? "Home"),
          away_team: String(item.teams?.away?.name ?? "Away"),
          kickoff_at: String(item.fixture?.date),
          status: String(item.fixture?.status?.short ?? "NS"),
          home_score: Number.isInteger(item.goals?.home) ? item.goals.home : null,
          away_score: Number.isInteger(item.goals?.away) ? item.goals.away : null,
          completed_at: FINISHED.has(String(item.fixture?.status?.short)) ? new Date().toISOString() : null,
          source: "api-football",
          is_eligible: Boolean(gameweek && isEligibleProviderFixture(item, gameweek)),
          provider_updated_at: item.fixture?.timestamp ? new Date(Number(item.fixture.timestamp) * 1000).toISOString() : null,
          last_synced_at: new Date().toISOString(),
        };

        const { data: providerRows } = await admin.from("fixtures").select("*").eq("provider_fixture_id", providerId).limit(1);
        let existing = providerRows?.[0] ?? null;
        if (!existing && next.gameweek_id) {
          const { data: sameKickoffRows } = await admin.from("fixtures").select("*")
            .eq("gameweek_id", next.gameweek_id).eq("kickoff_at", next.kickoff_at);
          existing = (sameKickoffRows ?? []).find((row: any) => sameFixtureTeams(row, next)) ?? null;
        }

        if (existing) {
          summary.alertsCreated += await createAffectedAlerts(admin, existing, existing, next);
          const { error } = await admin.from("fixtures").update(next).eq("id", existing.id);
          if (error) throw error;
          summary.fixturesUpdated += 1;
          if (FINISHED.has(next.status) && next.home_score !== null && next.away_score !== null) {
            await admin.from("predictions").update({ points_awarded: pointsForScore(next.home_score, next.away_score) }).eq("fixture_id", existing.id);
            summary.resultsUpdated += 1;
          }
        } else {
          const { error } = await admin.from("fixtures").insert(next);
          if (error) throw error;
          summary.fixturesAdded += 1;
        }
      }
    }

    const betId = await bttsBetId(tracker);
    if (betId) {
      const targetWeekIds = targetWeeks.map((week: any) => week.id);
      const { data: selectedPredictions } = targetWeekIds.length
        ? await admin.from("predictions").select("fixture_id").in("gameweek_id", targetWeekIds).not("fixture_id", "is", null)
        : { data: [] as any[] };
      const selectedFixtureIds = [...new Set((selectedPredictions ?? []).map((row: any) => String(row.fixture_id)).filter(Boolean))];
      const { data: candidates } = selectedFixtureIds.length
        ? await admin.from("fixtures").select("id,provider_fixture_id,kickoff_at,is_eligible,status")
            .in("id", selectedFixtureIds).not("provider_fixture_id", "is", null).in("status", ["NS", "TBD"])
        : { data: [] as any[] };
      for (const fixture of candidates ?? []) {
        if (tracker.remaining !== null && tracker.remaining <= 8) break;
        if (tracker.used >= 75) break;
        const providerId = String(fixture.provider_fixture_id ?? "").trim();
        if (!/^\d+$/.test(providerId)) continue;
        try {
          const result = await fixtureOdds(providerId, betId, tracker);
          const oddsPatch = result.odds
            ? { odds_fractional: result.odds, odds_bookmaker: result.bookmaker, odds_checked_at: new Date().toISOString() }
            : { odds_checked_at: new Date().toISOString() };
          const { error: oddsError } = await admin.from("fixtures").update(oddsPatch).eq("id", fixture.id);
          if (oddsError) throw oddsError;
          if (result.odds) summary.oddsUpdated += 1;
        } catch (oddsError) {
          summary.errors.push(`Odds ${providerId}: ${oddsError instanceof Error ? oddsError.message : "update failed"}`);
        }
      }
    }

    const status = summary.errors.length ? "partial" : "success";
    await admin.from("fixture_import_runs").update({ status, completed_at: new Date().toISOString(), requests_used: tracker.used,
      requests_limit: tracker.limit, requests_remaining: tracker.remaining, fixtures_added: summary.fixturesAdded,
      fixtures_updated: summary.fixturesUpdated, odds_updated: summary.oddsUpdated, results_updated: summary.resultsUpdated,
      alerts_created: summary.alertsCreated, details: summary }).eq("id", run.id);
    return { ok: true, runId: run.id, quota: tracker, ...summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    summary.errors.push(message);
    await admin.from("fixture_import_runs").update({ status: "failed", completed_at: new Date().toISOString(), requests_used: tracker.used,
      requests_limit: tracker.limit, requests_remaining: tracker.remaining, details: summary, error_message: message }).eq("id", run.id);
    throw error;
  }
}
