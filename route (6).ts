import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { admin, user: actor } = context;
  const body = await request.json();
  const gameweekId = String(body.gameweekId ?? "");
  const memberId = String(body.memberId ?? "");
  const fixtureId = String(body.fixtureId ?? "");

  if (!gameweekId || !memberId || !fixtureId) {
    return NextResponse.json({ error: "Player, gameweek and fixture are required." }, { status: 400 });
  }

  const [{ data: member }, { data: fixture }, { data: gameweek }] = await Promise.all([
    admin.from("profiles").select("id,display_name,active").eq("id", memberId).maybeSingle(),
    admin.from("fixtures").select("id,gameweek_id,home_team,away_team,is_eligible,status").eq("id", fixtureId).maybeSingle(),
    admin.from("gameweeks").select("id,number,status,locks_at").eq("id", gameweekId).maybeSingle(),
  ]);

  if (!member?.id || !member.active) return NextResponse.json({ error: "Choose an active player." }, { status: 400 });
  if (!gameweek?.id) return NextResponse.json({ error: "Gameweek not found." }, { status: 404 });
  if (!fixture?.id || fixture.gameweek_id !== gameweekId || !fixture.is_eligible) {
    return NextResponse.json({ error: "Choose an eligible fixture from this gameweek." }, { status: 400 });
  }
  if (["FT", "AET", "PEN", "CANC", "PST"].includes(String(fixture.status).toUpperCase())) {
    return NextResponse.json({ error: "That fixture is no longer available for selection." }, { status: 400 });
  }

  const { data: taken } = await admin
    .from("predictions")
    .select("id,member_id")
    .eq("gameweek_id", gameweekId)
    .eq("fixture_id", fixtureId)
    .neq("member_id", memberId)
    .maybeSingle();

  if (taken?.id) {
    const { data: takenProfile } = await admin.from("profiles").select("display_name").eq("id", taken.member_id).maybeSingle();
    return NextResponse.json({ error: `That fixture is already selected by ${takenProfile?.display_name ?? "another player"}.` }, { status: 409 });
  }

  const { data: existing } = await admin
    .from("predictions")
    .select("id,fixture_id")
    .eq("gameweek_id", gameweekId)
    .eq("member_id", memberId)
    .maybeSingle();

  const now = new Date().toISOString();
  let prediction;
  if (existing?.id) {
    const response = await admin
      .from("predictions")
      .update({ fixture_id: fixtureId, points_awarded: null, updated_at: now })
      .eq("id", existing.id)
      .select()
      .single();
    if (response.error) return NextResponse.json({ error: response.error.message }, { status: 400 });
    prediction = response.data;
  } else {
    const response = await admin
      .from("predictions")
      .insert({ gameweek_id: gameweekId, member_id: memberId, fixture_id: fixtureId, points_awarded: null })
      .select()
      .single();
    if (response.error) return NextResponse.json({ error: response.error.message }, { status: 400 });
    prediction = response.data;
  }

  // A valid selection replaces any missed-selection penalty for this player and gameweek.
  await admin
    .from("score_adjustments")
    .delete()
    .eq("gameweek_id", gameweekId)
    .eq("member_id", memberId)
    .eq("source", "automatic");

  await admin.from("audit_log").insert({
    actor_id: actor.id,
    action: existing?.id ? "admin_prediction_replaced" : "admin_prediction_added",
    entity_type: "prediction",
    entity_id: prediction.id,
    details: {
      gameweekId,
      gameweekNumber: gameweek.number,
      memberId,
      memberName: member.display_name,
      fixtureId,
      fixture: `${fixture.home_team} v ${fixture.away_team}`,
      previousFixtureId: existing?.fixture_id ?? null,
      gameweekStatus: gameweek.status,
      deadline: gameweek.locks_at,
      adminOverride: true,
    },
  });

  return NextResponse.json({ prediction });
}

export async function DELETE(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { admin, user: actor } = context;
  const body = await request.json();
  const gameweekId = String(body.gameweekId ?? "");
  const memberId = String(body.memberId ?? "");
  if (!gameweekId || !memberId) return NextResponse.json({ error: "Player and gameweek are required." }, { status: 400 });

  const { data: existing } = await admin
    .from("predictions")
    .select("id,fixture_id")
    .eq("gameweek_id", gameweekId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (!existing?.id) return NextResponse.json({ error: "This player has no selection to remove." }, { status: 404 });

  const { error } = await admin.from("predictions").delete().eq("id", existing.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: gameweek } = await admin
    .from("gameweeks")
    .select("status,locks_at")
    .eq("id", gameweekId)
    .maybeSingle();
  if (gameweek && (gameweek.status !== "open" || new Date(gameweek.locks_at) <= new Date())) {
    await admin.rpc("apply_missed_pick_penalties", { p_gameweek_id: gameweekId });
  }

  await admin.from("audit_log").insert({
    actor_id: actor.id,
    action: "admin_prediction_removed",
    entity_type: "prediction",
    entity_id: existing.id,
    details: { gameweekId, memberId, fixtureId: existing.fixture_id, adminOverride: true },
  });

  return NextResponse.json({ ok: true });
}
