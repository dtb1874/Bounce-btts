import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";

export async function POST(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { admin, user: actor } = context;
  const body = await request.json();
  const label = String(body.label ?? "").trim();
  const count = Math.max(1, Math.min(60, Number(body.gameweeks ?? 38)));
  if (!label) return NextResponse.json({ error: "Season name is required." }, { status: 400 });
  const { data: season, error } = await admin.from("seasons").insert({ label, is_current: false }).select("id,label").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: profiles } = await admin.from("profiles").select("id,display_name,active").eq("approved", true).eq("active", true);
  const named = (profiles ?? []).filter((p) => !/^user\d+$/i.test(String(p.display_name).trim()));
  if (named.length) await admin.from("season_memberships").insert(named.map((p) => ({ season_id: season.id, profile_id: p.id, active: true, display_name_snapshot: p.display_name })));

  const now = new Date();
  const weeks = Array.from({ length: count }, (_, index) => {
    const opens = new Date(now); opens.setUTCDate(opens.getUTCDate() + index * 7);
    const locks = new Date(opens); locks.setUTCDate(locks.getUTCDate() + 4); locks.setUTCHours(16,0,0,0);
    return { season_id: season.id, number: index + 1, status: "open", opens_at: opens.toISOString(), locks_at: locks.toISOString() };
  });
  await admin.from("gameweeks").insert(weeks);
  await admin.from("audit_log").insert({ actor_id: actor.id, action: "season_created", entity_type: "season", entity_id: season.id, details: { label, gameweeks: count, copiedUsers: named.length } });
  return NextResponse.json({ season, copiedUsers: named.length });
}
