import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { buildNormalGameweekCalendar } from "@/lib/gameweek-calendar";

export async function POST(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { admin, user: actor } = context;
  const body = await request.json();
  const label = String(body.label ?? "").trim();
  const count = Math.max(1, Math.min(60, Number(body.gameweeks ?? 38)));
  const firstFixtureDate = body.firstFixtureDate == null ? null : String(body.firstFixtureDate).trim();
  if (!label) return NextResponse.json({ error: "Season name is required." }, { status: 400 });
  if (firstFixtureDate && !/^\d{4}-\d{2}-\d{2}$/.test(firstFixtureDate)) {
    return NextResponse.json({ error: "Use a valid first fixture date." }, { status: 400 });
  }

  const calendar = buildNormalGameweekCalendar(count, firstFixtureDate);
  const { data: season, error } = await admin.from("seasons").insert({
    label,
    is_current: false,
    starts_at: calendar[0]?.fixture_date ?? null,
    ends_at: calendar[calendar.length - 1]?.fixture_date ?? null,
  }).select("id,label").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: profiles } = await admin.from("profiles").select("id,display_name,active").eq("approved", true).eq("active", true);
  const named = (profiles ?? []).filter((p) => !/^user\d+$/i.test(String(p.display_name).trim()));
  if (named.length) {
    await admin.from("season_memberships").insert(named.map((p) => ({
      season_id: season.id,
      profile_id: p.id,
      active: true,
      display_name_snapshot: p.display_name,
    })));
  }

  const weeks = calendar.map(({ fixture_date: _fixtureDate, ...week }) => ({ ...week, season_id: season.id }));
  const { error: gameweekError } = await admin.from("gameweeks").insert(weeks);
  if (gameweekError) {
    await admin.from("seasons").delete().eq("id", season.id);
    return NextResponse.json({ error: gameweekError.message }, { status: 400 });
  }

  await admin.from("audit_log").insert({
    actor_id: actor.id,
    action: "season_created",
    entity_type: "season",
    entity_id: season.id,
    details: {
      label,
      gameweeks: count,
      copiedUsers: named.length,
      firstFixtureDate: calendar[0]?.fixture_date ?? null,
      normalRule: "Saturday 15:00 UK · Friday 17:00 deadline · Monday 08:00 opening",
    },
  });
  return NextResponse.json({ season, copiedUsers: named.length });
}
