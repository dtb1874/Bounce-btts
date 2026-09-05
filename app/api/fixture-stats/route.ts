import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const FINISHED = new Set(["FT", "AET", "PEN"]);
const MAX_BACKFILL_PER_REQUEST = 12;
const MAX_FALLBACK_PER_REQUEST = 5;
const FALLBACK_LEAGUE = "eng.5";

type FixtureRow = {
  id: string;
  provider_fixture_id: string | number | null;
  competition: string;
  kickoff_at: string;
  home_team: string;
  away_team: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_shots: number | null;
  away_shots: number | null;
  home_shots_on_target: number | null;
  away_shots_on_target: number | null;
  stats_checked_at: string | null;
  stats_fallback_checked_at: string | null;
  stats_source: string | null;
};

type ProviderTeamStats = {
  team?: { name?: string | null };
  statistics?: Array<{ type?: string | null; value?: number | string | null }>;
};

type ShotStats = {
  home_shots: number | null;
  away_shots: number | null;
  home_shots_on_target: number | null;
  away_shots_on_target: number | null;
};

async function requireActiveUser(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const accessToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!accessToken) return null;
  const admin = createAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(accessToken);
  if (error || !user) return null;
  const { data: profile } = await admin.from("profiles").select("id,approved,active").eq("id", user.id).maybeSingle();
  if (!profile?.approved || !profile.active) return null;
  return { admin, user };
}

