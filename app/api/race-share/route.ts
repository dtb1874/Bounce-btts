import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const CODE_LENGTH = 8;
const MAX_PAYLOAD_BYTES = 24_000;

function makeCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function validPayload(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const payload = value as { v?: unknown; seasonLabel?: unknown; players?: unknown; frames?: unknown; selected?: unknown };
  if (payload.v !== 1 || typeof payload.seasonLabel !== "string" || !Array.isArray(payload.players) || !Array.isArray(payload.frames) || !Array.isArray(payload.selected)) return false;
  if (payload.players.length < 1 || payload.players.length > 32 || payload.frames.length < 1 || payload.frames.length > 60) return false;
  return true;
}

export async function POST(request: Request) {
  const token = bearerToken(request);
  if (!token) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const admin = createAdminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await admin.from("profiles").select("id,approved,active,role").eq("id", user.id).maybeSingle();
  if (!profile || !profile.approved || !profile.active || profile.role === "guest") {
    return NextResponse.json({ error: "Active league membership required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const payload = body?.payload;
  if (!validPayload(payload)) return NextResponse.json({ error: "Invalid race payload" }, { status: 400 });

  const encoded = JSON.stringify(payload);
  if (new TextEncoder().encode(encoded).byteLength > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "Race payload is too large" }, { status: 413 });
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = makeCode();
    const { error } = await admin.from("race_shares").insert({ code, payload, created_by: user.id });
    if (!error) return NextResponse.json({ code, url: `/r/${code}` });
    if (error.code !== "23505") return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ error: "Could not generate a unique share link" }, { status: 500 });
}
