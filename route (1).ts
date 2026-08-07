import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";

export async function GET(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { data, error } = await context.admin.from("admin_alerts").select("*, profiles:member_id(display_name), fixtures:fixture_id(home_team,away_team,kickoff_at,status)").order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ alerts: data ?? [] });
}

export async function PATCH(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const body = await request.json();
  const { error } = await context.admin.from("admin_alerts").update({ resolved: Boolean(body.resolved), resolved_at: body.resolved ? new Date().toISOString() : null, resolved_by: body.resolved ? context.user.id : null }).eq("id", String(body.id));
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
