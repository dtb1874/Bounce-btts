"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { fixtureDateForGameweek } from "@/lib/gameweek-rules";
import { addUtcCalendarDays, londonLocalToUtc, londonParts } from "@/lib/london-time";

type Gameweek = {
  id: string;
  number: number;
  status: "open" | "locked" | "complete";
  opens_at: string | null;
  locks_at: string;
  selection_rule_mode?: "exact_time" | "any_kickoff";
  selection_weekday?: number;
  selection_time?: string;
  one_off_rule?: boolean;
};

const weekdays = [
  [1, "Monday"], [2, "Tuesday"], [3, "Wednesday"], [4, "Thursday"],
  [5, "Friday"], [6, "Saturday"], [7, "Sunday"],
] as const;
const weekdayLabels = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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

function isoWeekday(year: number, month: number, day: number) {
  const value = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
  return value === 0 ? 7 : value;
}

function weekdayForIsoDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? isoWeekday(Number(match[1]), Number(match[2]), Number(match[3])) : null;
}

function calendarDayDifference(from: string, to: string) {
  const a = from.split("-").map(Number);
  const b = to.split("-").map(Number);
  if (a.length !== 3 || b.length !== 3 || a.some(Number.isNaN) || b.some(Number.isNaN)) return null;
  return Math.round((Date.UTC(b[0], b[1] - 1, b[2], 12) - Date.UTC(a[0], a[1] - 1, b[2], 12) + (Date.UTC(a[0], a[1] - 1, a[2], 12) - Date.UTC(a[0], a[1] - 1, b[2], 12))) / 86_400_000);
}

function shiftLondonInstant(iso: string | null, days: number) {
  if (!iso) return null;
  const parts = londonParts(new Date(iso));
  const shifted = addUtcCalendarDays(parts.year, parts.month, parts.day, days);
  return londonLocalToUtc(shifted.year, shifted.month, shifted.day, parts.hour, parts.minute).toISOString();
}

function displayDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export default function OneOffGameweekPortal({ gameweeks }: { gameweeks: Gameweek[] }) {
  const [target, setTarget] = useState<Element | null>(null);
  const [anchorNumber, setAnchorNumber] = useState<number | null>(null);
  const [newDate, setNewDate] = useState("");
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
  const currentDate = useMemo(() => anchor ? fixtureDateForGameweek(anchor) : "", [anchor]);
  useEffect(() => { setNewDate(currentDate); setMessage(""); }, [anchor?.id, currentDate]);

  if (!target || !anchor) return null;
  const activeAnchor = anchor;

  async function moveGameweek() {
    if (activeAnchor.one_off_rule) return setMessage("This is a one-off gameweek. Use the detailed Gameweek Mechanics controls for a special round.");
    if (!newDate || !currentDate) return setMessage("Choose the new gameweek date.");
    if (newDate === currentDate) return setMessage(`GW${activeAnchor.number} is already scheduled for ${displayDate(currentDate)}.`);

    const expectedWeekday = activeAnchor.selection_weekday ?? 6;
    if (weekdayForIsoDate(newDate) !== expectedWeekday) {
      return setMessage(`Choose a ${weekdayLabels[expectedWeekday]} for the simple move. Use Gameweek Mechanics if the eligible fixture day itself needs to change.`);
    }

    const days = calendarDayDifference(currentDate, newDate);
    if (days == null || days === 0) return setMessage("Choose a different valid date.");
    const shiftedLocksAt = shiftLondonInstant(activeAnchor.locks_at, days);
    const shiftedOpensAt = shiftLondonInstant(activeAnchor.opens_at, days);
    if (!shiftedLocksAt) return setMessage("The current deadline could not be read.");

    const laterNormal = gameweeks.filter((gw) => gw.number > activeAnchor.number && !gw.one_off_rule).length;
    const direction = days > 0 ? `forward ${days} day${days === 1 ? "" : "s"}` : `back ${Math.abs(days)} day${days === -1 ? "" : "s"}`;
    if (!window.confirm(
      `Move GW${activeAnchor.number} from ${displayDate(currentDate)} to ${displayDate(newDate)}?\n\n` +
      `Its opening and deadline will move ${direction}. ${laterNormal} later normal gameweek${laterNormal === 1 ? "" : "s"} will shift by the same amount automatically. Existing gameweek IDs, fixtures, selections and results are preserved.`,
    )) return;

    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/gameweek", {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${await accessToken()}` },
        body: JSON.stringify({
          id: activeAnchor.id,
          status: activeAnchor.status,
          opensAt: shiftedOpensAt,
          locksAt: shiftedLocksAt,
          selectionRuleMode: activeAnchor.selection_rule_mode ?? "exact_time",
          selectionWeekday: expectedWeekday,
          selectionTime: (activeAnchor.selection_time ?? "15:00").slice(0, 5),
          oneOffRule: false,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not move the gameweek.");
      setMessage(`GW${activeAnchor.number} moved to ${displayDate(newDate)}. Later normal gameweeks shifted automatically. Reloading…`);
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not move the gameweek.");
      setBusy(false);
    }
  }

  async function insertOneOff() {
    if (!opensAt || !locksAt) return setMessage("Choose both the opening time and deadline.");
    if (new Date(opensAt) >= new Date(locksAt)) return setMessage("The one-off must open before its deadline.");
    if (fromTime > toTime) return setMessage("Kick-off From must be earlier than or equal to Kick-off To.");
    if (!window.confirm(`Insert a new one-off GW${activeAnchor.number + 1} after GW${activeAnchor.number}? Existing future gameweeks will move up one number but keep their dates and fixtures.`)) return;

    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/gameweek", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${await accessToken()}` },
        body: JSON.stringify({
          insertAfterGameweekId: activeAnchor.id,
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
      setMessage(`One-off GW${payload.gameweek?.number ?? activeAnchor.number + 1} inserted. Reloading the updated schedule…`);
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not insert one-off gameweek.");
      setBusy(false);
    }
  }

  async function removeGameweek() {
    const later = gameweeks.filter((gw) => gw.number > activeAnchor.number).length;
    const consequence = later > 0
      ? `GW${activeAnchor.number + 1} will become GW${activeAnchor.number}, and every later gameweek will move down one number.`
      : "This is the final scheduled gameweek, so no later numbers need to move.";
    if (!window.confirm(`Remove GW${activeAnchor.number}? ${consequence}\n\nThis is only allowed before the gameweek opens and when it has no player selections or score adjustments. Imported fixtures for the removed round will also be deleted.`)) return;

    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/gameweek", {
        method: "DELETE",
        headers: { "content-type": "application/json", authorization: `Bearer ${await accessToken()}` },
        body: JSON.stringify({ id: activeAnchor.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not remove gameweek.");
      setMessage(`GW${payload.result?.removedNumber ?? activeAnchor.number} removed. ${payload.result?.shiftedGameweeks ?? later} later gameweek(s) renumbered. Reloading…`);
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove gameweek.");
      setBusy(false);
    }
  }

  return createPortal(
    <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid rgba(112,66,77,.55)" }}>
      <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, color: "#d9b85f", marginBottom: 8 }}>MOVE GAMEWEEK DATE</div>
      <p style={{ margin: "0 0 12px", color: "#cbbfc4", lineHeight: 1.45 }}>
        Move GW {activeAnchor.number} to another {weekdayLabels[activeAnchor.selection_weekday ?? 6]}. Its opening and deadline move with it, and every later normal gameweek shifts by the same number of days.
      </p>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ color: "#bcaeb4", fontSize: 13 }}>Current fixture date: <strong style={{ color: "#f4e5d6" }}>{displayDate(currentDate)}</strong></div>
        <label style={{ display: "grid", gap: 6 }}><strong>New gameweek date</strong><input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} /></label>
        <button type="button" disabled={busy || !newDate || newDate === currentDate} onClick={moveGameweek} style={{ border: 0, borderRadius: 10, padding: "13px 15px", background: "#9b254b", color: "#fff4e8", fontWeight: 900, fontSize: 16 }}>
          {busy ? "Working…" : `Move GW ${activeAnchor.number} and shift later weeks`}
        </button>
      </div>

      <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid rgba(112,66,77,.55)" }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, color: "#d9b85f", marginBottom: 8 }}>ONE-OFF / MIDWEEK GAMEWEEK</div>
        <p style={{ margin: "0 0 8px", color: "#cbbfc4", lineHeight: 1.45 }}>
          Insert an extra gameweek after GW {activeAnchor.number}. The existing next Saturday round and every later round keep their dates, fixtures and data; only their GW numbers move up by one.
        </p>
        <p style={{ margin: "0 0 14px", color: "#d9b85f", fontSize: 12, lineHeight: 1.45 }}>
          Times are entered as UK local time. Use the clock time players will see in the UK; GMT/BST changes are handled by the dated timestamp rather than by manually adding or subtracting an hour.
        </p>
        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}><strong>Opens (UK time)</strong><input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} /></label>
          <label style={{ display: "grid", gap: 6 }}><strong>Deadline (UK time)</strong><input type="datetime-local" value={locksAt} onChange={(e) => setLocksAt(e.target.value)} /></label>
          <label style={{ display: "grid", gap: 6 }}><strong>Eligible fixture day</strong><select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>{weekdays.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}><strong>Kick-offs from</strong><input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} /></label>
            <label style={{ display: "grid", gap: 6 }}><strong>Kick-offs to</strong><input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} /></label>
          </div>
          <small style={{ color: "#bcaeb4", lineHeight: 1.4 }}>The range is inclusive and uses UK fixture times. For one exact kick-off, set From and To to the same time.</small>
          {message && <div style={{ border: "1px solid rgba(217,184,95,.5)", borderRadius: 9, padding: 10, color: "#f4e5d6", background: "rgba(217,184,95,.08)" }}>{message}</div>}
          <button type="button" disabled={busy} onClick={insertOneOff} style={{ border: 0, borderRadius: 10, padding: "13px 15px", background: "#9b254b", color: "#fff4e8", fontWeight: 900, fontSize: 16 }}>
            {busy ? "Working…" : `Insert one-off gameweek after GW ${activeAnchor.number}`}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid rgba(176,77,77,.45)" }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, color: "#e58d8d", marginBottom: 8 }}>REMOVE FUTURE GAMEWEEK</div>
        <p style={{ margin: "0 0 12px", color: "#cbbfc4", lineHeight: 1.45 }}>
          Remove selected GW {activeAnchor.number} only if it has not opened and has no player selections or score adjustments. Later rounds keep their IDs, dates and data and move down one GW number.
        </p>
        <button type="button" disabled={busy} onClick={removeGameweek} style={{ width: "100%", border: "1px solid rgba(229,141,141,.65)", borderRadius: 10, padding: "12px 15px", background: "rgba(126,35,45,.22)", color: "#ffd9d9", fontWeight: 900, fontSize: 15 }}>
          {busy ? "Working…" : `Remove GW ${activeAnchor.number}`}
        </button>
      </div>
    </div>,
    target,
  );
}
