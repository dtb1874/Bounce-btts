import { addUtcCalendarDays, londonLocalToUtc, londonParts } from "@/lib/london-time";

/** Returns the next Friday at 17:00 in Europe/London. */
export function nextFridayAtFiveIso(now = new Date()) {
  const current = londonParts(now);
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(current.weekday);
  let daysAhead = (5 - weekdayIndex + 7) % 7;

  if (daysAhead === 0 && (current.hour > 17 || (current.hour === 17 && current.minute >= 0))) {
    daysAhead = 7;
  }

  const target = addUtcCalendarDays(current.year, current.month, current.day, daysAhead);
  return londonLocalToUtc(target.year, target.month, target.day, 17, 0).toISOString();
}
