import type { FixtureSharePick } from "./FixtureShareImage";

// Canonical Bet365-style competition order used for shared fixture images.
// All authorised Bounce fixtures use the same kickoff window, so competition
// position is the primary sort. Unknown competitions remain deterministic.
const competitionOrder: Array<[RegExp, number]> = [
  [/\b(?:english|england) premier league\b/i, 10],
  [/\b(?:english|england) championship\b/i, 20],
  [/\b(?:english|england) league (?:one|1)\b/i, 30],
  [/\b(?:english|england) league (?:two|2)\b/i, 40],
  [/\b(?:england\s+)?(?:carabao|efl|league) cup\b/i, 45],
  [/\b(?:scottish|scotland) premiership\b/i, 50],
  [/\b(?:england\s+)?national league\b(?!\s+(?:north|south))/i, 60],
  [/\b(?:england\s+)?national league north\b/i, 70],
  [/\b(?:england\s+)?national league south\b/i, 80],
  [/\b(?:northern irish premiership|northern ireland (?:premier|premiership)|nifl premiership)\b/i, 90],
  [/\b(?:northern irish championship|northern ireland championship|nifl championship)\b/i, 100],
  [/\b(?:scottish|scotland) championship\b/i, 110],
  [/\b(?:scottish|scotland) league (?:one|1)\b/i, 120],
  [/\b(?:scottish|scotland) league (?:two|2)\b/i, 130],
  [/\b(?:welsh premier league|wales premier league|cymru premier)\b/i, 140],
  [/\b(?:faw championship|welsh championship)\b/i, 150],
  [/\b(?:english|england)?\s*fa cup\b/i, 160],
  [/\bscottish cup\b/i, 170],
  [/\b(?:premier sports cup|scottish league cup)\b/i, 180],
  [/\bscottish challenge cup\b/i, 190],
];

function competitionRank(name: string) {
  return competitionOrder.find(([pattern]) => pattern.test(name.trim()))?.[1] ?? 500;
}

export function sortFixtureSharePicks(picks: FixtureSharePick[]) {
  return picks
    .map((pick, originalIndex) => ({ pick, originalIndex }))
    .sort((left, right) => {
      const a = left.pick;
      const b = right.pick;

      const rankOrder = competitionRank(a.competition) - competitionRank(b.competition);
      if (rankOrder) return rankOrder;

      const competitionNameOrder = a.competition.localeCompare(b.competition, "en-GB", { sensitivity: "base" });
      if (competitionNameOrder) return competitionNameOrder;

      const fixtureNameOrder = `${a.homeTeam} v ${a.awayTeam}`.localeCompare(
        `${b.homeTeam} v ${b.awayTeam}`,
        "en-GB",
        { sensitivity: "base" },
      );
      if (fixtureNameOrder) return fixtureNameOrder;

      return left.originalIndex - right.originalIndex;
    })
    .map(({ pick }) => pick);
}
