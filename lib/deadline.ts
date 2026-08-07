const LONDON_TIME_ZONE = "Europe/London";

function londonParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: get("weekday"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

function londonLocalToUtc(year: number, month: number, day: number, hour: number, minute: number) {
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const observed = londonParts(new Date(wallClockAsUtc));
  const observedAsUtc = Date.UTC(
    observed.year,
    observed.month - 1,
    observed.day,
    observed.hour,
    observed.minute,
    observed.second,
    0,
  );
  const offset = observedAsUtc - wallClockAsUtc;
  return new Date(wallClockAsUtc - offset);
}

/** Returns the next Friday at 17:00 in Europe/London. */
export function nextFridayAtFiveIso(now = new Date()) {
  const current = londonParts(now);
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(current.weekday);
  let daysAhead = (5 - weekdayIndex + 7) % 7;

  if (daysAhead === 0 && (current.hour > 17 || (current.hour === 17 && current.minute >= 0))) {
    daysAhead = 7;
  }

  const dateOnly = new Date(Date.UTC(current.year, current.month - 1, current.day, 12, 0, 0));
  dateOnly.setUTCDate(dateOnly.getUTCDate() + daysAhead);

  return londonLocalToUtc(
    dateOnly.getUTCFullYear(),
    dateOnly.getUTCMonth() + 1,
    dateOnly.getUTCDate(),
    17,
    0,
  ).toISOString();
}
