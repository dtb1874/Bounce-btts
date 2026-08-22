import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  if (!/^[A-Za-z0-9]{8}$/.test(code)) return NextResponse.json({ error: "Invalid share code" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("race_shares").select("payload").eq("code", code).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Share not found" }, { status: 404 });

  return NextResponse.json({ payload: data.payload }, {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400" },
  });
}
