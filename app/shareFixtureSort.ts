import { compareCompetitions } from "@/lib/competition-order";
import type { FixtureSharePick } from "./FixtureShareImage";

// Fixture-bearing shares must all use the same canonical competition order.
// Unknown competitions remain deterministic and sort after known competitions.
export function sortFixtureSharePicks(picks: FixtureSharePick[]) {
  return picks
    .map((pick, originalIndex) => ({ pick, originalIndex }))
    .sort((left, right) => {
      const a = left.pick;
      const b = right.pick;

      const competitionOrder = compareCompetitions(a.competition, b.competition);
      if (competitionOrder) return competitionOrder;

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
