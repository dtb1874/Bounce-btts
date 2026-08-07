import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { decryptPassword, encryptPassword } from "@/lib/password-vault";
import { normaliseUsername, usernameToEmail } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { admin } = context;
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id,username,display_name,role,approved,active,slot_number")
    .order("slot_number");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: credentials } = await admin.from("member_credentials").select("user_id,encrypted_password");
  const passwordMap = new Map((credentials ?? []).map((row) => [row.user_id, decryptPassword(row.encrypted_password)]));
  return NextResponse.json({
    users: (profiles ?? []).map((profile) => ({ ...profile, password: passwordMap.get(profile.id) ?? "" })),
  });
}

export async function PATCH(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { admin, user: actor } = context;
  const body = await request.json();
  const id = String(body.id ?? "");
  const username = normaliseUsername(String(body.username ?? ""));
  const displayName = String(body.displayName ?? "").trim();
  const password = String(body.password ?? "");
  const role = body.role === "admin" ? "admin" : "member";
  const active = Boolean(body.active);

  const { data: existing } = await admin.from("profiles").select("slot_number,username").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!username || !displayName) return NextResponse.json({ error: "Username and player name are required." }, { status: 400 });
  if (existing.slot_number === 1 && (username !== "user1" || displayName !== "DTB" || role !== "admin" || !active)) {
    return NextResponse.json({ error: "user1 is permanently reserved for DTB as an active administrator." }, { status: 400 });
  }
  if (password && password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });

  const authChanges: { email?: string; password?: string; user_metadata?: Record<string, string> } = {
    user_metadata: { username, display_name: displayName },
  };
  if (username !== existing.username) authChanges.email = usernameToEmail(username);
  if (password) authChanges.password = password;

  const { error: authError } = await admin.auth.admin.updateUserById(id, authChanges);
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  const { error: profileError } = await admin.from("profiles").update({
    username,
    display_name: displayName,
    role,
    active,
    approved: true,
  }).eq("id", id);
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  if (password) {
    await admin.from("member_credentials").upsert({
      user_id: id,
      encrypted_password: encryptPassword(password),
    });
  }

  const { data: currentSeason } = await admin.from("seasons").select("id").eq("is_current", true).single();
  if (currentSeason?.id) {
    await admin.from("season_memberships").upsert({
      season_id: currentSeason.id,
      profile_id: id,
      active,
    }, { onConflict: "season_id,profile_id" });
  }

  await admin.from("audit_log").insert({
    actor_id: actor.id,
    action: "user_updated",
    entity_type: "profile",
    entity_id: id,
    details: { username, displayName, role, active, passwordReset: Boolean(password) },
  });

  return NextResponse.json({ ok: true });
}
