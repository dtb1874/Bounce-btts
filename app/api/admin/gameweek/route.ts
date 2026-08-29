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
function validTime(value: unknown, fallback = "15:00") {
  const time = String(value ?? fallback).slice(0, 5);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : null;
}
function defaultOpeningForDeadline(deadlineIso: string) {
  return new Date(new Date(deadlineIso).getTime() - 4 * 24 * 60 * 60 * 1000).toISOString();
}
function timeWindow(body: any) {
  const from = validTime(body.selectionTimeFrom ?? body.selectionTime, "15:00");
  const to = validTime(body.selectionTimeTo ?? body.selectionTimeFrom ?? body.selectionTime, from ?? "15:00");
  if (!from || !to || from > to) return null;
  return { from, to };
}
function legacyWindowArray(from: string, to: string) {
  return from === to ? [from] : [from, to];
}

export async function POST(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { admin, user } = context;
  const body = await request.json();
  const locksAt = String(body.locksAt ?? "");
  const opensAtRaw = body.opensAt == null || String(body.opensAt).trim() === "" ? null : String(body.opensAt);
  const selectionRuleMode = validSelectionMode(body.selectionRuleMode);
  const selectionWeekday = validWeekday(body.selectionWeekday);
  const window = timeWindow(body);
  const insertAfterGameweekId = String(body.insertAfterGameweekId ?? "").trim();

  if (!locksAt || Number.isNaN(new Date(locksAt).getTime())) return NextResponse.json({ error: "Choose a valid gameweek deadline." }, { status: 400 });
  if (opensAtRaw && Number.isNaN(new Date(opensAtRaw).getTime())) return NextResponse.json({ error: "Choose a valid opening date and time." }, { status: 400 });
  if (!window) return NextResponse.json({ error: "Choose a valid kick-off From and To time. From cannot be later than To." }, { status: 400 });

  const normalisedDeadline = new Date(locksAt).toISOString();
  const normalisedOpening = opensAtRaw ? new Date(opensAtRaw).toISOString() : defaultOpeningForDeadline(normalisedDeadline);
  if (new Date(normalisedOpening) >= new Date(normalisedDeadline)) return NextResponse.json({ error: "The gameweek must open before its deadline." }, { status: 400 });

  if (insertAfterGameweekId) {
    const { data: gameweek, error } = await admin.rpc("insert_one_off_gameweek", {
      p_after_gameweek_id: insertAfterGameweekId,
      p_opens_at: normalisedOpening,
      p_locks_at: normalisedDeadline,
      p_selection_rule_mode: selectionRuleMode,
      p_selection_weekday: selectionWeekday,
      p_selection_time_from: window.from,
      p_selection_time_to: window.to,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await admin.from("audit_log").insert({ actor_id: user.id, action: "one_off_gameweek_inserted", entity_type: "gameweek", entity_id: gameweek?.id ?? null, details: { gameweek, insertAfterGameweekId } });
    return NextResponse.json({ gameweek });
  }

  const { data: season } = await admin.from("seasons").select("id").eq("is_current", true).single();
  if (!season?.id) return NextResponse.json({ error: "No current season is configured." }, { status: 400 });
  const { data: latest } = await admin.from("gameweeks").select("number").eq("season_id", season.id).order("number", { ascending: false }).limit(1).maybeSingle();
  const { data: gameweek, error } = await admin.from("gameweeks").insert({
    season_id: season.id,
    number: Number(latest?.number ?? 0) + 1,
    status: "open",
    opens_at: normalisedOpening,
    locks_at: normalisedDeadline,
    selection_rule_mode: selectionRuleMode,
    selection_weekday: selectionWeekday,
    selection_time: window.from,
    selection_times: legacyWindowArray(window.from, window.to),
    selection_time_from: window.from,
    selection_time_to: window.to,
    one_off_rule: false,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await admin.from("audit_log").insert({ actor_id: user.id, action: "gameweek_created", entity_type: "gameweek", entity_id: gameweek.id, details: gameweek });
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
  const window = timeWindow(body);
  const oneOffRule = body.oneOffRule === true;

  if (!id || !locksAt || Number.isNaN(new Date(locksAt).getTime())) return NextResponse.json({ error: "Gameweek and deadline are required." }, { status: 400 });
  if (opensAtRaw && Number.isNaN(new Date(opensAtRaw).getTime())) return NextResponse.json({ error: "Choose a valid opening date and time." }, { status: 400 });
  if (!window) return NextResponse.json({ error: "Choose a valid kick-off From and To time. From cannot be later than To." }, { status: 400 });

  const normalisedDeadline = new Date(locksAt).toISOString();
  const normalisedOpening = opensAtRaw ? new Date(opensAtRaw).toISOString() : null;
  if (normalisedOpening && new Date(normalisedOpening) >= new Date(normalisedDeadline)) return NextResponse.json({ error: "The gameweek must open before its deadline." }, { status: 400 });

  const { error } = await admin.from("gameweeks").update({
    status,
    opens_at: normalisedOpening,
    locks_at: normalisedDeadline,
    selection_rule_mode: selectionRuleMode,
    selection_weekday: selectionWeekday,
    selection_time: window.from,
    selection_times: legacyWindowArray(window.from, window.to),
    selection_time_from: window.from,
    selection_time_to: window.to,
    one_off_rule: oneOffRule,
  }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (status !== "open" || new Date(normalisedDeadline) <= new Date()) await applyMissedPickPenalties(admin, id);
  else await admin.from("score_adjustments").delete().eq("gameweek_id", id).eq("source", "automatic");

  await admin.from("audit_log").insert({ actor_id: user.id, action: "gameweek_updated", entity_type: "gameweek", entity_id: id, details: { status, opensAt: normalisedOpening, locksAt: normalisedDeadline, selectionRuleMode, selectionWeekday, selectionTimeFrom: window.from, selectionTimeTo: window.to, oneOffRule } });
  return NextResponse.json({ ok: true });
}
