"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";

type Gameweek = { id: string; number: number };

const weekdays = [
  [1, "Monday"], [2, "Tuesday"], [3, "Wednesday"], [4, "Thursday"],
  [5, "Friday"], [6, "Saturday"], [7, "Sunday"],
] as const;

async function accessToken() {
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token ?? "";
}

function selectedGameweekNumber() {
  const buttons = Array.from(document.querySelectorAll("button"));
  const save = buttons.find((button) => /^Save Gameweek \d+ settings$/.test(button.textContent?.trim() ?? ""));
  const match = save?.textContent?.match(/Gameweek (\d+)/);
  return match ? Number(match[1]) : null;
}

export default function OneOffGameweekPortal({ gameweeks }: { gameweeks: Gameweek[] }) {
  const [target, setTarget] = useState<Element | null>(null);
  const [anchorNumber, setAnchorNumber] = useState<number | null>(null);
  const [opensAt, setOpensAt] = useState("");
  const [locksAt, setLocksAt] = useState("");
  const [weekday, setWeekday] = useState(3);
  const [fromTime, setFromTime] = useState("19:45");
  const [toTime, setToTime] = useState("20:00");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const locate = () => {
      const title = Array.from(document.querySelectorAll("div")).find((node) => node.textContent?.trim() === "GAMEWEEK MECHANICS");
      const section = title?.closest("section") ?? null;
      setTarget(section);
      setAnchorNumber(selectedGameweekNumber());
    };
    locate();
    const observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  const anchor = useMemo(() => gameweeks.find((gw) => gw.number === anchorNumber) ?? null, [gameweeks, anchorNumber]);
  if (!target || !anchor) return null;

  async function insertOneOff() {
    if (!opensAt || !locksAt) return setMessage("Choose both the opening time and deadline.");
    if (new Date(opensAt) >= new Date(locksAt)) return setMessage("The one-off must open before its deadline.");
    if (fromTime > toTime) return setMessage("Kick-off From must be earlier than or equal to Kick-off To.");
    if (!window.confirm(`Insert a new one-off GW${anchor.number + 1} after GW${anchor.number}? Existing future gameweeks will move up one number but keep their dates and fixtures.`)) return;

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/gameweek", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${await accessToken()}` },
        body: JSON.stringify({
          insertAfterGameweekId: anchor.id,
          opensAt: new Date(opensAt).toISOString(),
          locksAt: new Date(locksAt).toISOString(),
          selectionRuleMode: "exact_time",
          selectionWeekday: weekday,
          selectionTimeFrom: fromTime,
          selectionTimeTo: toTime,
          selectionTime: fromTime,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not insert one-off gameweek.");
      setMessage(`One-off GW${payload.gameweek?.number ?? anchor.number + 1} inserted. Reloading the updated schedule…`);
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not insert one-off gameweek.");
      setBusy(false);
    }
  }

  return createPortal(
    <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid rgba(112,66,77,.55)" }}>
      <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, color: "#d9b85f", marginBottom: 8 }}>ONE-OFF / MIDWEEK GAMEWEEK</div>
      <p style={{ margin: "0 0 14px", color: "#cbbfc4", lineHeight: 1.45 }}>
        Insert an extra gameweek after GW {anchor.number}. The existing next Saturday round and every later round keep their dates, fixtures and data; only their GW numbers move up by one.
      </p>
      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}><strong>Opens</strong><input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} /></label>
        <label style={{ display: "grid", gap: 6 }}><strong>Deadline</strong><input type="datetime-local" value={locksAt} onChange={(e) => setLocksAt(e.target.value)} /></label>
        <label style={{ display: "grid", gap: 6 }}><strong>Eligible fixture day</strong><select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>{weekdays.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}><strong>Kick-offs from</strong><input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} /></label>
          <label style={{ display: "grid", gap: 6 }}><strong>Kick-offs to</strong><input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} /></label>
        </div>
        <small style={{ color: "#bcaeb4", lineHeight: 1.4 }}>The range is inclusive. For one exact kick-off, set From and To to the same time.</small>
        {message && <div style={{ border: "1px solid rgba(217,184,95,.5)", borderRadius: 9, padding: 10, color: "#f4e5d6", background: "rgba(217,184,95,.08)" }}>{message}</div>}
        <button type="button" disabled={busy} onClick={insertOneOff} style={{ border: 0, borderRadius: 10, padding: "13px 15px", background: "#9b254b", color: "#fff4e8", fontWeight: 900, fontSize: 16 }}>
          {busy ? "Inserting…" : `Insert one-off gameweek after GW ${anchor.number}`}
        </button>
      </div>
    </div>,
    target,
  );
}
