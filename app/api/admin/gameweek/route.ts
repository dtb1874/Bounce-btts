import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { applyMissedPickPenalties } from "@/lib/missed-picks";

function validStatus(value: unknown) {
  return ["open", "locked", "complete"].includes(String(value)) ? String(value) : "open";
}

function validSelectionMode(value: unknown) {
  return String(value) === "any_kickoff" ? "any_kickoff" : "exact_time";
}

function validWeekday(value: unknown) {
  const weekday = Number(value);
  return Number.isInteger(weekday) && weekday >= 1 && weekday <= 7 ? weekday : 6;
}

function validSelectionTime(value: unknown) {
  const time = String(value ?? "15:00").slice(0, 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  return time;
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
    selection_rule_mode: "exact_time",
    selection_weekday: 6,
    selection_time: "15:00",
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
  const opensAtRaw = body.opensAt == null || String(body.opensAt).trim() === "" ? null : String(body.opensAt);
  const selectionRuleMode = validSelectionMode(body.selectionRuleMode);
  const selectionWeekday = validWeekday(body.selectionWeekday);
  const selectionTime = validSelectionTime(body.selectionTime);

  if (!id || !locksAt || Number.isNaN(new Date(locksAt).getTime())) {
    return NextResponse.json({ error: "Gameweek and deadline are required." }, { status: 400 });
  }
  if (opensAtRaw && Number.isNaN(new Date(opensAtRaw).getTime())) {
    return NextResponse.json({ error: "Choose a valid opening date and time." }, { status: 400 });
  }
  if (!selectionTime) {
    return NextResponse.json({ error: "Choose a valid eligible kick-off time." }, { status: 400 });
  }

  const normalisedDeadline = new Date(locksAt).toISOString();
  const normalisedOpening = opensAtRaw ? new Date(opensAtRaw).toISOString() : null;
  if (normalisedOpening && new Date(normalisedOpening) >= new Date(normalisedDeadline)) {
    return NextResponse.json({ error: "The gameweek must open before its deadline." }, { status: 400 });
  }

  const { error } = await admin.from("gameweeks").update({
    status,
    opens_at: normalisedOpening,
    locks_at: normalisedDeadline,
    selection_rule_mode: selectionRuleMode,
    selection_weekday: selectionWeekday,
    selection_time: selectionTime,
  }).eq("id", id);
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
  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "gameweek_updated",
    entity_type: "gameweek",
    entity_id: id,
    details: {
      status,
      opensAt: normalisedOpening,
      locksAt: normalisedDeadline,
      selectionRuleMode,
      selectionWeekday,
      selectionTime,
    },
  });
  return NextResponse.json({ ok: true });
}
