import { addUtcCalendarDays, isoDate, londonLocalToUtc, londonParts } from "@/lib/london-time";

function isoWeekday(short: string) {
  const index = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(short);
  return index >= 0 ? index + 1 : 6;
}

function parsedIsoDate(value: string | null | undefined) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day, 12));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day) return null;
  return { year, month, day };
}

export function nextNormalSaturday(now = new Date()) {
  const current = londonParts(now);
  const weekday = isoWeekday(current.weekday);
  const daysAhead = ((6 - weekday + 7) % 7) || 7;
  return addUtcCalendarDays(current.year, current.month, current.day, daysAhead);
}

export function buildNormalGameweekCalendar(count: number, firstFixtureDate?: string | null) {
  const total = Math.max(1, Math.min(60, Math.trunc(count)));
  const first = parsedIsoDate(firstFixtureDate) ?? nextNormalSaturday();

  return Array.from({ length: total }, (_, index) => {
    const fixtureDate = addUtcCalendarDays(first.year, first.month, first.day, index * 7);
    const openingDate = addUtcCalendarDays(fixtureDate.year, fixtureDate.month, fixtureDate.day, -5);
    const deadlineDate = addUtcCalendarDays(fixtureDate.year, fixtureDate.month, fixtureDate.day, -1);

    return {
      number: index + 1,
      status: "open" as const,
      opens_at: londonLocalToUtc(openingDate.year, openingDate.month, openingDate.day, 8, 0).toISOString(),
      locks_at: londonLocalToUtc(deadlineDate.year, deadlineDate.month, deadlineDate.day, 17, 0).toISOString(),
      selection_rule_mode: "exact_time" as const,
      selection_weekday: 6,
      selection_time: "15:00",
      fixture_date: isoDate(fixtureDate.year, fixtureDate.month, fixtureDate.day),
    };
  });
}
