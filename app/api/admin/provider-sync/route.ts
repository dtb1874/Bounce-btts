import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { runFootballImport, runSelectedOddsRefresh } from "@/lib/api-football";

export async function POST(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const gameweekIds = Array.isArray(body?.gameweekIds)
      ? body.gameweekIds.filter((value: unknown): value is string => typeof value === "string" && value.length > 0)
      : undefined;
    if (body?.oddsOnly === true) {
      const gameweekId = gameweekIds?.[0];
      if (!gameweekId) return NextResponse.json({ error: "A gameweek is required for odds refresh." }, { status: 400 });
      return NextResponse.json(await runSelectedOddsRefresh(gameweekId));
    }

    return NextResponse.json(await runFootballImport("admin", gameweekIds));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { data } = await context.admin.from("fixture_import_runs").select("*").order("started_at", { ascending: false }).limit(10);
  return NextResponse.json({ runs: data ?? [] });
}
