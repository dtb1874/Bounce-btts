import { createAdminClient } from "@/lib/supabase/admin";
import { applyMissedPickPenalties } from "@/lib/missed-picks";
import { competitionDisplayName } from "@/lib/competition-display";
import {
  calculateLeagueStats,
  type LeagueStatsAdjustment,
  type LeagueStatsFixture,
  type LeagueStatsFormRow,
  type LeagueStatsHeadline,
  type LeagueStatsPlayerInsight,
  type LeagueStatsPrediction,
  type LeagueStatsFact,
  type LeagueStatsStanding,
} from "@/lib/league-stats";

export type PublicStandingRow = LeagueStatsStanding;
export type PublicFormRow = LeagueStatsFormRow;
export type PublicPlayerInsight = LeagueStatsPlayerInsight;
export type PublicSeasonFact = LeagueStatsFact;

export type PublicTableData = {
  seasonLabel: string;
  prizePot: number;
  gameweekNumber: number | null;
  rows: PublicStandingRow[];
  formGameweeks: number[];
  formRows: PublicFormRow[];
  leagueGoals: number;
  finishedPicks: number;
  recordedSelections: number;
  seasonFacts: PublicSeasonFact[];
  playerInsights: PublicPlayerInsight[];
  headline: LeagueStatsHeadline;
};

export async function loadPublicTableData(): Promise<PublicTableData> {
  const admin = createAdminClient();
  await applyMissedPickPenalties(admin).catch(() => 0);

  const [{ data: settings }, { data: currentSeason }] = await Promise.all([
    admin.from("league_settings").select("current_season_label,entry_fee").eq("id", true).maybeSingle(),
    admin.from("seasons").select("id,label").eq("is_current", true).maybeSingle(),
  ]);

  const { data: gameweeks } = currentSeason?.id
    ? await admin
        .from("gameweeks")
        .select("id,number,opens_at,locks_at,status")
        .eq("season_id", currentSeason.id)
        .order("number")
    : { data: [] };

  const gameweekIds = (gameweeks ?? []).map((gameweek) => gameweek.id);
  const nowIso = new Date().toISOString();
  const currentGameweek =
    (gameweeks ?? [])
      .filter((gameweek) => !gameweek.opens_at || gameweek.opens_at <= nowIso)
      .sort((a, b) => b.number - a.number)[0] ?? null;

  const { data: profiles } = await admin
    .from("profiles")
    .select("id,display_name,role,active")
    .eq("approved", true)
    .eq("active", true)
    .neq("role", "guest");

  let predictions: LeagueStatsPrediction[] = [];
  let adjustments: LeagueStatsAdjustment[] = [];
  if (gameweekIds.length) {
    const [predictionResponse, adjustmentResponse] = await Promise.all([
      admin
        .from("predictions")
        .select("gameweek_id,member_id,fixture_id,points_awarded,created_at")
        .in("gameweek_id", gameweekIds),
      admin
        .from("score_adjustments")
        .select("gameweek_id,member_id,points")
        .in("gameweek_id", gameweekIds),
    ]);
    predictions = (predictionResponse.data ?? []) as LeagueStatsPrediction[];
    adjustments = (adjustmentResponse.data ?? []) as LeagueStatsAdjustment[];
  }

  const fixtureIds = Array.from(new Set(predictions.map((prediction) => prediction.fixture_id)));
  let fixtures: LeagueStatsFixture[] = [];
  if (fixtureIds.length) {
    const fixtureResponse = await admin
      .from("fixtures")
      .select("id,competition,country,home_team,away_team,home_score,away_score,odds_fractional,status")
      .in("id", fixtureIds);
    fixtures = (fixtureResponse.data ?? []) as LeagueStatsFixture[];
  }

  const rows: PublicStandingRow[] = (profiles ?? [])
    .map((profile) => {
      const memberPredictions = predictions.filter(
        (prediction) => prediction.member_id === profile.id && prediction.points_awarded !== null,
      );
      const memberAdjustments = adjustments.filter((adjustment) => adjustment.member_id === profile.id);
      return {
        id: profile.id,
        name: profile.display_name,
        played: new Set([
          ...memberPredictions.map((prediction) => prediction.gameweek_id),
          ...memberAdjustments.map((adjustment) => adjustment.gameweek_id),
        ]).size,
        wins: memberPredictions.filter((prediction) => prediction.points_awarded === 3).length,
        oneSided: memberPredictions.filter((prediction) => prediction.points_awarded === 1).length,
        zeroZeroCount: memberPredictions.filter((prediction) => prediction.points_awarded === -1).length,
        points:
          memberPredictions.reduce((sum, prediction) => sum + Number(prediction.points_awarded ?? 0), 0) +
          memberAdjustments.reduce((sum, adjustment) => sum + Number(adjustment.points), 0),
      };
    })
    .sort(
      (a, b) =>
        b.points - a.points ||
        a.zeroZeroCount - b.zeroZeroCount ||
        b.wins - a.wins ||
        a.name.localeCompare(b.name),
    );

  const canonical = calculateLeagueStats({
    standings: rows,
    gameweeks: (gameweeks ?? []).map((gameweek) => ({ id: gameweek.id, number: gameweek.number })),
    predictions,
    adjustments,
    fixtures,
    competitionName: competitionDisplayName,
  });

  const seasonLabel = currentSeason?.label ?? settings?.current_season_label ?? "2026/27";
  const prizePot = rows.length * Number(settings?.entry_fee ?? 0);

  return {
    seasonLabel,
    prizePot,
    gameweekNumber: currentGameweek?.number ?? null,
    rows,
    formGameweeks: canonical.formGameweeks,
    formRows: canonical.formRows,
    leagueGoals: canonical.headline.leagueGoals,
    finishedPicks: canonical.headline.finishedPicks,
    recordedSelections: canonical.headline.recordedSelections,
    seasonFacts: canonical.seasonFacts,
    playerInsights: canonical.playerInsights,
    headline: canonical.headline,
  };
}
