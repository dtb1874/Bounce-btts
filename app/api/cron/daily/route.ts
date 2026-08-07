import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pointsForScore } from "@/lib/scoring";
import { applyMissedPickPenalties } from "@/lib/missed-picks";

const UK_COUNTRIES = new Set(["England", "Scotland", "Wales", "Northern-Ireland", "Northern Ireland"]);
const FINISHED = new Set(["FT", "AET", "PEN"]);

function authorised(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

function nextSaturdayDate() {
  const now = new Date();
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
  const get = (type: string) => dateParts.find((part) => part.type === type)?.value ?? "";
  const weekday = get("weekday");
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  const base = new Date(`${get("year")}-${get("month")}-${get("day")}T12:00:00Z`);
  const days = (6 - weekdayIndex + 7) % 7;
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function isExcludedFixture(home: string, away: string) {
  const teams = `${home} ${away}`.toLowerCase();
  return teams.includes("heart of midlothian")
    || /(^|\s)hearts($|\s)/.test(teams)
    || teams.includes("hibernian")
    || /(^|\s)hibs($|\s)/.test(teams);
}

async function providerFixtures(date: string) {
  const url = new URL("https://v3.football.api-sports.io/fixtures");
  url.searchParams.set("date", date);
  url.searchParams.set("timezone", "Europe/London");
  const response = await fetch(url, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Football provider returned ${response.status}`);
  const payload = await response.json();
  return Array.isArray(payload.response) ? payload.response : [];
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const admin = createAdminClient();
  let penaltiesApplied = 0;
  try {
    penaltiesApplied = await applyMissedPickPenalties(admin);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not apply missed-selection penalties." }, { status: 500 });
  }

  if (!process.env.API_FOOTBALL_KEY) {
    return NextResponse.json({
      ok: true,
      mode: "manual",
      penaltiesApplied,
      message: "API_FOOTBALL_KEY is not configured. Manual fixtures and results remain available.",
    });
  }

  let resultsUpdated = 0;
  let fixturesImported = 0;
  const errors: string[] = [];

  // Refresh unfinished provider-backed fixtures first, so yesterday's results are scored.
  const { data: unfinished } = await admin
    .from("fixtures")
    .select("id,provider_fixture_id,status")
    .not("provider_fixture_id", "is", null)
    .not("status", "in", '("FT","AET","PEN","CANC","ABD","AWD","WO")');

  for (const fixture of unfinished ?? []) {
    try {
      const url = new URL("https://v3.football.api-sports.io/fixtures");
      url.searchParams.set("id", String(fixture.provider_fixture_id));
      url.searchParams.set("timezone", "Europe/London");
      const response = await fetch(url, {
        headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY },
        cache: "no-store",
      });
      if (!response.ok) continue;
      const payload = await response.json();
      const item = payload.response?.[0];
      if (!item) continue;
      const status = String(item.fixture?.status?.short ?? fixture.status);
      const homeScore = item.goals?.home;
      const awayScore = item.goals?.away;
      const finished = FINISHED.has(status);

      await admin.from("fixtures").update({
        status,
        home_score: Number.isInteger(homeScore) ? homeScore : null,
        away_score: Number.isInteger(awayScore) ? awayScore : null,
        completed_at: finished ? new Date().toISOString() : null,
      }).eq("id", fixture.id);

      if (finished && Number.isInteger(homeScore) && Number.isInteger(awayScore)) {
        await admin.from("predictions").update({ points_awarded: pointsForScore(homeScore, awayScore) }).eq("fixture_id", fixture.id);
        resultsUpdated += 1;
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Result refresh failed");
    }
  }

  // Import the next Saturday's eligible UK 3pm fixtures into the current open gameweek.
  try {
    const { data: season } = await admin.from("seasons").select("id").eq("is_current", true).single();
    const { data: gameweek } = season?.id
      ? await admin.from("gameweeks").select("id,status").eq("season_id", season.id).eq("status", "open").order("number", { ascending: false }).limit(1).maybeSingle()
      : { data: null };

    if (gameweek?.id) {
      const date = nextSaturdayDate();
      const incoming = await providerFixtures(date);
      const fixtures = incoming.filter((item: any) => {
        const country = String(item.league?.country ?? "");
        const kickoff = String(item.fixture?.date ?? "");
        const home = String(item.teams?.home?.name ?? "");
        const away = String(item.teams?.away?.name ?? "");
        const status = String(item.fixture?.status?.short ?? "");
        return UK_COUNTRIES.has(country)
          && kickoff.slice(11, 16) === "15:00"
          && !isExcludedFixture(home, away)
          && ["NS", "TBD"].includes(status);
      }).map((item: any) => ({
        gameweek_id: gameweek.id,
        provider_fixture_id: String(item.fixture.id),
        competition: String(item.league.name),
        country: String(item.league.country),
        home_team: String(item.teams.home.name),
        away_team: String(item.teams.away.name),
        kickoff_at: String(item.fixture.date),
        status: String(item.fixture.status.short),
        source: "api-football",
        is_eligible: true,
      }));

      if (fixtures.length) {
        const { error } = await admin.from("fixtures").upsert(fixtures, { onConflict: "provider_fixture_id" });
        if (error) throw error;
        fixturesImported = fixtures.length;
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Fixture import failed");
  }

  return NextResponse.json({ ok: errors.length === 0, fixturesImported, resultsUpdated, penaltiesApplied, errors });
}
