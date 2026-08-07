import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { usernameToEmail } from "@/lib/auth";
import { encryptPassword } from "@/lib/password-vault";

export const runtime = "nodejs";

const roster = [
  { slot: 1, username: "user1", displayName: "DTB", role: "admin", active: true },
  { slot: 2, username: "user2", displayName: "Dave S", role: "admin", active: true },
  { slot: 3, username: "user3", displayName: "Turnsy Fitchett", role: "member", active: true },
  { slot: 4, username: "user4", displayName: "Ryan", role: "member", active: true },
  { slot: 5, username: "user5", displayName: "Dave Pickup", role: "member", active: true },
  { slot: 6, username: "user6", displayName: "Yacky", role: "member", active: true },
  { slot: 7, username: "user7", displayName: "Ian", role: "member", active: true },
  { slot: 8, username: "user8", displayName: "Kevin Pickup", role: "member", active: true },
  { slot: 9, username: "user9", displayName: "Unassigned 9", role: "member", active: false },
  { slot: 10, username: "user10", displayName: "Unassigned 10", role: "member", active: false },
  { slot: 11, username: "user11", displayName: "Unassigned 11", role: "member", active: false },
  { slot: 12, username: "user12", displayName: "Unassigned 12", role: "member", active: false },
] as const;

function simplePassword(slot: number) {
  const suffix = Math.floor(10 + Math.random() * 90);
  return `bounce${slot}${suffix}`;
}

function nextSaturdayDeadline() {
  const now = new Date();
  const result = new Date(now);
  const days = (6 - result.getUTCDay() + 7) % 7 || 7;
  result.setUTCDate(result.getUTCDate() + days);
  result.setUTCHours(13, 55, 0, 0); // 14:55 UK during summer; editable in Admin.
  return result.toISOString();
}

export async function POST(request: Request) {
  const admin = createAdminClient();
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return NextResponse.json({ error: "League setup is already complete." }, { status: 409 });

  const body = await request.json().catch(() => ({}));
  const user1Password = String(body.user1Password ?? "");
  if (user1Password.length < 6) return NextResponse.json({ error: "Use at least 6 characters for user1." }, { status: 400 });

  const createdIds: string[] = [];
  const credentials: Array<{ username: string; displayName: string; password: string; role: string }> = [];

  try {
    const { data: season } = await admin.from("seasons").select("id").eq("is_current", true).single();

    for (const item of roster) {
      const password = item.slot === 1 ? user1Password : simplePassword(item.slot);
      const { data, error } = await admin.auth.admin.createUser({
        email: usernameToEmail(item.username),
        password,
        email_confirm: true,
        user_metadata: { username: item.username, display_name: item.displayName },
      });
      if (error || !data.user) throw error ?? new Error(`Could not create ${item.username}`);
      createdIds.push(data.user.id);

      const { error: profileError } = await admin.from("profiles").insert({
        id: data.user.id,
        username: item.username,
        slot_number: item.slot,
        display_name: item.displayName,
        role: item.role,
        approved: true,
        active: item.active,
      });
      if (profileError) throw profileError;

      const { error: passwordError } = await admin.from("member_credentials").insert({
        user_id: data.user.id,
        encrypted_password: encryptPassword(password),
      });
      if (passwordError) throw passwordError;

      if (season?.id) {
        const { error: membershipError } = await admin.from("season_memberships").insert({
          season_id: season.id,
          profile_id: data.user.id,
          active: item.active,
        });
        if (membershipError) throw membershipError;
      }
      credentials.push({ username: item.username, displayName: item.displayName, password, role: item.role });
    }

    const { count: gameweekCount } = await admin.from("gameweeks").select("id", { count: "exact", head: true });
    if ((gameweekCount ?? 0) === 0) {
      const { data: season } = await admin.from("seasons").select("id").eq("is_current", true).single();
      await admin.from("gameweeks").insert({
        number: 1,
        status: "open",
        opens_at: new Date().toISOString(),
        locks_at: nextSaturdayDeadline(),
        season_id: season?.id ?? null,
      });
    }

    return NextResponse.json({ credentials });
  } catch (error) {
    for (const id of createdIds.reverse()) await admin.auth.admin.deleteUser(id).catch(() => undefined);
    const message = error instanceof Error ? error.message : "Setup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
