"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const maroon = "#5b1530";
const maroonDark = "#270915";
const gold = "#d9b85f";
const cream = "#fff8e8";
const weekdays = [
  [1, "Monday"], [2, "Tuesday"], [3, "Wednesday"], [4, "Thursday"],
  [5, "Friday"], [6, "Saturday"], [7, "Sunday"],
] as const;

type Profile = {
  id: string;
  username: string;
  display_name: string;
  role: "ultimate_admin";
  active: boolean;
  slot_number: number | null;
};

type Gameweek = {
  id: string;
  number: number;
  status: "open" | "locked" | "complete";
  opens_at: string | null;
  locks_at: string;
  selection_rule_mode: "exact_time" | "any_kickoff";
  selection_weekday: number;
  selection_time: string;
};

function londonInput(iso: string | null) {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

async function accessToken() {
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token ?? "";
}

export default function AdvancedAdminControls({
  profile,
  seasonLabel,
  initialGameweeks,
}: {
  profile: Profile;
  seasonLabel: string;
  initialGameweeks: Gameweek[];
}) {
  const [gameweeks, setGameweeks] = useState(initialGameweeks);
  const [gameweekId, setGameweekId] = useState(
    initialGameweeks.find((g) => g.status === "open" && new Date(g.locks_at) > new Date())?.id
      ?? initialGameweeks[0]?.id
      ?? "",
  );
  const gameweek = useMemo(() => gameweeks.find((g) => g.id === gameweekId) ?? null, [gameweeks, gameweekId]);
  const [username, setUsername] = useState(profile.username);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveGameweek() {
    if (!gameweek) return;
    setBusy(true);
    setMessage("");
    const openingInput = document.getElementById("gw-opening") as HTMLInputElement | null;
    const deadlineInput = document.getElementById("gw-deadline") as HTMLInputElement | null;
    const weekdayInput = document.getElementById("gw-weekday") as HTMLSelectElement | null;
    const modeInput = document.getElementById("gw-mode") as HTMLSelectElement | null;
    const timeInput = document.getElementById("gw-time") as HTMLInputElement | null;

    const opensAt = openingInput?.value ? new Date(openingInput.value).toISOString() : null;
    const locksAt = deadlineInput?.value ? new Date(deadlineInput.value).toISOString() : "";
    const selectionWeekday = Number(weekdayInput?.value ?? 6);
    const selectionRuleMode = modeInput?.value ?? "exact_time";
    const selectionTime = timeInput?.value || "15:00";

    const response = await fetch("/api/admin/gameweek", {
      method: "PATCH",
      headers: { "content-type": "application/json", authorization: `Bearer ${await accessToken()}` },
      body: JSON.stringify({
        id: gameweek.id,
        status: gameweek.status,
        opensAt,
        locksAt,
        selectionWeekday,
        selectionRuleMode,
        selectionTime,
      }),
    });
    const payload = await response.json();
    if (response.ok) {
      setGameweeks((rows) => rows.map((row) => row.id === gameweek.id ? {
        ...row,
        opens_at: opensAt,
        locks_at: locksAt,
        selection_weekday: selectionWeekday,
        selection_rule_mode: selectionRuleMode as Gameweek["selection_rule_mode"],
        selection_time: selectionTime,
      } : row));
      setMessage(`GW${gameweek.number} settings saved.`);
    } else {
      setMessage(payload.error ?? "Could not save gameweek settings.");
    }
    setBusy(false);
  }

  async function saveUsername() {
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!clean) return setMessage("Enter a valid username.");
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "content-type": "application/json", authorization: `Bearer ${await accessToken()}` },
      body: JSON.stringify({
        id: profile.id,
        username: clean,
        displayName: profile.display_name,
        role: "ultimate_admin",
        active: true,
        password: "",
      }),
    });
    const payload = await response.json();
    if (response.ok) {
      setUsername(clean);
      setMessage(`Username changed to ${clean}. Use this username the next time you sign in.`);
    } else {
      setMessage(payload.error ?? "Could not change username.");
    }
    setBusy(false);
  }

  return (
    <main style={{ minHeight: "100vh", background: `radial-gradient(circle at top, ${maroon} 0%, ${maroonDark} 62%)`, padding: "24px 14px 60px", color: cream, fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <a href="/" style={{ color: gold, textDecoration: "none", fontWeight: 800 }}>← Back to Bounce</a>
        <header style={{ margin: "24px 0 20px" }}>
          <div style={{ color: gold, fontSize: 12, fontWeight: 900, letterSpacing: 2 }}>ULTIMATE ADMIN · {seasonLabel}</div>
          <h1 style={{ margin: "7px 0 6px", fontSize: 34 }}>Advanced Controls</h1>
          <p style={{ margin: 0, color: "#eadfc5", lineHeight: 1.5 }}>Live-only controls for gameweek timing and fixture eligibility. Standard weeks remain Saturday 15:00 unless you override that gameweek here.</p>
        </header>

        {message && <div style={{ background: "rgba(217,184,95,.15)", border: `1px solid ${gold}`, padding: 12, borderRadius: 10, marginBottom: 14 }}>{message}</div>}

        <section style={{ background: "rgba(20,5,11,.82)", border: "1px solid rgba(217,184,95,.45)", borderRadius: 16, padding: 18, marginBottom: 18 }}>
          <h2 style={{ color: gold, marginTop: 0 }}>Gameweek timing & selection rules</h2>
          <label style={{ display: "grid", gap: 6, marginBottom: 14 }}>
            <strong>Gameweek</strong>
            <select value={gameweekId} onChange={(e) => setGameweekId(e.target.value)} style={inputStyle}>
              {gameweeks.map((row) => <option key={row.id} value={row.id}>GW {row.number}</option>)}
            </select>
          </label>

          {gameweek && <div key={gameweek.id} style={{ display: "grid", gap: 14 }}>
            <label style={labelStyle}><strong>Status</strong><select value={gameweek.status} onChange={(e) => setGameweeks((rows) => rows.map((row) => row.id === gameweek.id ? { ...row, status: e.target.value as Gameweek["status"] } : row))} style={inputStyle}><option value="open">Open</option><option value="locked">Locked</option><option value="complete">Complete</option></select></label>
            <label style={labelStyle}><strong>Opens</strong><input id="gw-opening" type="datetime-local" defaultValue={londonInput(gameweek.opens_at)} style={inputStyle}/><small style={helpStyle}>Set this earlier whenever you want members to start selecting before the normal Monday opening.</small></label>
            <label style={labelStyle}><strong>Deadline</strong><input id="gw-deadline" type="datetime-local" defaultValue={londonInput(gameweek.locks_at)} style={inputStyle}/></label>
            <label style={labelStyle}><strong>Eligible fixture day</strong><select id="gw-weekday" defaultValue={String(gameweek.selection_weekday ?? 6)} style={inputStyle}>{weekdays.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small style={helpStyle}>For provider imports in this live version, set the deadline on the day before the fixture day (for example Tuesday deadline for a Wednesday round).</small></label>
            <label style={labelStyle}><strong>Kick-off rule</strong><select id="gw-mode" defaultValue={gameweek.selection_rule_mode ?? "exact_time"} style={inputStyle}><option value="exact_time">Exact UK kick-off time</option><option value="any_kickoff">Any UK kick-off on the selected day</option></select></label>
            <label style={labelStyle}><strong>Eligible kick-off time</strong><input id="gw-time" type="time" defaultValue={(gameweek.selection_time || "15:00").slice(0,5)} style={inputStyle}/><small style={helpStyle}>Normal rule is 15:00. For a midweek round you can use values such as 19:45 or 20:00. This field is ignored when Any UK kick-off is selected.</small></label>
            <button disabled={busy} onClick={saveGameweek} style={primaryStyle}>{busy ? "Saving…" : `Save GW${gameweek.number} controls`}</button>
          </div>}
        </section>

        <section style={{ background: "rgba(20,5,11,.82)", border: "1px solid rgba(217,184,95,.45)", borderRadius: 16, padding: 18 }}>
          <h2 style={{ color: gold, marginTop: 0 }}>Your Ultimate Admin login</h2>
          <p style={{ color: "#eadfc5", lineHeight: 1.5 }}>Your player name remains <strong>{profile.display_name}</strong> and your Ultimate Admin role stays protected. You can now change only the username you use to sign in.</p>
          <label style={labelStyle}><strong>Username</strong><input value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" autoCorrect="off" style={inputStyle}/></label>
          <button disabled={busy} onClick={saveUsername} style={{ ...primaryStyle, marginTop: 14 }}>{busy ? "Saving…" : "Change my username"}</button>
        </section>
      </div>
    </main>
  );
}

const labelStyle = { display: "grid", gap: 6 } as const;
const helpStyle = { color: "#cdbf9f", lineHeight: 1.35 } as const;
const inputStyle = { width: "100%", boxSizing: "border-box" as const, padding: "12px 10px", borderRadius: 9, border: "1px solid rgba(217,184,95,.55)", background: "#fffaf0", color: "#241019", fontSize: 16 };
const primaryStyle = { border: 0, borderRadius: 9, padding: "13px 15px", background: gold, color: maroonDark, fontWeight: 900, fontSize: 15, cursor: "pointer" };
