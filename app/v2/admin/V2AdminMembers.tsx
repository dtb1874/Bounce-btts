"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "../V2AdminCentre.module.css";
import type { UserRow } from "./types";
import { initials, token } from "./helpers";

type Props = { entryFee: number; onReloadAll: () => void; onEmulate?: (id: string) => void };

async function makePortrait(file: File, zoom: number, focusX: number, focusY: number) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not open image."));
      img.src = url;
    });
    const canvas = document.createElement("canvas"); canvas.width = 720; canvas.height = 900;
    const context = canvas.getContext("2d"); if (!context) throw new Error("Could not prepare portrait.");
    const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight) * Math.max(1.1, zoom);
    const sourceWidth = canvas.width / scale, sourceHeight = canvas.height / scale;
    const sx = Math.max(0, image.naturalWidth - sourceWidth) * Math.max(0, Math.min(100, focusX)) / 100;
    const sy = Math.max(0, image.naturalHeight - sourceHeight) * Math.max(0, Math.min(100, focusY)) / 100;
    context.drawImage(image, sx, sy, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not create portrait.")), "image/jpeg", .9));
  } finally { URL.revokeObjectURL(url); }
}

export default function V2AdminMembers({ entryFee, onReloadAll, onEmulate }: Props) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [paid, setPaid] = useState<Record<string, boolean>>({});
  const [seasonId, setSeasonId] = useState("");
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [portraitUrls, setPortraitUrls] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [zoom, setZoom] = useState<Record<string, number>>({});
  const [focusX, setFocusX] = useState<Record<string, number>>({});
  const [focusY, setFocusY] = useState<Record<string, number>>({});
  const previewRef = useRef<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const auth = await token();
      const response = await fetch("/api/admin/users", { headers: { authorization: `Bearer ${auth}` }, cache: "no-store" });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Could not load members.");
      const rows = (payload.users ?? []) as UserRow[]; setUsers(rows);
      const client = createClient();
      const season = await client.from("seasons").select("id").eq("is_current", true).maybeSingle();
      const id = season.data?.id ?? ""; setSeasonId(id);
      if (id) {
        const memberships = await client.from("season_memberships").select("profile_id,paid").eq("season_id", id);
        setPaid(Object.fromEntries((memberships.data ?? []).map((row) => [row.profile_id, Boolean(row.paid)])));
      }
      const images = await Promise.all(rows.map(async (row) => {
        const imageResponse = await fetch(`/api/admin/profile-image?profileId=${encodeURIComponent(row.id)}`, { headers: { authorization: `Bearer ${auth}` } });
        if (!imageResponse.ok) return [row.id, ""] as const;
        const imagePayload = await imageResponse.json(); return [row.id, String(imagePayload.portraitUrl ?? "")] as const;
      }));
      setPortraitUrls(Object.fromEntries(images));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load members."); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); return () => Object.values(previewRef.current).forEach((url) => URL.revokeObjectURL(url)); }, []);

  function update(id: string, values: Partial<UserRow>) { setUsers((rows) => rows.map((row) => row.id === id ? { ...row, ...values } : row)); }

  async function save(user: UserRow) {
    setBusy(user.id); setMessage("");
    try {
      const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id: user.id, username: user.username, displayName: user.display_name, role: user.role, active: user.active, password: user.password ?? "", mobileNumber: user.mobile_number ?? "" }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Could not save member.");
      setMessage(`${user.display_name} saved.`); await load(); onReloadAll();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save member."); } finally { setBusy(""); }
  }
  async function createMember() {
    if (!newName.trim()) return;
    setBusy("create"); setMessage("");
    try {
      const response = await fetch("/api/admin/users", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ displayName: newName.trim() }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Could not create member.");
      setNewName(""); setMessage(`${payload.user.display_name} created · username ${payload.user.username} · password ${payload.user.password}`); await load(); onReloadAll();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create member."); } finally { setBusy(""); }
  }
  async function togglePaid(user: UserRow) {
    if (!seasonId) return;
    const next = !paid[user.id];
    const response = await createClient().from("season_memberships").update({ paid: next, paid_at: next ? new Date().toISOString() : null }).eq("season_id", seasonId).eq("profile_id", user.id);
    if (response.error) return setMessage(response.error.message);
    setPaid((current) => ({ ...current, [user.id]: next }));
  }
  async function resetUser(user: UserRow) {
    if (!window.confirm(`Reset ${user.display_name} to an inactive placeholder? Their profile picture and private contact details will be cleared.`)) return;
    setBusy(`reset-${user.id}`);
    const response = await fetch("/api/admin/users", { method: "DELETE", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id: user.id }) });
    const payload = await response.json();
    setMessage(response.ok ? `Account reset · ${payload.username} · ${payload.password}` : payload.error ?? "Could not reset account.");
    if (response.ok) { await load(); onReloadAll(); }
    setBusy("");
  }
  function choosePhoto(user: UserRow, file?: File) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 10 * 1024 * 1024) return setMessage("Use a JPEG, PNG or WebP under 10 MB.");
    const old = previewRef.current[user.id]; if (old) URL.revokeObjectURL(old);
    const url = URL.createObjectURL(file); previewRef.current[user.id] = url;
    setFiles((current) => ({ ...current, [user.id]: file }));
    setPreviewUrls((current) => ({ ...current, [user.id]: url }));
    setZoom((current) => ({ ...current, [user.id]: 1.15 })); setFocusX((current) => ({ ...current, [user.id]: 50 })); setFocusY((current) => ({ ...current, [user.id]: 45 }));
  }
  async function savePhoto(user: UserRow) {
    const file = files[user.id]; if (!file) return;
    setBusy(`photo-${user.id}`); setMessage("");
    try {
      const portrait = await makePortrait(file, zoom[user.id] ?? 1.15, focusX[user.id] ?? 50, focusY[user.id] ?? 45);
      const form = new FormData(); form.append("profileId", user.id); form.append("original", file, file.name || "original.jpg"); form.append("portrait", new File([portrait], "portrait.jpg", { type: "image/jpeg" }));
      const response = await fetch("/api/admin/profile-image", { method: "POST", headers: { authorization: `Bearer ${await token()}` }, body: form });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Could not save profile picture.");
      setPortraitUrls((current) => ({ ...current, [user.id]: `${payload.portraitUrl}?v=${Date.now()}` })); setMessage("Profile picture saved."); onReloadAll();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save profile picture."); } finally { setBusy(""); }
  }
  async function removePhoto(user: UserRow) {
    if (!window.confirm(`Remove ${user.display_name}'s profile picture?`)) return;
    const response = await fetch("/api/admin/profile-image", { method: "DELETE", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ profileId: user.id }) });
    const payload = await response.json(); setMessage(response.ok ? "Profile picture removed." : payload.error ?? "Could not remove profile picture.");
    if (response.ok) { setPortraitUrls((current) => ({ ...current, [user.id]: "" })); onReloadAll(); }
  }
  function generatedPassword(user: UserRow) { update(user.id, { password: `bounce${user.slot_number ?? ""}${Math.floor(1000 + Math.random() * 9000)}` }); }
  async function copyLogin(user: UserRow) {
    await navigator.clipboard.writeText(`${user.display_name}\nUsername: ${user.username}\nPassword: ${user.password ?? ""}\nLogin: https://bounce-btts.vercel.app`); setMessage("Login details copied.");
  }
  function whatsapp(user: UserRow) {
    const text = ["Bounce BTTS League", `Player: ${user.display_name}`, `Username: ${user.username}`, `Password: ${user.password ?? ""}`, "Login: https://bounce-btts.vercel.app", "", "Keep these login details private."].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  const active = users.filter((row) => row.active && row.role !== "guest");
  const paidCount = active.filter((row) => paid[row.id]).length;
  if (loading) return <section className={styles.section}><header className={styles.sectionHeading}><span>LEAGUE MEMBERS</span><h2>Members</h2></header><p>Loading members…</p></section>;

  return <section className={styles.section}>
    <header className={styles.sectionHeading}><span>ULTIMATE ADMIN</span><h2>Members</h2></header>
    <div className={styles.paymentStrip}><div><span>ENTRY FEE</span><strong>£{entryFee.toFixed(0)}</strong></div><div><span>PAID</span><strong>{paidCount}/{active.length}</strong><small>£{(paidCount * entryFee).toFixed(0)} received</small></div><div><span>OUTSTANDING</span><strong>£{((active.length - paidCount) * entryFee).toFixed(0)}</strong></div></div>
    <div className={styles.createMember}><input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New player name" /><button type="button" className={styles.primaryButton} disabled={busy === "create" || !newName.trim()} onClick={() => void createMember()}>{busy === "create" ? "Creating…" : "Create member"}</button></div>
    <div className={styles.userLedger}>{users.map((user) => <details key={user.id} open={user.slot_number === 1}><summary><div className={styles.userSummary}><span className={styles.avatar}>{portraitUrls[user.id] ? <img src={portraitUrls[user.id]} alt="" /> : initials(user.display_name)}</span><div><strong>{user.display_name}</strong><small>{user.username} · {user.role.replace("_", " ")} · R {user.rousset_count ?? 0}</small></div></div><div className={styles.userBadges}><button type="button" className={paid[user.id] ? styles.paidButton : styles.unpaidButton} onClick={(event) => { event.preventDefault(); void togglePaid(user); }}>{paid[user.id] ? "PAID" : "UNPAID"}</button><span>{user.active ? "ACTIVE" : "INACTIVE"}</span><b>⌄</b></div></summary><div className={styles.userEditor}>
      <div className={styles.formLedger}><label>Player name<input value={user.display_name} onChange={(e) => update(user.id, { display_name: e.target.value })} /></label><label>Username<input value={user.username} autoCapitalize="none" autoCorrect="off" onChange={(e) => update(user.id, { username: e.target.value })} /></label><label>Password<input type="text" autoComplete="off" value={user.password ?? ""} onChange={(e) => update(user.id, { password: e.target.value })} /></label><label>Role<select value={user.role} disabled={user.slot_number === 1} onChange={(e) => update(user.id, { role: e.target.value as UserRow["role"] })}><option value="member">Member</option><option value="admin">League Admin</option><option value="guest">Demo Guest</option>{user.slot_number === 1 ? <option value="ultimate_admin">Ultimate Admin</option> : null}</select></label><label>Mobile number<input type="tel" placeholder="+447700900123" value={user.mobile_number ?? ""} onChange={(e) => update(user.id, { mobile_number: e.target.value })} /></label><label>Account status<select value={user.active ? "active" : "inactive"} disabled={user.slot_number === 1} onChange={(e) => update(user.id, { active: e.target.value === "active" })}><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div>
      <div className={styles.rowActions}><button type="button" className={styles.secondaryButton} onClick={() => generatedPassword(user)}>Generate password</button><button type="button" className={styles.secondaryButton} onClick={() => void copyLogin(user)}>Copy login</button><button type="button" className={styles.secondaryButton} disabled={!user.password} onClick={() => whatsapp(user)}>WhatsApp login</button>{onEmulate ? <button type="button" className={styles.secondaryButton} onClick={() => onEmulate(user.id)}>Emulate</button> : null}<button type="button" className={styles.primaryButton} disabled={busy === user.id} onClick={() => void save(user)}>{busy === user.id ? "Saving…" : "Save member"}</button>{user.slot_number !== 1 ? <button type="button" className={styles.dangerButton} disabled={busy === `reset-${user.id}`} onClick={() => void resetUser(user)}>Reset to placeholder</button> : null}</div>
      <div className={styles.photoEditor}><div className={styles.photoPreview}>{previewUrls[user.id] || portraitUrls[user.id] ? <img src={previewUrls[user.id] || portraitUrls[user.id]} alt={`${user.display_name} profile preview`} style={{ transform: previewUrls[user.id] ? `scale(${zoom[user.id] ?? 1.15})` : undefined, objectPosition: `${focusX[user.id] ?? 50}% ${focusY[user.id] ?? 45}%` }} /> : <span>No profile picture</span>}</div><div className={styles.photoControls}><label>Choose photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => choosePhoto(user, e.target.files?.[0])} /></label>{files[user.id] ? <><label>Zoom<input type="range" min="1.1" max="2.4" step="0.05" value={zoom[user.id] ?? 1.15} onChange={(e) => setZoom((current) => ({ ...current, [user.id]: Number(e.target.value) }))} /></label><label>Horizontal focus<input type="range" min="0" max="100" value={focusX[user.id] ?? 50} onChange={(e) => setFocusX((current) => ({ ...current, [user.id]: Number(e.target.value) }))} /></label><label>Vertical focus<input type="range" min="0" max="100" value={focusY[user.id] ?? 45} onChange={(e) => setFocusY((current) => ({ ...current, [user.id]: Number(e.target.value) }))} /></label><button type="button" className={styles.primaryButton} disabled={busy === `photo-${user.id}`} onClick={() => void savePhoto(user)}>Save profile picture</button></> : null}{portraitUrls[user.id] ? <button type="button" className={styles.secondaryButton} onClick={() => void removePhoto(user)}>Remove picture</button> : null}</div></div>
    </div></details>)}</div>
    {message ? <div className={styles.feedback}>{message}</div> : null}
  </section>;
}
