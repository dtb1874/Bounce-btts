import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";

function isThreePmUK(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  return hour === "15" && minute === "00";
}

export async function POST(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { admin, user } = context;
  const body = await request.json();
  const home = String(body.homeTeam ?? "").trim();
  const away = String(body.awayTeam ?? "").trim();
  const kickoffAt = String(body.kickoffAt ?? "");
  const gameweekId = String(body.gameweekId ?? "");
  const lower = `${home} ${away}`.toLowerCase();
  if (!home || !away || !gameweekId || !kickoffAt) return NextResponse.json({ error: "Complete all fixture fields." }, { status: 400 });
  if (lower.includes("heart of midlothian") || lower.includes("hearts")) return NextResponse.json({ error: "Hearts fixtures are not eligible." }, { status: 400 });
  if (!isThreePmUK(kickoffAt)) return NextResponse.json({ error: "The fixture must kick off at exactly 3:00pm UK time." }, { status: 400 });

  const { data, error } = await admin.from("fixtures").insert({
    gameweek_id: gameweekId,
    competition: String(body.competition ?? "Other UK Competition").trim(),
    country: String(body.country ?? "United Kingdom").trim(),
    home_team: home,
    away_team: away,
    kickoff_at: kickoffAt,
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
