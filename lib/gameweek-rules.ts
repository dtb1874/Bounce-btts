const LONDON_TIME_ZONE = "Europe/London";

export type GameweekSelectionRule = {
  selection_rule_mode?: "exact_time" | "any_kickoff" | null;
  selection_weekday?: number | null;
  selection_time?: string | null;
};

export type GameweekTiming = GameweekSelectionRule & {
  locks_at: string;
};

export type ProviderFixtureLike = {
  fixture?: { date?: string | null; status?: { short?: string | null } | null } | null;
  league?: { country?: string | null } | null;
  teams?: {
    home?: { name?: string | null } | null;
    away?: { name?: string | null } | null;
  } | null;
};

const UK_COUNTRIES = new Set(["England", "Scotland", "Wales", "Northern Ireland", "Northern-Ireland"]);
const SELECTABLE_STATUSES = new Set(["NS", "TBD"]);

function parts(value: string | Date) {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));
  const get = (type: string) => formatted.find((part) => part.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: get("weekday"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

function isoWeekday(short: string) {
  const index = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(short);
  return index >= 0 ? index + 1 : 6;
}

function normaliseWeekday(value: number | null | undefined) {
  const weekday = Number(value ?? 6);
  return Number.isInteger(weekday) && weekday >= 1 && weekday <= 7 ? weekday : 6;
}

function normaliseTime(value: string | null | undefined) {
  const raw = String(value ?? "15:00").slice(0, 5);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(raw) ? raw : "15:00";
}

export function selectionRule(gameweek: GameweekSelectionRule) {
  return {
    mode: gameweek.selection_rule_mode === "any_kickoff" ? "any_kickoff" as const : "exact_time" as const,
    weekday: normaliseWeekday(gameweek.selection_weekday),
    time: normaliseTime(gameweek.selection_time),
  };
}

export function fixtureDateForGameweek(gameweek: GameweekTiming) {
  const lock = parts(gameweek.locks_at);
  const rule = selectionRule(gameweek);
  const lockWeekday = isoWeekday(lock.weekday);
  let daysAhead = (rule.weekday - lockWeekday + 7) % 7;

  if (daysAhead === 0 && rule.mode === "exact_time") {
    const [targetHour, targetMinute] = rule.time.split(":").map(Number);
    if (lock.hour > targetHour || (lock.hour === targetHour && lock.minute >= targetMinute)) daysAhead = 7;
  }

  const date = new Date(Date.UTC(lock.year, lock.month - 1, lock.day, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() + daysAhead);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function fixtureMatchesSelectionRule(item: ProviderFixtureLike, gameweek: GameweekSelectionRule) {
  const country = String(item.league?.country ?? "");
  if (!UK_COUNTRIES.has(country)) return false;

  const kickoffRaw = String(item.fixture?.date ?? "");
  if (!kickoffRaw || Number.isNaN(Date.parse(kickoffRaw))) return false;
  const kickoff = parts(kickoffRaw);
  const rule = selectionRule(gameweek);
  if (isoWeekday(kickoff.weekday) !== rule.weekday) return false;

  if (rule.mode === "exact_time") {
    const [hour, minute] = rule.time.split(":").map(Number);
    if (kickoff.hour !== hour || kickoff.minute !== minute) return false;
  }

  return SELECTABLE_STATUSES.has(String(item.fixture?.status?.short ?? "NS"));
}

export function isExcludedBounceClub(home: string, away: string) {
  const teams = `${home} ${away}`.toLowerCase();
  return teams.includes("heart of midlothian") || /(^|\s)hearts($|\s)/.test(teams)
    || teams.includes("hibernian") || /(^|\s)hibs($|\s)/.test(teams);
}

export function isEligibleProviderFixture(item: ProviderFixtureLike, gameweek: GameweekSelectionRule) {
  const home = String(item.teams?.home?.name ?? "");
  const away = String(item.teams?.away?.name ?? "");
  return fixtureMatchesSelectionRule(item, gameweek) && !isExcludedBounceClub(home, away);
}
