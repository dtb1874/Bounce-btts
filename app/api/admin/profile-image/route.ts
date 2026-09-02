import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";

export const runtime = "nodejs";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const context = await requireAdmin(request);
  if (!context) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (context.profile.role !== "ultimate_admin") return NextResponse.json({ error: "Ultimate Admin access required" }, { status: 403 });

  const form = await request.formData();
  const profileId = String(form.get("profileId") ?? "");
  const original = form.get("original");
  const portrait = form.get("portrait");
  if (!profileId || !(original instanceof File) || !(portrait instanceof File)) {
    return NextResponse.json({ error: "Profile, original image and portrait are required." }, { status: 400 });
  }
  if (!allowed.has(original.type) || !allowed.has(portrait.type)) {
    return NextResponse.json({ error: "Use JPEG, PNG or WebP images." }, { status: 400 });
  }
  if (original.size > 10 * 1024 * 1024 || portrait.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "Image is too large." }, { status: 400 });
  }

  const { admin, user: actor } = context;
  const { data: profile } = await admin.from("profiles").select("id,avatar_original_path,avatar_portrait_path").eq("id", profileId).maybeSingle();
  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const stamp = Date.now();
  const originalExt = original.type === "image/png" ? "png" : original.type === "image/webp" ? "webp" : "jpg";
  const originalPath = `${profileId}/original-${stamp}.${originalExt}`;
  const portraitPath = `${profileId}/portrait-${stamp}.jpg`;

  const originalBuffer = Buffer.from(await original.arrayBuffer());
  const portraitBuffer = Buffer.from(await portrait.arrayBuffer());
  const bucket = admin.storage.from("profile-images");
  const originalUpload = await bucket.upload(originalPath, originalBuffer, { contentType: original.type, upsert: false });
  if (originalUpload.error) return NextResponse.json({ error: originalUpload.error.message }, { status: 400 });
  const portraitUpload = await bucket.upload(portraitPath, portraitBuffer, { contentType: "image/jpeg", upsert: false });
  if (portraitUpload.error) {
    await bucket.remove([originalPath]);
    return NextResponse.json({ error: portraitUpload.error.message }, { status: 400 });
  }

  const { error: updateError } = await admin.from("profiles").update({ avatar_original_path: originalPath, avatar_portrait_path: portraitPath }).eq("id", profileId);
  if (updateError) {
    await bucket.remove([originalPath, portraitPath]);
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  const oldPaths = [profile.avatar_original_path, profile.avatar_portrait_path].filter((value): value is string => Boolean(value));
  if (oldPaths.length) await bucket.remove(oldPaths);

  await admin.from("audit_log").insert({ actor_id: actor.id, action: "profile_image_updated", entity_type: "profile", entity_id: profileId, details: { originalUpdated: true, portraitUpdated: true } });
  const { data: publicData } = bucket.getPublicUrl(portraitPath);
  return NextResponse.json({ ok: true, originalPath, portraitPath, portraitUrl: publicData.publicUrl });
}
