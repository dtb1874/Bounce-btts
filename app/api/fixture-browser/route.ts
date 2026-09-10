import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fixtureDateForGameweek } from "@/lib/gameweek-rules";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(accessToken);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await admin
    .from("profiles")
    .select("id,approved,active")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.approved || !profile.active) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const gameweekId = url.searchParams.get("gameweekId");
  let anchorDate = new Date();

  if (gameweekId) {
    const { data: gameweek, error: gameweekError } = await admin
      .from("gameweeks")
      .select("locks_at,selection_rule_mode,selection_weekday,selection_time,selection_times,selection_time_from,selection_time_to,one_off_rule")
      .eq("id", gameweekId)
      .maybeSingle();
    if (gameweekError) return NextResponse.json({ error: "Unable to load gameweek" }, { status: 500 });
    if (!gameweek) return NextResponse.json({ error: "Gameweek not found" }, { status: 404 });
    const fixtureDate = fixtureDateForGameweek(gameweek);
    anchorDate = new Date(`${fixtureDate}T12:00:00Z`);
  }

  const weekStart = new Date(Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth(), anchorDate.getUTCDate()));
  const mondayOffset = (weekStart.getUTCDay() + 6) % 7;
  weekStart.setUTCDate(weekStart.getUTCDate() - mondayOffset);
  const followingWeekEnd = new Date(weekStart);
  followingWeekEnd.setUTCDate(followingWeekEnd.getUTCDate() + 14);

  const { data: fixtures, error } = await admin
    .from("fixtures")
    .select("*")
    .gte("kickoff_at", weekStart.toISOString())
    .lt("kickoff_at", followingWeekEnd.toISOString())
    .order("kickoff_at")
    .order("competition")
    .order("home_team");

  if (error) return NextResponse.json({ error: "Unable to load fixtures" }, { status: 500 });
  return NextResponse.json({ fixtures: fixtures ?? [] });
}
