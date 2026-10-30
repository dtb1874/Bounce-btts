import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runSelectedOddsRefresh } from "@/lib/api-football";

export async function POST(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!bearer) return NextResponse.json({ error: "Sign in to refresh odds." }, { status: 401 });
  try {
    const admin = createAdminClient();
    const { data: { user }, error: authError } = await admin.auth.getUser(bearer);
    if (authError || !user) return NextResponse.json({ error: "Session expired." }, { status: 401 });
    const { data: profile } = await admin.from("profiles").select("active,approved,role").eq("id",user.id).maybeSingle();
    if (!profile?.active || !profile?.approved || profile.role === "guest") return NextResponse.json({ error: "Member access required." }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    const gameweekId = typeof body?.gameweekId === "string" ? body.gameweekId : "";
    if (!/^[0-9a-f-]{36}$/i.test(gameweekId)) return NextResponse.json({ error: "Invalid gameweek." }, { status: 400 });
    const { data: gameweek, error: gameweekError } = await admin.from("gameweeks").select("id,locks_at,status").eq("id",gameweekId).maybeSingle();
    if (gameweekError) throw gameweekError;
    if (!gameweek || Date.parse(gameweek.locks_at) <= Date.now() || gameweek.status === "complete") return NextResponse.json({ error: "Odds refresh is only available before the gameweek deadline." }, { status: 409 });
    const fixtureId = typeof body?.fixtureId === "string" && /^[0-9a-f-]{36}$/i.test(body.fixtureId) ? body.fixtureId : undefined;
    if (body?.fixtureId && !fixtureId) return NextResponse.json({ error: "Invalid fixture." }, { status: 400 });
    const result = await runSelectedOddsRefresh(gameweekId,fixtureId);
    const { data: predictions, error: predictionError } = await admin.from("predictions").select("fixture_id").eq("gameweek_id",gameweekId).not("fixture_id","is",null);
    if (predictionError) throw predictionError;
    const ids = [...new Set((predictions ?? []).map(p => p.fixture_id).filter(Boolean))];
    const { data: fixtures, error: fixturesError } = ids.length
      ? await admin.from("fixtures").select("id,home_team,away_team,kickoff_at,odds_fractional").in("id",ids)
      : { data: [], error: null };
    if (fixturesError) throw fixturesError;
    return NextResponse.json({ ...result, fixtures: fixtures ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch(error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Odds could not be refreshed." }, { status: 500 });
  }
}
