import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const mustContain = (file, snippets) => {
  const source = read(file);
  for (const snippet of snippets) assert.ok(source.includes(snippet), `${file} must include ${snippet}`);
};

test("V2 picks and fixtures retain all selected matches regardless of fixture gameweek assignment", () => {
  mustContain("app/v2-preview/page.tsx", [
    'predictions.map((prediction) => prediction.fixture_id)',
    '.in("id", missingPredictionFixtureIds)',
    '.eq("gameweek_id", currentGameweek.id)',
  ]);
  mustContain("app/page.tsx", ["pickedFixtures.push", "initialFixtures={completeFixtures}", "fixtures={pickedFixtures}"]);
  mustContain("app/v2-preview/V2PreviewClient.tsx", [
    "selectedIds.has(row.id)",
    "if (gameweekId) void reloadSelectedGameweek()",
    "browserFixtures.find(row => row.id === fixtureId)",
  ]);
});

test("V2 uses canonical UK fixture and round eligibility enforcement", () => {
  mustContain("lib/api-football.ts", ["isCompetitionEnabled", "isRoundEnabled"]);
  mustContain("app/api/admin/fixtures/route.ts", ["isUkFixtureCountry", "fixture_competition_settings", "fixture_round_settings"]);
  mustContain("app/LeagueApp.tsx", ["<UKLeagueSelector onChanged", "One unobtrusive odds check", "gameweekId:gameweek.id,fixtureId"]);
  mustContain("app/api/admin/competitions/route.ts", ["export async function GET", "export async function PATCH"]);
  mustContain("app/v2/admin/V2AdminFixtures.tsx", ["UKLeagueSelector", "fixtureRound"]);
});

test("V2 selected fixture odds update automatically without delaying member actions", () => {
  mustContain("app/api/share/refresh-odds/route.ts", ["getUser(bearer)", "profile.role === \"guest\"", "runSelectedOddsRefresh(gameweekId,fixtureId)"]);
  mustContain("app/v2-preview/V2PreviewClient.tsx", [
    "Startup only: not repeated when switching gameweeks",
    "body: JSON.stringify({ gameweekId: selectedGameweekId, fixtureId })",
    'setMessage("Pick saved ✓")',
  ]);
});

test("V2 retains score-integrity, single-tap discovery and sweep share data", () => {
  mustContain("app/ValueLeaderPortal.tsx", ["hasPlausibleShotStats(item.stats)"]);
  mustContain("app/EasterEggDiscovery.tsx", ["function onClick(event: MouseEvent)"]);
  mustContain("app/SweepTracker.tsx", ["Average:", "average.toFixed(1)"]);
  mustContain("app/v2/V2DashboardParity.tsx", ["<SweepTracker inline", "<PositionRacePortal inline"]);
});

test("V2 gameweek control belongs to the shell, not a sticky overlay on every page", () => {
  mustContain("app/ui/AuthenticatedShellFrame.tsx", ["gameweekControl?: ReactNode", "v2MobileGameweek", "v2DesktopGameweek"]);
  mustContain("app/v2-preview/V2PreviewClient.tsx", ['gameweekControl={<select', 'aria-label="Select gameweek"']);
  const css = read("app/v2-preview/V2PreviewClient.module.css");
  assert.ok(!css.includes(".previewHeader{"), "Remove the overlaid gameweek rail");
  mustContain("app/ui-foundation-shell-responsive.css", [".v2Sidebar::after", "display:none !important;content:none !important", ".v2MobileGameweek select"]);
});

test("Awards section is gated by published snapshots with no premature activation", () => {
  mustContain("lib/awards/contracts.ts", ["AwardsSeasonSnapshot", "finalisationKey", "AwardsSeenState"]);
  mustContain("lib/awards/ceremony-state.ts", ["snapshot.visibility === \"public\"", "visibleAwards", "buildCeremonySteps"]);
  mustContain("app/v2/awards/V2AwardsStage.tsx", ["Skip to champion", "Replay", "Pause", "canPublish"]);
  mustContain("app/v2/awards/V2AwardsArchive.tsx", ['snapshot.visibility!=="public"', "Replay the Awards Show"]);
});
