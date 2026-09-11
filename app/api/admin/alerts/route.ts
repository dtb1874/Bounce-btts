import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";

function sameInstant(left: unknown, right: unknown) {
  const leftMs = Date.parse(String(left ?? ""));
  const rightMs = Date.parse(String(right ?? ""));
  return Number.isFinite(leftMs) && Number.isFinite(rightMs) && leftMs === rightMs;
}

function isTimezoneOnlyLegacyAlert(alert: any) {
  if (alert?.resolved || alert?.alert_type !== "fixture_change_affecting_pick") return false;
  const before = alert?.details?.before;
  const after = alert?.details?.after;
  if (!before || !after || !sameInstant(before.kickoff_at, after.kickoff_at)) return false;

  const teamsUnchanged = String(before.home_team ?? "") === String(after.home_team ?? "")
    && String(before.away_team ?? "") === String(after.away_team ?? "");
  const statusUnchanged = String(before.status ?? "") === String(after.status ?? "");
  return teamsUnchanged && statusUnchanged;
}

export async function GET(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data, error } = await context.admin
    .from("admin_alerts")
    .select("*, profiles:member_id(display_name), fixtures:fixture_id(home_team,away_team,kickoff_at,status)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const falsePositiveIds = (data ?? []).filter(isTimezoneOnlyLegacyAlert).map((alert: any) => alert.id);
  if (falsePositiveIds.length) {
    const resolvedAt = new Date().toISOString();
    const { error: cleanupError } = await context.admin
      .from("admin_alerts")
      .update({ resolved: true, resolved_at: resolvedAt, resolved_by: context.user.id })
      .in("id", falsePositiveIds);
    if (cleanupError) return NextResponse.json({ error: cleanupError.message }, { status: 400 });
    for (const alert of data ?? []) {
      if (falsePositiveIds.includes(alert.id)) {
        alert.resolved = true;
        alert.resolved_at = resolvedAt;
        alert.resolved_by = context.user.id;
      }
    }
  }

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
