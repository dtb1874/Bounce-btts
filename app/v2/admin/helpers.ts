import { createClient } from "@/lib/supabase/client";
import { addUtcCalendarDays, londonLocalToUtc, londonParts } from "@/lib/london-time";
import type { Fixture } from "./types";

export const finishedStatuses = new Set(["FT", "AET", "PEN"]);
export const weekdays = [[1, "Monday"], [2, "Tuesday"], [3, "Wednesday"], [4, "Thursday"], [5, "Friday"], [6, "Saturday"], [7, "Sunday"]] as const;

export async function token() {
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token ?? "";
}
export function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}
export function localInput(value: string | null | undefined) {
  if (!value) return "";
  const p = londonParts(new Date(value));
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}T${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}
export function displayFixture(fixture: Fixture | undefined) {
  return fixture?.home_team && fixture?.away_team ? `${fixture.home_team} v ${fixture.away_team}` : "No selection";
}
export function fixtureMeta(fixture: Fixture) {
  return [fixture.competition, formatDate(fixture.kickoff_at), fixture.odds_fractional ? `${fixture.odds_fractional} BTTS` : null].filter(Boolean).join(" · ");
}
export function calendarDayDifference(from: string, to: string) {
  const a = from.split("-").map(Number), b = to.split("-").map(Number);
  if (a.length !== 3 || b.length !== 3 || a.some(Number.isNaN) || b.some(Number.isNaN)) return null;
  return Math.round((Date.UTC(b[0], b[1] - 1, b[2], 12) - Date.UTC(a[0], a[1] - 1, a[2], 12)) / 86_400_000);
}
export function shiftLondonInstant(iso: string | null, days: number) {
  if (!iso) return null;
  const parts = londonParts(new Date(iso));
  const shifted = addUtcCalendarDays(parts.year, parts.month, parts.day, days);
  return londonLocalToUtc(shifted.year, shifted.month, shifted.day, parts.hour, parts.minute).toISOString();
}
export function weekdayForDate(value: string) {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const day = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12)).getUTCDay();
  return day === 0 ? 7 : day;
}
export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase();
}
