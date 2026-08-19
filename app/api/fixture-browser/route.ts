import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const now = new Date();
  const currentWeekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const mondayOffset = (currentWeekStart.getUTCDay() + 6) % 7;
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - mondayOffset);
  const followingWeekEnd = new Date(currentWeekStart);
  followingWeekEnd.setUTCDate(followingWeekEnd.getUTCDate() + 14);

  const { data: fixtures, error } = await admin
    .from("fixtures")
    .select("*")
    .gte("kickoff_at", currentWeekStart.toISOString())
    .lt("kickoff_at", followingWeekEnd.toISOString())
    .order("kickoff_at")
    .order("competition")
    .order("home_team");

  if (error) return NextResponse.json({ error: "Unable to load fixtures" }, { status: 500 });
  return NextResponse.json({ fixtures: fixtures ?? [] });
}
