import { createAdminClient } from "@/lib/supabase/admin";

export async function requireAdmin(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;

  const admin = createAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("id,role,approved,active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !["admin", "ultimate_admin"].includes(profile.role) || !profile.approved || !profile.active) return null;
  return { admin, user, profile };
}
