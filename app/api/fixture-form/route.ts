import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const API_BASE = "https://v3.football.api-sports.io";
const FINISHED = new Set(["FT", "AET", "PEN"]);

async function provider(path: string, params: Record<string, string>) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY is not configured.");
  const url = new URL(path, API_BASE);
  Object.entries(params).forEach(([name, value]) => url.searchParams.set(name, value));
  const response = await fetch(url, { headers: { "x-apisports-key": key }, cache: "no-store" });
  if (!response.ok) throw new Error(`API-Football returned ${response.status}.`);
  const payload = await response.json();
  if (payload.errors && Object.keys(payload.errors).length) throw new Error(`API-Football error: ${JSON.stringify(payload.errors)}`);
  return payload;
}

function resultFor(teamId: number, item: any) {
  const homeId = Number(item.teams?.home?.id), awayId = Number(item.teams?.away?.id);
  const home = Number(item.goals?.home), away = Number(item.goals?.away);
  if (!Number.isFinite(home) || !Number.isFinite(away) || home === away) return "D";
  return (teamId === homeId ? home > away : away > home) ? "W" : "L";
}
function compactMatch(teamId: number, item: any) {
  const isHome = Number(item.teams?.home?.id) === teamId;
  const opponent = isHome ? item.teams?.away : item.teams?.home;
  const home = Number.isInteger(item.goals?.home) ? Number(item.goals.home) : null;
  const away = Number.isInteger(item.goals?.away) ? Number(item.goals.away) : null;
  return {
    id: String(item.fixture?.id ?? ""), date: String(item.fixture?.date ?? ""), opponent: String(opponent?.name ?? "Opponent"), opponentLogo: String(opponent?.logo ?? ""),
    venue: isHome ? "H" : "A", score: home !== null && away !== null ? `${home}-${away}` : "—", result: resultFor(teamId, item), btts: home !== null && away !== null ? home > 0 && away > 0 : false,
  };
}
function isDomesticCompetitive(item: any) {
  const country = String(item.league?.country ?? "").trim().toLowerCase();
  const name = String(item.league?.name ?? "").trim().toLowerCase();
  if (!country || ["world", "europe", "international"].includes(country)) return false;
  const excluded = ["friendly", "friendlies", "champions league", "europa league", "conference league", "uefa", "world cup", "nations league", "euro championship", "international champions"];
  return !excluded.some((term) => name.includes(term));
}
function takeDomesticFinished(payload: any, teamId: number) {
  return (payload.response ?? [])
    .filter((item: any) => FINISHED.has(String(item.fixture?.status?.short ?? "")) && isDomesticCompetitive(item))
    .sort((a: any, b: any) => {
      const at = Number(a.fixture?.timestamp ?? Date.parse(String(a.fixture?.date ?? "")) / 1000);
      const bt = Number(b.fixture?.timestamp ?? Date.parse(String(b.fixture?.date ?? "")) / 1000);
      return bt - at;
    })
    .slice(0, 5)
    .map((item: any) => compactMatch(teamId, item));
}

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(accessToken);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await admin.from("profiles").select("approved,active").eq("id", user.id).maybeSingle();
  if (!profile?.approved || !profile.active) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const fixtureId = new URL(request.url).searchParams.get("fixtureId") ?? "";
  if (!fixtureId) return NextResponse.json({ error: "Fixture is required" }, { status: 400 });
  const { data: fixture } = await admin.from("fixtures").select("id,provider_fixture_id,home_team,away_team").eq("id", fixtureId).maybeSingle();
  if (!fixture) return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
  const providerId = String(fixture.provider_fixture_id ?? "");
  if (!/^\d+$/.test(providerId)) return NextResponse.json({ error: "Recent form is unavailable for this fixture" }, { status: 404 });

  try {
    const detail = await provider("/fixtures", { id: providerId, timezone: "Europe/London" });
    const source = detail.response?.[0];
    const homeTeam = source?.teams?.home, awayTeam = source?.teams?.away;
    if (!homeTeam?.id || !awayTeam?.id) throw new Error("Provider team identifiers are unavailable.");
    const [homePayload, awayPayload] = await Promise.all([
      provider("/fixtures", { team: String(homeTeam.id), last: "20", timezone: "Europe/London" }),
      provider("/fixtures", { team: String(awayTeam.id), last: "20", timezone: "Europe/London" }),
    ]);
    return NextResponse.json({
      fixture: { home: String(homeTeam.name ?? fixture.home_team), away: String(awayTeam.name ?? fixture.away_team) },
      home: { id: Number(homeTeam.id), name: String(homeTeam.name ?? fixture.home_team), logo: String(homeTeam.logo ?? ""), matches: takeDomesticFinished(homePayload, Number(homeTeam.id)) },
      away: { id: Number(awayTeam.id), name: String(awayTeam.name ?? fixture.away_team), logo: String(awayTeam.logo ?? ""), matches: takeDomesticFinished(awayPayload, Number(awayTeam.id)) },
    }, { headers: { "cache-control": "private, max-age=300" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Recent form could not be loaded" }, { status: 502 });
  }
}
