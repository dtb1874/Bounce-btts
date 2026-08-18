import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const admin = createAdminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await admin
    .from("profiles")
    .select("id,approved,active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.approved || !profile.active) return NextResponse.json({ error: "Unauthorised" }, { status: 403 });

  const { error } = await admin.from("easter_egg_events").insert({
    user_id: user.id,
    event_key: "rousset",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
