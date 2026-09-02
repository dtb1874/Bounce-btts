import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id,avatar_portrait_path")
    .eq("approved", true)
    .eq("active", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const portraits = (profiles ?? []).map((profile) => {
    const path = profile.avatar_portrait_path as string | null;
    const portraitUrl = path
      ? admin.storage.from("profile-images").getPublicUrl(path).data.publicUrl
      : null;
    return { id: profile.id, portraitUrl };
  });

  return NextResponse.json({ portraits }, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
  });
}
