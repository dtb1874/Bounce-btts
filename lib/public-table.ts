import { createAdminClient } from "@/lib/supabase/admin";
import { applyMissedPickPenalties } from "@/lib/missed-picks";

export type PublicStandingRow = {
  id: string;
  name: string;
  played: number;
  wins: number;
  oneSided: number;
  zeroZeroCount: number;
  points: number;
};

export type PublicFormRow = {
  id: string;
  name: string;
  values: Array<number | null>;
  total: number;
};

export type PublicPlayerInsight = {
  id: string;
  name: string;
  goals: number;
  averageGoals: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  favouriteCompetition: string;
};

export type PublicSeasonFact = {
  label: string;
  value: string;
  detail: string;
};

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
};

type PublicPrediction = {
  gameweek_id: string;
  member_id: string;
  fixture_id: string;
  points_awarded: number | null;
};

type PublicAdjustment = {
  gameweek_id: string;
  member_id: string;
  points: number;
};

type PublicFixture = {
  id: string;
  competition: string | null;
  home_score: number | null;
  away_score: number | null;
};

export async function loadPublicTableData(): Promise<PublicTableData> {
  const admin = createAdminClient();
  await applyMissedPickPenalties(admin).catch(() => 0);
  const { data: settings } = await admin
    .from("league_settings")
    .select("current_season_label,entry_fee")
    .eq("id", true)
    .maybeSingle();

  const { data: currentSeason } = await admin
    .from("seasons")
    .select("id,label")
    .eq("is_current", true)
    .maybeSingle();

  const { data: gameweeks } = currentSeason?.id
    ? await admin.from("gameweeks").select("id,number,opens_at,locks_at,status").eq("season_id", currentSeason.id).order("number")
    : { data: [] };
  const gameweekIds = (gameweeks ?? []).map((item) => item.id);
  const nowIso = new Date().toISOString();
  const currentGameweek =
    (gameweeks ?? []).filter((item) => !item.opens_at || item.opens_at <= nowIso).sort((a, b) => b.number - a.number)[0] ??
    null;

  const { data: profiles } = await admin
    .from("profiles")
    .select("id,display_name,role,active")
    .eq("approved", true)
    .eq("active", true)
    .neq("role", "guest");

  let predictions: PublicPrediction[] = [];
  let adjustments: PublicAdjustment[] = [];
  if (gameweekIds.length) {
    const [predictionResponse, adjustmentResponse] = await Promise.all([
      admin
        .from("predictions")
        .select("gameweek_id,member_id,fixture_id,points_awarded")
        .in("gameweek_id", gameweekIds),
      admin
        .from("score_adjustments")
        .select("gameweek_id,member_id,points")
        .in("gameweek_id", gameweekIds),
    ]);
    predictions = (predictionResponse.data ?? []) as PublicPrediction[];
    adjustments = (adjustmentResponse.data ?? []) as PublicAdjustment[];
  }

  const fixtureIds = Array.from(new Set(predictions.map((prediction) => prediction.fixture_id)));
  let fixtures: PublicFixture[] = [];
  if (fixtureIds.length) {
    const fixtureResponse = await admin
      .from("fixtures")
      .select("id,competition,home_score,away_score")
      .in("id", fixtureIds);
    fixtures = (fixtureResponse.data ?? []) as PublicFixture[];
  }
  const fixtureById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));

  const rows = (profiles ?? [])
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
          memberPredictions.reduce(
            (sum, prediction) => sum + Number(prediction.points_awarded ?? 0),
            0,
          ) + memberAdjustments.reduce((sum, adjustment) => sum + Number(adjustment.points), 0),
      };
    })
    .sort(
      (a, b) =>
        b.points - a.points ||
        a.zeroZeroCount - b.zeroZeroCount ||
        b.wins - a.wins ||
        a.name.localeCompare(b.name),
    );

  const scoredGameweekIds = new Set([
    ...predictions.filter((prediction) => prediction.points_awarded !== null).map((prediction) => prediction.gameweek_id),
    ...adjustments.map((adjustment) => adjustment.gameweek_id),
  ]);
  const recentGameweeks = (gameweeks ?? [])
    .filter((gameweek) => scoredGameweekIds.has(gameweek.id))
    .sort((a, b) => b.number - a.number)
    .slice(0, 6)
    .reverse();

  const formRows: PublicFormRow[] = rows
    .map((row) => {
      const values = recentGameweeks.map((gameweek) => {
        const predictionPoints = predictions
          .filter((prediction) => prediction.member_id === row.id && prediction.gameweek_id === gameweek.id && prediction.points_awarded !== null)
          .reduce((sum, prediction) => sum + Number(prediction.points_awarded ?? 0), 0);
        const adjustmentPoints = adjustments
          .filter((adjustment) => adjustment.member_id === row.id && adjustment.gameweek_id === gameweek.id)
          .reduce((sum, adjustment) => sum + Number(adjustment.points), 0);
        const hasEntry = predictions.some((prediction) => prediction.member_id === row.id && prediction.gameweek_id === gameweek.id && prediction.points_awarded !== null) ||
          adjustments.some((adjustment) => adjustment.member_id === row.id && adjustment.gameweek_id === gameweek.id);
        return hasEntry ? predictionPoints + adjustmentPoints : null;
      });
      return { id: row.id, name: row.name, values, total: values.reduce<number>((sum, value) => sum + Number(value ?? 0), 0) };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  const playerInsights: PublicPlayerInsight[] = rows.map((row) => {
    const memberPredictions = predictions.filter((prediction) => prediction.member_id === row.id);
    const completed = memberPredictions
      .map((prediction) => ({ prediction, fixture: fixtureById.get(prediction.fixture_id) }))
      .filter((item): item is { prediction: PublicPrediction; fixture: PublicFixture } =>
        Boolean(item.fixture && item.fixture.home_score !== null && item.fixture.away_score !== null),
      );
    const goals = completed.reduce(
      (sum, item) => sum + Number(item.fixture.home_score ?? 0) + Number(item.fixture.away_score ?? 0),
      0,
    );
    const homeWins = completed.filter((item) => Number(item.fixture.home_score) > Number(item.fixture.away_score)).length;
    const awayWins = completed.filter((item) => Number(item.fixture.away_score) > Number(item.fixture.home_score)).length;
    const draws = completed.filter((item) => Number(item.fixture.home_score) === Number(item.fixture.away_score)).length;
    const competitions = new Map<string, number>();
    memberPredictions.forEach((prediction) => {
      const competition = fixtureById.get(prediction.fixture_id)?.competition?.trim() || "Other";
      competitions.set(competition, (competitions.get(competition) ?? 0) + 1);
    });
    const favouriteCompetition = [...competitions.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "—";
    return {
      id: row.id,
      name: row.name,
      goals,
      averageGoals: completed.length ? goals / completed.length : 0,
      homeWins,
      draws,
      awayWins,
      favouriteCompetition,
    };
  });

  const completedSelected = predictions
    .map((prediction) => ({ prediction, fixture: fixtureById.get(prediction.fixture_id) }))
    .filter((item): item is { prediction: PublicPrediction; fixture: PublicFixture } =>
      Boolean(item.fixture && item.fixture.home_score !== null && item.fixture.away_score !== null),
    );
  const leagueGoals = completedSelected.reduce(
    (sum, item) => sum + Number(item.fixture.home_score ?? 0) + Number(item.fixture.away_score ?? 0),
    0,
  );
  const goalMagnet = [...playerInsights].sort((a, b) => b.goals - a.goals)[0];
  const homeHunter = [...playerInsights].sort((a, b) => b.homeWins - a.homeWins)[0];
  const awayHunter = [...playerInsights].sort((a, b) => b.awayWins - a.awayWins)[0];
  const drawMagnet = [...playerInsights].sort((a, b) => b.draws - a.draws)[0];
  const bttsKing = [...rows].sort((a, b) => b.wins - a.wins || b.points - a.points)[0];
  const seasonFacts: PublicSeasonFact[] = [
    { label: "GOAL MAGNET", value: goalMagnet?.goals ? goalMagnet.name : "—", detail: goalMagnet?.goals ? `${goalMagnet.goals} goals in finished picks` : "Waiting for finished picks" },
    { label: "BTTS KING", value: bttsKing?.wins ? bttsKing.name : "—", detail: bttsKing?.wins ? `${bttsKing.wins} BTTS wins` : "No BTTS wins yet" },
    { label: "HOME-WIN HUNTER", value: homeHunter?.homeWins ? homeHunter.name : "—", detail: homeHunter?.homeWins ? `${homeHunter.homeWins} selected games ended home wins` : "No trend yet" },
    { label: "AWAY-WIN HUNTER", value: awayHunter?.awayWins ? awayHunter.name : "—", detail: awayHunter?.awayWins ? `${awayHunter.awayWins} selected games ended away wins` : "No trend yet" },
    { label: "DRAW MAGNET", value: drawMagnet?.draws ? drawMagnet.name : "—", detail: drawMagnet?.draws ? `${drawMagnet.draws} selected games ended level` : "No trend yet" },
  ];

  const namedProfiles = (profiles ?? []).filter((profile) => !/^user\d+$/i.test(profile.display_name.trim()));

  return {
    seasonLabel: currentSeason?.label ?? settings?.current_season_label ?? "2026/27",
    prizePot: namedProfiles.length * Number(settings?.entry_fee ?? 20),
    gameweekNumber: currentGameweek?.number ?? null,
    rows,
    formGameweeks: recentGameweeks.map((gameweek) => gameweek.number),
    formRows,
    leagueGoals,
    finishedPicks: completedSelected.length,
    recordedSelections: predictions.length,
    seasonFacts,
    playerInsights,
  };
}
