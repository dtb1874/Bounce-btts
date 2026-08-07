import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const UK_COUNTRIES = new Set(["England", "Scotland", "Wales", "Northern-Ireland"]);
const DISALLOWED = ["heart of midlothian", "hearts"];

function authorised(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.API_FOOTBALL_KEY) return NextResponse.json({ error: "Missing API_FOOTBALL_KEY" }, { status: 500 });

  const date = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const url = new URL("https://v3.football.api-sports.io/fixtures");
  url.searchParams.set("date", date);
  url.searchParams.set("timezone", "Europe/London");

  const response = await fetch(url, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY },
    cache: "no-store"
  });
  if (!response.ok) return NextResponse.json({ error: "Football provider failed" }, { status: 502 });

  const payload = await response.json();
  const fixtures = (payload.response ?? []).filter((item: any) => {
    const country = item.league?.country;
    const time = String(item.fixture?.date ?? "").slice(11, 16);
    const home = String(item.teams?.home?.name ?? "").toLowerCase();
    const away = String(item.teams?.away?.name ?? "").toLowerCase();
    const hearts = DISALLOWED.some(name => home.includes(name) || away.includes(name));
    const status = item.fixture?.status?.short;
    return UK_COUNTRIES.has(country) && time === "15:00" && !hearts && ["NS", "TBD"].includes(status);
  }).map((item: any) => ({
    provider_fixture_id: String(item.fixture.id),
    competition: item.league.name,
    country: item.league.country,
    home_team: item.teams.home.name,
    away_team: item.teams.away.name,
    kickoff_at: item.fixture.date,
    status: item.fixture.status.short,
    source: "api-football",
    is_eligible: true
  }));

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { error } = await supabase.from("fixtures").upsert(fixtures, { onConflict: "provider_fixture_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ imported: fixtures.length, date });
}
