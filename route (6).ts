import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { pointsForScore } from "@/lib/scoring";

export async function PATCH(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { admin, user } = context;
  const body = await request.json();
  const fixtureId = String(body.fixtureId ?? "");
  const homeScore = Number(body.homeScore);
  const awayScore = Number(body.awayScore);
  if (!fixtureId || !Number.isInteger(homeScore) || homeScore < 0 || !Number.isInteger(awayScore) || awayScore < 0) {
    return NextResponse.json({ error: "Enter valid full-time scores." }, { status: 400 });
  }
  const points = pointsForScore(homeScore, awayScore);
  const { error } = await admin.from("fixtures").update({
    home_score: homeScore,
    away_score: awayScore,
    status: "FT",
    completed_at: new Date().toISOString(),
  }).eq("id", fixtureId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await admin.from("predictions").update({ points_awarded: points }).eq("fixture_id", fixtureId);
  await admin.from("audit_log").insert({ actor_id: user.id, action: "result_saved", entity_type: "fixture", entity_id: fixtureId, details: { homeScore, awayScore, points } });
  return NextResponse.json({ ok: true, points });
}
