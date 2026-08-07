import { NextRequest, NextResponse } from "next/server";
import { runFootballImport } from "@/lib/api-football";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyMissedPickPenalties } from "@/lib/missed-picks";

function authorised(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) return request.headers.get("authorization") === `Bearer ${secret}`;
  return (request.headers.get("user-agent") ?? "").toLowerCase().includes("vercel-cron");
}

function londonHour() {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", hour12: false }).format(new Date()));
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (londonHour() !== 8) return NextResponse.json({ ok: true, skipped: true, reason: "The paired UTC cron only runs the importer when it is 08:00 in Europe/London." });
  const admin = createAdminClient();
  const penaltiesApplied = await applyMissedPickPenalties(admin).catch(() => 0);
  try { return NextResponse.json({ penaltiesApplied, ...(await runFootballImport("cron")) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed", penaltiesApplied }, { status: 500 }); }
}
