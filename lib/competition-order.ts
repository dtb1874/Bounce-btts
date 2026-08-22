export type CompetitionOrderRule = {
  rank: number;
  label: string;
  patterns: RegExp[];
};

// Canonical competition order for fixture-bearing Bounce share images.
// The current known ranks follow Bet365's BTTS competition section order.
// Unknown competitions are deterministic and sort after known competitions.
export const COMPETITION_ORDER_RULES: CompetitionOrderRule[] = [
  { rank: 10, label: "England Premier League", patterns: [/\b(?:english|england) premier league\b/i, /^premier league$/i] },
  { rank: 20, label: "England Championship", patterns: [/\b(?:english|england) championship\b/i, /^efl championship$/i, /^championship$/i] },
  { rank: 30, label: "England League 1", patterns: [/\b(?:english|england) league (?:one|1)\b/i, /^efl league one$/i, /^league one$/i] },
  { rank: 40, label: "England League 2", patterns: [/\b(?:english|england) league (?:two|2)\b/i, /^efl league two$/i, /^league two$/i] },
  { rank: 45, label: "England Carabao Cup", patterns: [/\b(?:england\s+)?(?:carabao|efl|league) cup\b/i] },
  { rank: 50, label: "Scotland Premiership", patterns: [/\b(?:scottish|scotland) premiership\b/i, /^premiership$/i] },
  { rank: 60, label: "England National League", patterns: [/\b(?:england\s+)?national league\b(?!\s+(?:north|south))/i] },
  { rank: 70, label: "England National League North", patterns: [/\b(?:england\s+)?national league north\b/i] },
  { rank: 80, label: "England National League South", patterns: [/\b(?:england\s+)?national league south\b/i] },
  { rank: 90, label: "Northern Ireland Premier", patterns: [/\b(?:northern irish premiership|northern ireland (?:premier|premiership)|nifl premiership)\b/i] },
  { rank: 100, label: "Northern Ireland Championship", patterns: [/\b(?:northern irish championship|northern ireland championship|nifl championship)\b/i] },
  { rank: 110, label: "Scotland Championship", patterns: [/\b(?:scottish|scotland) championship\b/i] },
  { rank: 120, label: "Scotland League One", patterns: [/\b(?:scottish|scotland) league (?:one|1)\b/i] },
  { rank: 130, label: "Scotland League Two", patterns: [/\b(?:scottish|scotland) league (?:two|2)\b/i] },
  { rank: 140, label: "Wales Premier League", patterns: [/\b(?:welsh premier league|wales premier league|cymru premier)\b/i] },
  { rank: 150, label: "FAW Championship", patterns: [/\b(?:faw championship|welsh championship)\b/i] },
  { rank: 160, label: "FA Cup", patterns: [/\b(?:english|england)?\s*fa cup\b/i] },
  { rank: 170, label: "Scottish Cup", patterns: [/\bscottish cup\b/i] },
  { rank: 180, label: "Premier Sports Cup", patterns: [/\b(?:premier sports cup|scottish league cup)\b/i] },
  { rank: 190, label: "Scottish Challenge Cup", patterns: [/\bscottish challenge cup\b/i] },
];

function normalise(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function competitionRank(value: string) {
  const name = normalise(value);
  const rule = COMPETITION_ORDER_RULES.find((candidate) => candidate.patterns.some((pattern) => pattern.test(name)));
  return rule?.rank ?? 500;
}

export function compareCompetitions(a: string, b: string) {
  const rankOrder = competitionRank(a) - competitionRank(b);
  if (rankOrder) return rankOrder;
  return normalise(a).localeCompare(normalise(b), "en-GB", { sensitivity: "base" });
}
