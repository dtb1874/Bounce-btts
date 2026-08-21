import type { FixtureSharePick } from "./FixtureShareImage";

const competitionOrder: Array<[RegExp, number]> = [
  [/\benglish premier league\b/i, 10],
  [/\benglish championship\b/i, 20],
  [/\benglish league one\b/i, 30],
  [/\benglish league two\b/i, 40],
  [/\bscottish premiership\b/i, 50],
  [/\bscottish championship\b/i, 60],
  [/\bscottish league one\b/i, 70],
  [/\bscottish league two\b/i, 80],
  [/\bnational league north\b/i, 90],
  [/\bnational league south\b/i, 100],
  [/\bnational league\b/i, 110],
];

function competitionRank(name: string) {
  return competitionOrder.find(([pattern]) => pattern.test(name))?.[1] ?? 500;
}

function kickoffKey(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function sortFixtureSharePicks(picks: FixtureSharePick[]) {
  return picks
    .map((pick, originalIndex) => ({ pick, originalIndex }))
    .sort((left, right) => {
      const a = left.pick;
      const b = right.pick;
      const aKickoff = kickoffKey(a.kickoffAt);
      const bKickoff = kickoffKey(b.kickoffAt);

      if (aKickoff !== null && bKickoff !== null && aKickoff !== bKickoff) return aKickoff - bKickoff;
      if ((aKickoff === null || bKickoff === null) && a.kickoffAt !== b.kickoffAt) {
        const rawKickoffOrder = a.kickoffAt.localeCompare(b.kickoffAt, "en-GB", { sensitivity: "base" });
        if (rawKickoffOrder) return rawKickoffOrder;
      }

      const rankOrder = competitionRank(a.competition) - competitionRank(b.competition);
      if (rankOrder) return rankOrder;

      const competitionNameOrder = a.competition.localeCompare(b.competition, "en-GB", { sensitivity: "base" });
      if (competitionNameOrder) return competitionNameOrder;

      const fixtureNameOrder = `${a.homeTeam} v ${a.awayTeam}`.localeCompare(`${b.homeTeam} v ${b.awayTeam}`, "en-GB", { sensitivity: "base" });
      if (fixtureNameOrder) return fixtureNameOrder;

      return left.originalIndex - right.originalIndex;
    })
    .map(({ pick }) => pick);
}