function normaliseTeam(value: string | null | undefined) {
  return String(value ?? "").toLowerCase().replace(/\b(fc|afc|town|united|harriers)\b/g, " ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function statValue(team: ProviderTeamStats | undefined, type: string) {
  const row = team?.statistics?.find((item) => item.type === type);
  if (row?.value == null || row.value === "") return null;
  const value = Number(row.value);
  return Number.isFinite(value) ? value : null;
}

function complete(stats: ShotStats | null | undefined) {
  return Boolean(stats && stats.home_shots != null && stats.away_shots != null && stats.home_shots_on_target != null && stats.away_shots_on_target != null);
}

function fixtureComplete(fixture: FixtureRow) {
  return fixture.home_shots != null && fixture.away_shots != null && fixture.home_shots_on_target != null && fixture.away_shots_on_target != null;
}

async function fetchPrimaryStats(providerFixtureId: string, homeTeam: string, awayTeam: string): Promise<ShotStats | null> {
  const url = new URL("https://v3.football.api-sports.io/fixtures/statistics");
  url.searchParams.set("fixture", providerFixtureId);
  const response = await fetch(url, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY ?? "" },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const payload = await response.json();
  const teams = (payload.response ?? []) as ProviderTeamStats[];
  if (!teams.length) return null;

  const homeKey = normaliseTeam(homeTeam);
  const awayKey = normaliseTeam(awayTeam);
  const home = teams.find((row) => normaliseTeam(row.team?.name) === homeKey) ?? teams[0];
  const away = teams.find((row) => normaliseTeam(row.team?.name) === awayKey) ?? teams.find((row) => row !== home) ?? teams[1];

  return {
    home_shots: statValue(home, "Total Shots"),
    away_shots: statValue(away, "Total Shots"),
    home_shots_on_target: statValue(home, "Shots on Goal"),
    away_shots_on_target: statValue(away, "Shots on Goal"),
  };
}

function dateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function eventCompetitors(event: any) {
  return event?.competitions?.[0]?.competitors ?? [];
}

function competitorName(row: any) {
  return String(row?.team?.displayName ?? row?.team?.name ?? row?.team?.shortDisplayName ?? "");
}

function competitorScore(row: any) {
  const value = Number(row?.score);
  return Number.isFinite(value) ? value : null;
}

function eventMatchesFixture(event: any, fixture: FixtureRow) {
  const competitors = eventCompetitors(event);
  const home = competitors.find((row: any) => row?.homeAway === "home") ?? competitors[0];
  const away = competitors.find((row: any) => row?.homeAway === "away") ?? competitors[1];
  if (!home || !away) return false;
  const teamsMatch = normaliseTeam(competitorName(home)) === normaliseTeam(fixture.home_team)
    && normaliseTeam(competitorName(away)) === normaliseTeam(fixture.away_team);
  if (!teamsMatch) return false;

  // Never use a fallback event unless it independently agrees with our primary final score.
  const homeScore = competitorScore(home);
  const awayScore = competitorScore(away);
  if (homeScore == null || awayScore == null || homeScore !== fixture.home_score || awayScore !== fixture.away_score) return false;

  const completed = Boolean(event?.status?.type?.completed ?? event?.competitions?.[0]?.status?.type?.completed);
  return completed;
}

function summaryStat(team: any, name: string) {
  const row = (team?.statistics ?? []).find((item: any) => item?.name === name || item?.abbreviation === name);
  const value = Number(row?.displayValue ?? row?.value);
  return Number.isFinite(value) ? value : null;
}

async function fetchFallbackStats(fixture: FixtureRow): Promise<ShotStats | null> {
  // Fallback is deliberately post-match only and currently restricted to the English National League.
  if (!FINISHED.has(fixture.status) || fixture.home_score == null || fixture.away_score == null) return null;
  if (fixture.competition.trim().toLowerCase() !== "national league") return null;
  const date = dateKey(fixture.kickoff_at);
  if (!date) return null;

  const scoreboardUrl = new URL(`https://worldcup26.ir/get/soccer/${FALLBACK_LEAGUE}/scoreboard`);
  scoreboardUrl.searchParams.set("dates", date);
  const scoreboardResponse = await fetch(scoreboardUrl, { cache: "no-store" });
  if (!scoreboardResponse.ok) return null;
  const scoreboard = await scoreboardResponse.json();
  const events = Array.isArray(scoreboard?.events) ? scoreboard.events : Array.isArray(scoreboard?.response) ? scoreboard.response : [];
  const event = events.find((candidate: any) => eventMatchesFixture(candidate, fixture));
  const eventId = String(event?.id ?? "");
  if (!eventId) return null;

  const summaryUrl = new URL(`https://worldcup26.ir/get/soccer/${FALLBACK_LEAGUE}/summary`);
  summaryUrl.searchParams.set("event", eventId);
  const summaryResponse = await fetch(summaryUrl, { cache: "no-store" });
  if (!summaryResponse.ok) return null;
  const summary = await summaryResponse.json();

  const summaryCompetition = summary?.header?.competitions?.[0];
  if (!summaryCompetition?.status?.type?.completed) return null;
  const summaryCompetitors = summaryCompetition?.competitors ?? [];
  const summaryHome = summaryCompetitors.find((row: any) => row?.homeAway === "home") ?? summaryCompetitors[0];
  const summaryAway = summaryCompetitors.find((row: any) => row?.homeAway === "away") ?? summaryCompetitors[1];
  if (!summaryHome || !summaryAway) return null;
  if (normaliseTeam(competitorName(summaryHome)) !== normaliseTeam(fixture.home_team) || normaliseTeam(competitorName(summaryAway)) !== normaliseTeam(fixture.away_team)) return null;
  if (competitorScore(summaryHome) !== fixture.home_score || competitorScore(summaryAway) !== fixture.away_score) return null;

  const boxTeams = summary?.boxscore?.teams ?? [];
  const home = boxTeams.find((row: any) => row?.homeAway === "home") ?? boxTeams[0];
  const away = boxTeams.find((row: any) => row?.homeAway === "away") ?? boxTeams[1];
  if (!home || !away) return null;

  const stats: ShotStats = {
    home_shots: summaryStat(home, "totalShots"),
    away_shots: summaryStat(away, "totalShots"),
    home_shots_on_target: summaryStat(home, "shotsOnTarget"),
    away_shots_on_target: summaryStat(away, "shotsOnTarget"),
  };
  return complete(stats) ? stats : null;
}

export async function GET(request: Request) {
  const context = await requireActiveUser(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.API_FOOTBALL_KEY) return NextResponse.json({ error: "Missing API_FOOTBALL_KEY" }, { status: 500 });

  const { admin } = context;
  const { data: season, error: seasonError } = await admin.from("seasons").select("id").eq("is_current", true).maybeSingle();
  if (seasonError) return NextResponse.json({ error: seasonError.message }, { status: 500 });
  if (!season?.id) return NextResponse.json({ fixtures: [], coverage: 0, pending: 0, backfilled: 0, fallbackBackfilled: 0 });

  const { data: gameweeks, error: gameweekError } = await admin.from("gameweeks").select("id").eq("season_id", season.id);
  if (gameweekError) return NextResponse.json({ error: gameweekError.message }, { status: 500 });
  const gameweekIds = (gameweeks ?? []).map((row) => String(row.id));
  if (!gameweekIds.length) return NextResponse.json({ fixtures: [], coverage: 0, pending: 0, backfilled: 0, fallbackBackfilled: 0 });

  const { data: predictions, error: predictionError } = await admin.from("predictions").select("fixture_id").in("gameweek_id", gameweekIds);
  if (predictionError) return NextResponse.json({ error: predictionError.message }, { status: 500 });
  const fixtureIds = Array.from(new Set((predictions ?? []).map((row) => String(row.fixture_id)).filter(Boolean)));
  if (!fixtureIds.length) return NextResponse.json({ fixtures: [], coverage: 0, pending: 0, backfilled: 0, fallbackBackfilled: 0 });

  const { data: fixtureData, error: fixtureError } = await admin
    .from("fixtures")
    .select("id,provider_fixture_id,competition,kickoff_at,home_team,away_team,status,home_score,away_score,home_shots,away_shots,home_shots_on_target,away_shots_on_target,stats_checked_at,stats_fallback_checked_at,stats_source")
    .in("id", fixtureIds);
  if (fixtureError) return NextResponse.json({ error: fixtureError.message }, { status: 500 });

  const fixtures = (fixtureData ?? []) as FixtureRow[];
  const finished = fixtures.filter((fixture) => FINISHED.has(String(fixture.status)) && fixture.home_score != null && fixture.away_score != null);
  const missing = finished.filter((fixture) => fixture.provider_fixture_id != null && fixture.stats_checked_at == null);
  const batch = missing.slice(0, MAX_BACKFILL_PER_REQUEST);
  let backfilled = 0;

  // Primary provider always gets first refusal. This path is unchanged for live-score ownership: it only reads statistics for DB fixtures already marked final.
  for (const fixture of batch) {
    const providerId = String(fixture.provider_fixture_id ?? "");
    if (!providerId) continue;
    const stats = await fetchPrimaryStats(providerId, fixture.home_team, fixture.away_team).catch(() => null);
    const checkedAt = new Date().toISOString();
    const update = stats
      ? { ...stats, stats_checked_at: checkedAt, stats_source: complete(stats) ? "api-football" : "api-football-partial" }
      : { stats_checked_at: checkedAt };
    const { error } = await admin.from("fixtures").update(update).eq("id", fixture.id);
    if (error) continue;
    fixture.stats_checked_at = checkedAt;
    if (stats) {
      fixture.home_shots = stats.home_shots;
      fixture.away_shots = stats.away_shots;
      fixture.home_shots_on_target = stats.home_shots_on_target;
      fixture.away_shots_on_target = stats.away_shots_on_target;
      fixture.stats_source = complete(stats) ? "api-football" : "api-football-partial";
    }
    backfilled++;
  }

  // Secondary provider can run only after API-Football has already been checked and only for still-incomplete final matches.
  const fallbackCandidates = finished.filter((fixture) =>
    fixture.stats_checked_at != null &&
    !fixtureComplete(fixture) &&
    fixture.stats_fallback_checked_at == null &&
    fixture.competition.trim().toLowerCase() === "national league",
  ).slice(0, MAX_FALLBACK_PER_REQUEST);
  let fallbackBackfilled = 0;

  for (const fixture of fallbackCandidates) {
    const fallback = await fetchFallbackStats(fixture).catch(() => null);
    const checkedAt = new Date().toISOString();
    const update: Record<string, unknown> = { stats_fallback_checked_at: checkedAt };
    if (fallback) {
      // Never overwrite a primary-source stat. Fallback is permitted to fill nulls only.
      if (fixture.home_shots == null) update.home_shots = fallback.home_shots;
      if (fixture.away_shots == null) update.away_shots = fallback.away_shots;
      if (fixture.home_shots_on_target == null) update.home_shots_on_target = fallback.home_shots_on_target;
      if (fixture.away_shots_on_target == null) update.away_shots_on_target = fallback.away_shots_on_target;
      const hadPrimaryValue = fixture.home_shots != null || fixture.away_shots != null || fixture.home_shots_on_target != null || fixture.away_shots_on_target != null;
      update.stats_source = hadPrimaryValue ? "mixed-api-football-worldcup26" : "worldcup26";
    }
    const { error } = await admin.from("fixtures").update(update).eq("id", fixture.id);
    if (error) continue;
    fixture.stats_fallback_checked_at = checkedAt;
    if (fallback) {
      if (fixture.home_shots == null) fixture.home_shots = fallback.home_shots;
      if (fixture.away_shots == null) fixture.away_shots = fallback.away_shots;
      if (fixture.home_shots_on_target == null) fixture.home_shots_on_target = fallback.home_shots_on_target;
      if (fixture.away_shots_on_target == null) fixture.away_shots_on_target = fallback.away_shots_on_target;
      fixture.stats_source = String(update.stats_source);
      fallbackBackfilled++;
    }
  }

  const usable = finished.filter(fixtureComplete);
  const fallbackRemaining = finished.filter((fixture) =>
    fixture.stats_checked_at != null && !fixtureComplete(fixture) && fixture.stats_fallback_checked_at == null && fixture.competition.trim().toLowerCase() === "national league",
  ).length;

  return NextResponse.json({
    fixtures: finished.map((fixture) => ({
      id: fixture.id,
      homeShots: fixture.home_shots,
      awayShots: fixture.away_shots,
      homeShotsOnTarget: fixture.home_shots_on_target,
      awayShotsOnTarget: fixture.away_shots_on_target,
      homeScore: fixture.home_score,
      awayScore: fixture.away_score,
      checkedAt: fixture.stats_checked_at,
      fallbackCheckedAt: fixture.stats_fallback_checked_at,
      statsSource: fixture.stats_source,
    })),
    coverage: usable.length,
    finished: finished.length,
    pending: Math.max(0, missing.length - batch.length) + fallbackRemaining,
    backfilled,
    fallbackBackfilled,
  });
}
