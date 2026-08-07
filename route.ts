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
  const points = Number(body.points);
  const reason = String(body.reason ?? "Missed selection").trim() || "Missed selection";

  if (!gameweekId || !memberId || !Number.isInteger(points)) {
    return NextResponse.json({ error: "Player, gameweek and a whole-number points value are required." }, { status: 400 });
  }

  const [{ data: gameweek }, { data: member }] = await Promise.all([
    admin.from("gameweeks").select("id,number").eq("id", gameweekId).maybeSingle(),
    admin.from("profiles").select("id,display_name").eq("id", memberId).maybeSingle(),
  ]);

  if (!gameweek?.id || !member?.id) {
    return NextResponse.json({ error: "Gameweek or player not found." }, { status: 404 });
  }

  const { data: adjustment, error } = await admin
    .from("score_adjustments")
    .upsert({
      gameweek_id: gameweekId,
      member_id: memberId,
      points,
      reason,
      source: "admin",
      updated_at: new Date().toISOString(),
    }, { onConflict: "gameweek_id,member_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from("audit_log").insert({
    actor_id: actor.id,
    action: "score_adjustment_saved",
    entity_type: "score_adjustment",
    entity_id: adjustment.id,
    details: {
      gameweekId,
      gameweekNumber: gameweek.number,
      memberId,
      memberName: member.display_name,
      points,
      reason,
    },
  });

  return NextResponse.json({ adjustment });
}

export async function DELETE(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { admin, user: actor } = context;
  const body = await request.json();
  const gameweekId = String(body.gameweekId ?? "");
  const memberId = String(body.memberId ?? "");
  if (!gameweekId || !memberId) {
    return NextResponse.json({ error: "Player and gameweek are required." }, { status: 400 });
  }

  const { data: existing } = await admin
    .from("score_adjustments")
    .select("id,points,reason,source")
    .eq("gameweek_id", gameweekId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (!existing?.id) return NextResponse.json({ error: "This player has no points adjustment." }, { status: 404 });

  const { error } = await admin.from("score_adjustments").delete().eq("id", existing.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from("audit_log").insert({
    actor_id: actor.id,
    action: "score_adjustment_removed",
    entity_type: "score_adjustment",
    entity_id: existing.id,
    details: { gameweekId, memberId, previous: existing },
  });

  return NextResponse.json({ ok: true });
}
