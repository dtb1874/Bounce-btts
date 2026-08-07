import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { applyMissedPickPenalties } from "@/lib/missed-picks";

function validStatus(value: unknown) {
  return ["open", "locked", "complete"].includes(String(value)) ? String(value) : "open";
}

export async function POST(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { admin, user } = context;
  const body = await request.json();
  const locksAt = String(body.locksAt ?? "");
  if (!locksAt || Number.isNaN(new Date(locksAt).getTime())) {
    return NextResponse.json({ error: "Choose a valid gameweek deadline." }, { status: 400 });
  }

  const { data: season } = await admin.from("seasons").select("id").eq("is_current", true).single();
  if (!season?.id) return NextResponse.json({ error: "No current season is configured." }, { status: 400 });

  const { data: latest } = await admin
    .from("gameweeks")
    .select("number")
    .eq("season_id", season.id)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: gameweek, error } = await admin.from("gameweeks").insert({
    season_id: season.id,
    number: Number(latest?.number ?? 0) + 1,
    status: "open",
    opens_at: new Date().toISOString(),
    locks_at: new Date(locksAt).toISOString(),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "gameweek_created",
    entity_type: "gameweek",
    entity_id: gameweek.id,
    details: gameweek,
  });
  return NextResponse.json({ gameweek });
}

export async function PATCH(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { admin, user } = context;
  const body = await request.json();
  const id = String(body.id ?? "");
  const status = validStatus(body.status);
  const locksAt = String(body.locksAt ?? "");
  if (!id || !locksAt || Number.isNaN(new Date(locksAt).getTime())) {
    return NextResponse.json({ error: "Gameweek and deadline are required." }, { status: 400 });
  }
  const normalisedDeadline = new Date(locksAt).toISOString();
  const { error } = await admin.from("gameweeks").update({ status, locks_at: normalisedDeadline }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (status !== "open" || new Date(normalisedDeadline) <= new Date()) {
    await applyMissedPickPenalties(admin, id);
  } else {
    // Extending/reopening the deadline removes only automatic penalties.
    // Explicit admin adjustments remain untouched.
    await admin
      .from("score_adjustments")
      .delete()
      .eq("gameweek_id", id)
      .eq("source", "automatic");
  }
  await admin.from("audit_log").insert({ actor_id: user.id, action: "gameweek_updated", entity_type: "gameweek", entity_id: id, details: { status, locksAt } });
  return NextResponse.json({ ok: true });
}
