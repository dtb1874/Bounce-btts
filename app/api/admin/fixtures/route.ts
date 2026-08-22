import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { isExcludedBounceClub, kickoffMatchesSelectionRule, selectionRule } from "@/lib/gameweek-rules";

export async function POST(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { admin, user } = context;
  const body = await request.json();
  const home = String(body.homeTeam ?? "").trim();
  const away = String(body.awayTeam ?? "").trim();
  const kickoffAt = String(body.kickoffAt ?? "");
  const gameweekId = String(body.gameweekId ?? "");

  if (!home || !away || !gameweekId || !kickoffAt || Number.isNaN(Date.parse(kickoffAt))) {
    return NextResponse.json({ error: "Complete all fixture fields with a valid kick-off time." }, { status: 400 });
  }

  const { data: gameweek } = await admin
    .from("gameweeks")
    .select("id,selection_rule_mode,selection_weekday,selection_time")
    .eq("id", gameweekId)
    .maybeSingle();
  if (!gameweek?.id) return NextResponse.json({ error: "Gameweek not found." }, { status: 404 });

  if (isExcludedBounceClub(home, away)) {
    return NextResponse.json({ error: "Hearts and Hibs fixtures are excluded from normal Bounce selections." }, { status: 400 });
  }

  if (!kickoffMatchesSelectionRule(kickoffAt, gameweek)) {
    const rule = selectionRule(gameweek);
    const weekday = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][rule.weekday - 1];
    const ruleText = rule.mode === "any_kickoff" ? `any UK kick-off on ${weekday}` : `${weekday} at ${rule.time} UK time`;
    return NextResponse.json({ error: `This gameweek only allows ${ruleText}.` }, { status: 400 });
  }

  const { data, error } = await admin.from("fixtures").insert({
    gameweek_id: gameweekId,
    competition: String(body.competition ?? "Other UK Competition").trim(),
    country: String(body.country ?? "United Kingdom").trim(),
    home_team: home,
    away_team: away,
    kickoff_at: new Date(kickoffAt).toISOString(),
    odds_fractional: String(body.oddsFractional ?? "").trim() || null,
    odds_checked_at: body.oddsFractional ? new Date().toISOString() : null,
    status: "NS",
    source: "manual",
    is_eligible: true,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from("audit_log").insert({ actor_id: user.id, action: "fixture_added", entity_type: "fixture", entity_id: data.id, details: data });
  return NextResponse.json({ fixture: data });
}
