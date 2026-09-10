"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { addUtcCalendarDays, isoDate, londonLocalToUtc, londonParts } from "@/lib/london-time";

type GameweekRef = { id: string; number: number };
type Gameweek = GameweekRef & {
  status: "open" | "locked" | "complete";
  opens_at: string | null;
  locks_at: string;
  selection_rule_mode?: "exact_time" | "any_kickoff";
  selection_weekday?: number;
  selection_time?: string;
  one_off_rule?: boolean;
};

async function accessToken() {
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token ?? "";
}

function selectedGameweekNumber() {
  const save = Array.from(document.querySelectorAll("button")).find((button) =>
    /^Save Gameweek \d+ settings$/.test(button.textContent?.trim() ?? ""),
  );
  const match = save?.textContent?.match(/Gameweek (\d+)/);
  return match ? Number(match[1]) : null;
}

function isoWeekday(year: number, month: number, day: number) {
  const value = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
  return value === 0 ? 7 : value;
}

function fixtureDateForGameweek(gameweek: Gameweek | null) {
  if (!gameweek?.locks_at) return "";
  const lock = londonParts(new Date(gameweek.locks_at));
  const currentWeekday = isoWeekday(lock.year, lock.month, lock.day);
  const targetWeekday = gameweek.selection_weekday ?? 6;
  const daysAhead = (targetWeekday - currentWeekday + 7) % 7;
  const date = addUtcCalendarDays(lock.year, lock.month, lock.day, daysAhead);
  return isoDate(date.year, date.month, date.day);
}

function weekdayForIsoDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? isoWeekday(Number(match[1]), Number(match[2]), Number(match[3])) : null;
}

function calendarDayDifference(from: string, to: string) {
  const a = from.split("-").map(Number);
  const b = to.split("-").map(Number);
  if (a.length !== 3 || b.length !== 3 || a.some(Number.isNaN) || b.some(Number.isNaN)) return null;
  return Math.round((Date.UTC(b[0], b[1] - 1, b[2], 12) - Date.UTC(a[0], a[1] - 1, a[2], 12)) / 86_400_000);
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

export default function MoveGameweekPortal({ gameweeks }: { gameweeks: GameweekRef[] }) {
  const [target, setTarget] = useState<Element | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [gameweek, setGameweek] = useState<Gameweek | null>(null);
  const [newDate, setNewDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const locate = () => {
      const title = Array.from(document.querySelectorAll("div")).find((node) => node.textContent?.trim() === "GAMEWEEK MECHANICS");
      setTarget(title?.closest("section") ?? null);
      setSelectedNumber(selectedGameweekNumber());
    };
    locate();
    const observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  const selectedRef = useMemo(() => gameweeks.find((gw) => gw.number === selectedNumber) ?? null, [gameweeks, selectedNumber]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!selectedRef) { setGameweek(null); return; }
      const { data } = await createClient()
        .from("gameweeks")
        .select("id,number,status,opens_at,locks_at,selection_rule_mode,selection_weekday,selection_time,one_off_rule")
        .eq("id", selectedRef.id)
        .maybeSingle();
      if (!cancelled) setGameweek((data as Gameweek | null) ?? null);
    }
    load();
    return () => { cancelled = true; };
  }, [selectedRef?.id]);

  const currentDate = useMemo(() => fixtureDateForGameweek(gameweek), [gameweek]);
  useEffect(() => { setNewDate(currentDate); setMessage(""); }, [gameweek?.id, currentDate]);

  if (!target || !gameweek) return null;

  async function moveGameweek() {
    if (gameweek.one_off_rule) return setMessage("This is a one-off gameweek. Use the detailed Gameweek Mechanics controls for a special round.");
    if (!newDate || !currentDate) return setMessage("Choose the new gameweek date.");
    if (newDate === currentDate) return setMessage(`GW${gameweek.number} is already scheduled for ${displayDate(currentDate)}.`);

    const expectedWeekday = gameweek.selection_weekday ?? 6;
    if (weekdayForIsoDate(newDate) !== expectedWeekday) {
      const label = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][expectedWeekday];
      return setMessage(`Choose a ${label} for the simple move. Use Gameweek Mechanics if the eligible fixture day itself needs to change.`);
    }

    const days = calendarDayDifference(currentDate, newDate);
    if (days == null || days === 0) return setMessage("Choose a different valid date.");
    const locksAt = shiftLondonInstant(gameweek.locks_at, days);
    const opensAt = shiftLondonInstant(gameweek.opens_at, days);
    if (!locksAt) return setMessage("The current deadline could not be read.");

    const later = gameweeks.filter((gw) => gw.number > gameweek.number).length;
    const direction = days > 0 ? `forward ${days} day${days === 1 ? "" : "s"}` : `back ${Math.abs(days)} day${days === -1 ? "" : "s"}`;
    if (!window.confirm(
      `Move GW${gameweek.number} from ${displayDate(currentDate)} to ${displayDate(newDate)}?\n\n` +
      `Its opening and deadline will move ${direction}. Up to ${later} later gameweek${later === 1 ? "" : "s"} will be considered by the existing propagation rule; one-off rounds remain fixed. Existing gameweek IDs, fixtures, selections and results are preserved.`,
    )) return;

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/gameweek", {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${await accessToken()}` },
        body: JSON.stringify({
          id: gameweek.id,
          status: gameweek.status,
          opensAt,
          locksAt,
          selectionRuleMode: gameweek.selection_rule_mode ?? "exact_time",
          selectionWeekday: expectedWeekday,
          selectionTime: (gameweek.selection_time ?? "15:00").slice(0, 5),
          oneOffRule: false,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not move the gameweek.");
      setMessage(`GW${gameweek.number} moved to ${displayDate(newDate)}. Later normal gameweeks shifted automatically. Reloading…`);
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not move the gameweek.");
      setBusy(false);
    }
  }

  return createPortal(
    <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid rgba(112,66,77,.55)" }}>
      <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.5, color: "#d9b85f", marginBottom: 8 }}>MOVE GAMEWEEK DATE</div>
      <p style={{ margin: "0 0 12px", color: "#cbbfc4", lineHeight: 1.45 }}>
        Move GW {gameweek.number} to another {(["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])[gameweek.selection_weekday ?? 6]}. Its opening and deadline move with it, and later normal gameweeks shift by the same amount.
      </p>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ color: "#bcaeb4", fontSize: 13 }}>Current fixture date: <strong style={{ color: "#f4e5d6" }}>{displayDate(currentDate)}</strong></div>
        <label style={{ display: "grid", gap: 6 }}><strong>New gameweek date</strong><input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} /></label>
        {message && <div style={{ border: "1px solid rgba(217,184,95,.5)", borderRadius: 9, padding: 10, color: "#f4e5d6", background: "rgba(217,184,95,.08)" }}>{message}</div>}
        <button type="button" disabled={busy || !newDate || newDate === currentDate} onClick={moveGameweek} style={{ border: 0, borderRadius: 10, padding: "13px 15px", background: "#9b254b", color: "#fff4e8", fontWeight: 900, fontSize: 16 }}>
          {busy ? "Moving…" : `Move GW ${gameweek.number} and shift later weeks`}
        </button>
      </div>
    </div>,
    target,
  );
}
