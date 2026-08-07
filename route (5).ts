import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { runFootballImport } from "@/lib/api-football";

export async function POST(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  try { return NextResponse.json(await runFootballImport("admin")); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed" }, { status: 500 }); }
}

export async function GET(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { data } = await context.admin.from("fixture_import_runs").select("*").order("started_at", { ascending: false }).limit(10);
  return NextResponse.json({ runs: data ?? [] });
}
