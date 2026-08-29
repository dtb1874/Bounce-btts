import { addUtcCalendarDays, isoDate, londonParts } from "@/lib/london-time";

export type GameweekSelectionRule = {
  selection_rule_mode?: "exact_time" | "any_kickoff" | null;
  selection_weekday?: number | null;
  selection_time?: string | null;
  selection_times?: string[] | null;
  selection_time_from?: string | null;
  selection_time_to?: string | null;
  one_off_rule?: boolean | null;
};

export type GameweekTiming = GameweekSelectionRule & { locks_at: string };
export type ProviderFixtureLike = {
  fixture?: { date?: string | null; status?: { short?: string | null } | null } | null;
  league?: { country?: string | null } | null;
  teams?: { home?: { name?: string | null } | null; away?: { name?: string | null } | null } | null;
};

const UK_COUNTRIES = new Set(["England", "Scotland", "Wales", "Northern Ireland", "Northern-Ireland"]);
const SELECTABLE_STATUSES = new Set(["NS", "TBD"]);

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
  const legacyTimes = Array.isArray(gameweek.selection_times)
    ? gameweek.selection_times.map((value) => normaliseTime(value)).sort()
    : [];
  const fallback = normaliseTime(gameweek.selection_time);
  const from = normaliseTime(gameweek.selection_time_from ?? legacyTimes[0] ?? fallback);
  const toCandidate = normaliseTime(gameweek.selection_time_to ?? legacyTimes[legacyTimes.length - 1] ?? from);
  const to = toCandidate >= from ? toCandidate : from;
  return {
    mode: gameweek.selection_rule_mode === "any_kickoff" ? "any_kickoff" as const : "exact_time" as const,
    weekday: normaliseWeekday(gameweek.selection_weekday),
    time: from,
    from,
    to,
  };
}

export function fixtureDateForGameweek(gameweek: GameweekTiming) {
  const lock = londonParts(new Date(gameweek.locks_at));
  const rule = selectionRule(gameweek);
  const lockWeekday = isoWeekday(lock.weekday);
  let daysAhead = (rule.weekday - lockWeekday + 7) % 7;
  if (daysAhead === 0 && rule.mode === "exact_time") {
    const [targetHour, targetMinute] = rule.to.split(":").map(Number);
    if (lock.hour > targetHour || (lock.hour === targetHour && lock.minute >= targetMinute)) daysAhead = 7;
  }
  const target = addUtcCalendarDays(lock.year, lock.month, lock.day, daysAhead);
  return isoDate(target.year, target.month, target.day);
}

export function kickoffMatchesSelectionRule(kickoffValue: string | Date, gameweek: GameweekSelectionRule) {
  const kickoffDate = new Date(kickoffValue);
  if (Number.isNaN(kickoffDate.getTime())) return false;
  const kickoff = londonParts(kickoffDate);
  const rule = selectionRule(gameweek);
  if (isoWeekday(kickoff.weekday) !== rule.weekday) return false;
  if (rule.mode === "exact_time") {
    const kickoffTime = `${String(kickoff.hour).padStart(2, "0")}:${String(kickoff.minute).padStart(2, "0")}`;
    if (kickoffTime < rule.from || kickoffTime > rule.to) return false;
  }
  return true;
}

export function fixtureMatchesSelectionRule(item: ProviderFixtureLike, gameweek: GameweekSelectionRule) {
  const country = String(item.league?.country ?? "");
  if (!UK_COUNTRIES.has(country)) return false;
  const kickoffRaw = String(item.fixture?.date ?? "");
  if (!kickoffMatchesSelectionRule(kickoffRaw, gameweek)) return false;
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
