import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const FINISHED = new Set(["FT", "AET", "PEN"]);
const MAX_BACKFILL_PER_REQUEST = 12;

type FixtureRow = {
  id: string;
  provider_fixture_id: string | number | null;
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
};

type ProviderTeamStats = {
  team?: { name?: string | null };
  statistics?: Array<{ type?: string | null; value?: number | string | null }>;
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
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function statValue(team: ProviderTeamStats | undefined, type: string) {
  const row = team?.statistics?.find((item) => item.type === type);
  if (row?.value == null || row.value === "") return null;
  const value = Number(row.value);
  return Number.isFinite(value) ? value : null;
}

async function fetchStats(providerFixtureId: string, homeTeam: string, awayTeam: string) {
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

export async function GET(request: Request) {
  const context = await requireActiveUser(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.API_FOOTBALL_KEY) return NextResponse.json({ error: "Missing API_FOOTBALL_KEY" }, { status: 500 });

  const { admin } = context;
  const { data: season, error: seasonError } = await admin.from("seasons").select("id").eq("is_current", true).maybeSingle();
  if (seasonError) return NextResponse.json({ error: seasonError.message }, { status: 500 });
  if (!season?.id) return NextResponse.json({ fixtures: [], coverage: 0, pending: 0, backfilled: 0 });

  const { data: gameweeks, error: gameweekError } = await admin.from("gameweeks").select("id").eq("season_id", season.id);
  if (gameweekError) return NextResponse.json({ error: gameweekError.message }, { status: 500 });
  const gameweekIds = (gameweeks ?? []).map((row) => String(row.id));
  if (!gameweekIds.length) return NextResponse.json({ fixtures: [], coverage: 0, pending: 0, backfilled: 0 });

  const { data: predictions, error: predictionError } = await admin.from("predictions").select("fixture_id").in("gameweek_id", gameweekIds);
  if (predictionError) return NextResponse.json({ error: predictionError.message }, { status: 500 });
  const fixtureIds = Array.from(new Set((predictions ?? []).map((row) => String(row.fixture_id)).filter(Boolean)));
  if (!fixtureIds.length) return NextResponse.json({ fixtures: [], coverage: 0, pending: 0, backfilled: 0 });

  const { data: fixtureData, error: fixtureError } = await admin
    .from("fixtures")
    .select("id,provider_fixture_id,home_team,away_team,status,home_score,away_score,home_shots,away_shots,home_shots_on_target,away_shots_on_target,stats_checked_at")
    .in("id", fixtureIds);
  if (fixtureError) return NextResponse.json({ error: fixtureError.message }, { status: 500 });

  const fixtures = (fixtureData ?? []) as FixtureRow[];
  const finished = fixtures.filter((fixture) => FINISHED.has(String(fixture.status)) && fixture.home_score != null && fixture.away_score != null);
  const missing = finished.filter((fixture) => fixture.provider_fixture_id != null && fixture.stats_checked_at == null);
  const batch = missing.slice(0, MAX_BACKFILL_PER_REQUEST);
  let backfilled = 0;

  for (const fixture of batch) {
    const providerId = String(fixture.provider_fixture_id ?? "");
    if (!providerId) continue;
    const stats = await fetchStats(providerId, fixture.home_team, fixture.away_team).catch(() => null);
    const checkedAt = new Date().toISOString();
    const update = stats
      ? { ...stats, stats_checked_at: checkedAt }
      : { stats_checked_at: checkedAt };
    const { error } = await admin.from("fixtures").update(update).eq("id", fixture.id);
    if (error) continue;
    fixture.stats_checked_at = checkedAt;
    if (stats) {
      fixture.home_shots = stats.home_shots;
      fixture.away_shots = stats.away_shots;
      fixture.home_shots_on_target = stats.home_shots_on_target;
      fixture.away_shots_on_target = stats.away_shots_on_target;
    }
    backfilled++;
  }

  const usable = finished.filter((fixture) =>
    fixture.home_shots != null && fixture.away_shots != null &&
    fixture.home_shots_on_target != null && fixture.away_shots_on_target != null,
  );

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
    })),
    coverage: usable.length,
    finished: finished.length,
    pending: Math.max(0, missing.length - batch.length),
    backfilled,
  });
}
