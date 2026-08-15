import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pointsForScore } from "@/lib/scoring";

const FINISHED = new Set(["FT", "AET", "PEN"]);

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

export async function GET(request: NextRequest) {
  const context = await requireActiveUser(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.API_FOOTBALL_KEY) return NextResponse.json({ error: "Missing API_FOOTBALL_KEY" }, { status: 500 });

  const gameweekId = request.nextUrl.searchParams.get("gameweekId") ?? "";
  if (!gameweekId) return NextResponse.json({ error: "Missing gameweekId" }, { status: 400 });

  const { admin } = context;
  const { data: predictions, error: predictionError } = await admin.from("predictions").select("fixture_id").eq("gameweek_id", gameweekId);
  if (predictionError) return NextResponse.json({ error: predictionError.message }, { status: 500 });

  const fixtureIds = Array.from(new Set((predictions ?? []).map(row => String(row.fixture_id)).filter(Boolean)));
  if (!fixtureIds.length) return NextResponse.json({ updated: 0, providerFixtures: 0, live: 0, finished: 0, fixtures: [] });

  const { data: fixtures, error: fixtureError } = await admin.from("fixtures").select("id,provider_fixture_id").in("id", fixtureIds).not("provider_fixture_id", "is", null);
  if (fixtureError) return NextResponse.json({ error: fixtureError.message }, { status: 500 });

  const providerToLocal = new Map<string, string>();
  for (const fixture of fixtures ?? []) if (fixture.provider_fixture_id != null) providerToLocal.set(String(fixture.provider_fixture_id), String(fixture.id));
  const providerIds = Array.from(providerToLocal.keys());
  if (!providerIds.length) return NextResponse.json({ updated: 0, providerFixtures: 0, live: 0, finished: 0, fixtures: [] });

  const batches: string[][] = [];
  for (let i = 0; i < providerIds.length; i += 20) batches.push(providerIds.slice(i, i + 20));

  let updated = 0;
  let live = 0;
  let finishedCount = 0;
  const now = new Date().toISOString();
  const liveFixtures: Array<{id:string;status:string;elapsed:number|null;homeScore:number|null;awayScore:number|null}> = [];

  for (const batch of batches) {
    const url = new URL("https://v3.football.api-sports.io/fixtures");
    url.searchParams.set("ids", batch.join("-"));
    url.searchParams.set("timezone", "Europe/London");
    const response = await fetch(url, { headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY }, next: { revalidate: 15 } });
    if (!response.ok) return NextResponse.json({ error: "Football provider failed" }, { status: 502 });
    const payload = await response.json();

    for (const item of payload.response ?? []) {
      const providerId = String(item.fixture?.id ?? "");
      const localId = providerToLocal.get(providerId);
      if (!localId) continue;
      const status = String(item.fixture?.status?.short ?? "NS");
      const elapsed = Number.isInteger(item.fixture?.status?.elapsed) ? Number(item.fixture.status.elapsed) : null;
      const extra = Number.isInteger(item.fixture?.status?.extra) ? Number(item.fixture.status.extra) : null;
      const displayElapsed = elapsed != null && extra != null && extra > 0 ? elapsed + extra : elapsed;
      const home = Number.isInteger(item.goals?.home) ? item.goals.home : null;
      const away = Number.isInteger(item.goals?.away) ? item.goals.away : null;
      const isFinished = FINISHED.has(status);
      if (["1H", "HT", "2H", "ET", "P", "BT", "INT"].includes(status)) live++;
      if (isFinished) finishedCount++;

      liveFixtures.push({ id: localId, status, elapsed: displayElapsed, homeScore: home, awayScore: away });

      const { error: updateError } = await admin.from("fixtures").update({ status, home_score: home, away_score: away, completed_at: isFinished ? now : null }).eq("id", localId);
      if (updateError) continue;
      updated++;

      if (isFinished && home != null && away != null) await admin.from("predictions").update({ points_awarded: pointsForScore(home, away) }).eq("fixture_id", localId);
    }
  }

  return NextResponse.json({ updated, providerFixtures: providerIds.length, live, finished: finishedCount, refreshedAt: now, fixtures: liveFixtures });
}
