import { createAdminClient } from "@/lib/supabase/admin";
import { pointsForScore } from "@/lib/scoring";

const API_BASE = "https://v3.football.api-sports.io";
const UK_COUNTRIES = new Set(["England", "Scotland", "Wales", "Northern Ireland", "Northern-Ireland"]);
const FINISHED = new Set(["FT", "AET", "PEN"]);
const AFFECTING_STATUSES = new Set(["PST", "CANC", "ABD", "SUSP", "INT", "TBD"]);
const BOOKMAKER_PRIORITY = ["Bet365", "Paddy Power", "William Hill", "Sky Bet", "Betfair"];

function londonParts(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { year: get("year"), month: get("month"), day: get("day"), weekday: get("weekday"), hour: get("hour"), minute: get("minute") };
}

function londonDate(value: string | Date) {
  const p = londonParts(value);
  return `${p.year}-${p.month}-${p.day}`;
}

function isExcluded(home: string, away: string) {
  const teams = `${home} ${away}`.toLowerCase();
  return teams.includes("heart of midlothian") || /(^|\s)hearts($|\s)/.test(teams)
    || teams.includes("hibernian") || /(^|\s)hibs($|\s)/.test(teams);
}

function isEligible(item: any) {
  const country = String(item.league?.country ?? "");
  const home = String(item.teams?.home?.name ?? "");
  const away = String(item.teams?.away?.name ?? "");
  const kickoff = londonParts(String(item.fixture?.date ?? ""));
  const status = String(item.fixture?.status?.short ?? "NS");
  return UK_COUNTRIES.has(country) && kickoff.weekday === "Sat" && kickoff.hour === "15" && kickoff.minute === "00"
    && !isExcluded(home, away) && ["NS", "TBD"].includes(status);
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
  const payload = await api("/odds", { fixture: providerId, bet: betId }, tracker);
  const bookmakers = payload.response?.[0]?.bookmakers ?? [];
  const sorted = [...bookmakers].sort((a: any, b: any) => {
    const ai = BOOKMAKER_PRIORITY.indexOf(String(a.name));
    const bi = BOOKMAKER_PRIORITY.indexOf(String(b.name));
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });
  for (const bookmaker of sorted) {
    for (const bet of bookmaker.bets ?? []) {
      const yes = (bet.values ?? []).find((value: any) => String(value.value).toLowerCase() === "yes");
      if (yes?.odd) return { odds: decimalToFractional(yes.odd), bookmaker: String(bookmaker.name) };
    }
  }
  return { odds: null, bookmaker: null };
}

async function createAffectedAlerts(admin: ReturnType<typeof createAdminClient>, fixture: any, before: any, after: any) {
  const { data: predictions } = await admin.from("predictions").select("id,member_id,gameweek_id").eq("fixture_id", fixture.id);
  if (!predictions?.length) return 0;
  const changes: string[] = [];
  if (before.kickoff_at !== after.kickoff_at) changes.push(`Kick-off changed from ${before.kickoff_at} to ${after.kickoff_at}`);
  if (before.status !== after.status) changes.push(`Status changed from ${before.status} to ${after.status}`);
  if (before.home_team !== after.home_team || before.away_team !== after.away_team) changes.push("Teams changed");
  if (before.is_eligible && !after.is_eligible) changes.push("Fixture is no longer eligible");
  if (!changes.length) return 0;
  const alerts = predictions.map((prediction: any) => ({
    alert_type: "fixture_change_affecting_pick",
    severity: AFFECTING_STATUSES.has(after.status) || !after.is_eligible ? "critical" : "warning",
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
      ? await admin.from("gameweeks").select("id,number,opens_at,locks_at").eq("season_id", season.id).order("number")
      : { data: [] as any[] };
    const now = Date.now();
    const upper = now + 15 * 86400000;
    const requestedIds = new Set((requestedGameweekIds ?? []).filter(Boolean));
    const targetWeeks = requestedIds.size
      ? (gameweeks ?? []).filter((gw: any) => requestedIds.has(String(gw.id)))
      : (gameweeks ?? []).filter((gw: any) => {
          const sat = new Date(new Date(gw.locks_at).getTime() + 24 * 3600000);
          return sat.getTime() >= now - 2 * 86400000 && sat.getTime() <= upper;
        });
    if (requestedIds.size && !targetWeeks.length) throw new Error("The selected gameweek could not be found in the current season.");
    const dateToGameweek = new Map<string, any>();
    for (const gw of targetWeeks) dateToGameweek.set(londonDate(new Date(new Date(gw.locks_at).getTime() + 24 * 3600000)), gw);
    const dates = [...dateToGameweek.keys()].sort().slice(0, 3);
    summary.dates = dates;

    for (const date of dates) {
      const payload = await api("/fixtures", { date, timezone: "Europe/London" }, tracker);
      const incoming = (payload.response ?? []).filter((item: any) => UK_COUNTRIES.has(String(item.league?.country ?? "")));
      for (const item of incoming) {
        const providerId = String(item.fixture.id);
        const gameweek = dateToGameweek.get(date);
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
          is_eligible: isEligible(item),
          provider_updated_at: item.fixture?.timestamp ? new Date(Number(item.fixture.timestamp) * 1000).toISOString() : null,
          last_synced_at: new Date().toISOString(),
        };
        const { data: existing } = await admin.from("fixtures").select("*").eq("provider_fixture_id", providerId).maybeSingle();
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
      let candidatesQuery = admin.from("fixtures").select("id,provider_fixture_id,kickoff_at,is_eligible,status")
        .not("provider_fixture_id", "is", null).eq("is_eligible", true).in("status", ["NS", "TBD"]);
      candidatesQuery = requestedIds.size
        ? candidatesQuery.in("gameweek_id", targetWeeks.map((week: any) => week.id))
        : candidatesQuery.gte("kickoff_at", new Date(now).toISOString()).lte("kickoff_at", new Date(upper).toISOString());
      const { data: candidates } = await candidatesQuery.order("kickoff_at").limit(60);
      for (const fixture of candidates ?? []) {
        if (tracker.remaining !== null && tracker.remaining <= 8) break;
        if (tracker.used >= 75) break;
        const providerId = String(fixture.provider_fixture_id ?? "").trim();
        // API-Football only accepts its numeric fixture IDs. Manual and Sky IDs
        // must never be sent to the odds endpoint.
        if (!/^\d+$/.test(providerId)) continue;
        try {
          const result = await fixtureOdds(providerId, betId, tracker);
          const { error: oddsError } = await admin.from("fixtures").update({
            odds_fractional: result.odds,
            odds_bookmaker: result.bookmaker,
            odds_checked_at: new Date().toISOString(),
          }).eq("id", fixture.id);
          if (oddsError) throw oddsError;
          if (result.odds) summary.oddsUpdated += 1;
        } catch (oddsError) {
          // One unavailable or malformed odds response must not cancel the
          // complete fixture import. Keep the run partial and continue.
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
