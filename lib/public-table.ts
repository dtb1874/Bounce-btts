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
  mostPickedTeam: string;
  mostPickedTeamCount: number;
  repeatTeamWins: number;
  repeatTeamLosses: number;
  strikeRate: number;
  pointsPerPick: number;
  currentStreak: number;
  bestStreak: number;
  longestWinlessStreak: number;
  averageSelectedOdds: number | null;
  averageWinningOdds: number | null;
  biggestWinningOdds: number | null;
};

export type PublicSeasonFact = {
  label: string;
  value: string;
  detail: string;
  breakdown?: string[];
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
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  odds_fractional: string | null;
};

function fractionalOddsRatio(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return numerator / denominator;
}

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
      .select("id,competition,home_team,away_team,home_score,away_score,odds_fractional")
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

  const gameweekNumberById = new Map((gameweeks ?? []).map((gameweek) => [gameweek.id, gameweek.number]));
  const playerInsights: PublicPlayerInsight[] = rows.map((row) => {
    const memberPredictions = predictions.filter((prediction) => prediction.member_id === row.id);
    const scoredPredictions = memberPredictions
      .filter((prediction) => prediction.points_awarded !== null)
      .sort((a, b) => (gameweekNumberById.get(a.gameweek_id) ?? 0) - (gameweekNumberById.get(b.gameweek_id) ?? 0));
    const scoredPoints = scoredPredictions.reduce((sum, prediction) => sum + Number(prediction.points_awarded ?? 0), 0);
    let bestStreak = 0;
    let runningStreak = 0;
    for (const prediction of scoredPredictions) {
      if (prediction.points_awarded === 3) {
        runningStreak += 1;
        bestStreak = Math.max(bestStreak, runningStreak);
      } else {
        runningStreak = 0;
      }
    }
    let currentStreak = 0;
    for (let index = scoredPredictions.length - 1; index >= 0; index -= 1) {
      if (scoredPredictions[index].points_awarded !== 3) break;
      currentStreak += 1;
    }
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
    const teamCounts = new Map<string, number>();
    memberPredictions.forEach((prediction) => {
      const fixture = fixtureById.get(prediction.fixture_id);
      for (const team of [fixture?.home_team, fixture?.away_team]) {
        const name = team?.trim();
        if (name) teamCounts.set(name, (teamCounts.get(name) ?? 0) + 1);
      }
    });
    const mostPickedTeamCountRaw = teamCounts.size ? Math.max(...teamCounts.values()) : 0;
    const mostPickedTeamNames = mostPickedTeamCountRaw >= 2
      ? [...teamCounts.entries()].filter(([, count]) => count === mostPickedTeamCountRaw).map(([name]) => name).sort((a, b) => a.localeCompare(b))
      : [];
    const mostPickedTeam = mostPickedTeamNames.length ? mostPickedTeamNames.join(", ") : "No repeat team yet";
    const mostPickedTeamCount = mostPickedTeamNames.length ? mostPickedTeamCountRaw : 0;
    const repeatTeamPrimary = mostPickedTeamNames[0] ?? "";
    const repeatTeamFinished = repeatTeamPrimary
      ? memberPredictions.filter((prediction) => {
          if (prediction.points_awarded === null) return false;
          const fixture = fixtureById.get(prediction.fixture_id);
          return fixture?.home_team?.trim() === repeatTeamPrimary || fixture?.away_team?.trim() === repeatTeamPrimary;
        })
      : [];
    const repeatTeamWins = repeatTeamFinished.filter((prediction) => prediction.points_awarded === 3).length;
    const repeatTeamLosses = repeatTeamFinished.length - repeatTeamWins;
    const selectedOdds = memberPredictions
      .map((prediction) => fractionalOddsRatio(fixtureById.get(prediction.fixture_id)?.odds_fractional))
      .filter((value): value is number => value !== null);
    const winningOdds = scoredPredictions
      .filter((prediction) => prediction.points_awarded === 3)
      .map((prediction) => fractionalOddsRatio(fixtureById.get(prediction.fixture_id)?.odds_fractional))
      .filter((value): value is number => value !== null);
    let longestWinlessStreak = 0;
    let runningWinless = 0;
    for (const prediction of scoredPredictions) {
      if (prediction.points_awarded === 3) {
        runningWinless = 0;
      } else {
        runningWinless += 1;
        longestWinlessStreak = Math.max(longestWinlessStreak, runningWinless);
      }
    }
    return {
      id: row.id,
      name: row.name,
      goals,
      averageGoals: completed.length ? goals / completed.length : 0,
      homeWins,
      draws,
      awayWins,
      favouriteCompetition,
      mostPickedTeam,
      mostPickedTeamCount,
      repeatTeamWins,
      repeatTeamLosses,
      strikeRate: scoredPredictions.length ? (scoredPredictions.filter((prediction) => prediction.points_awarded === 3).length / scoredPredictions.length) * 100 : 0,
      pointsPerPick: scoredPredictions.length ? scoredPoints / scoredPredictions.length : 0,
      currentStreak,
      bestStreak,
      longestWinlessStreak,
      averageSelectedOdds: selectedOdds.length ? selectedOdds.reduce((sum, value) => sum + value, 0) / selectedOdds.length : null,
      averageWinningOdds: winningOdds.length ? winningOdds.reduce((sum, value) => sum + value, 0) / winningOdds.length : null,
      biggestWinningOdds: winningOdds.length ? Math.max(...winningOdds) : null,
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
  const jointTop = <T extends { name: string }>(items: T[], score: (item: T) => number | null | undefined) => {
    const scored = items.map((item) => ({ item, score: Number(score(item) ?? 0) })).filter((row) => Number.isFinite(row.score) && row.score > 0);
    if (!scored.length) return { names: [] as string[], score: 0 };
    const top = Math.max(...scored.map((row) => row.score));
    return { names: scored.filter((row) => row.score === top).map((row) => row.item.name).sort((a, b) => a.localeCompare(b)), score: top };
  };
  const jointValueTop = <T extends { name: string }>(items: T[], score: (item: T) => number | null | undefined) => {
    const scored = items.map((item) => ({ item, score: score(item) })).filter((row): row is { item: T; score: number } => row.score !== null && row.score !== undefined && Number.isFinite(row.score));
    if (!scored.length) return { names: [] as string[], score: 0 };
    const rounded = scored.map((row) => ({ ...row, score: Math.round(row.score * 10) / 10 }));
    const top = Math.max(...rounded.map((row) => row.score));
    return { names: rounded.filter((row) => row.score === top).map((row) => row.item.name).sort((a, b) => a.localeCompare(b)), score: top };
  };
  const goalMagnet = jointTop(playerInsights, (item) => item.goals);
  const homeHunter = jointTop(playerInsights, (item) => item.homeWins);
  const awayHunter = jointTop(playerInsights, (item) => item.awayWins);
  const drawMagnet = jointTop(playerInsights, (item) => item.draws);
  const bttsKing = jointTop(rows, (item) => item.wins);
  const biggestOddsWinner = jointTop(playerInsights, (item) => item.biggestWinningOdds);
  const longestBttsStreak = jointTop(playerInsights, (item) => item.bestStreak);
  const longestWinlessRun = jointTop(playerInsights, (item) => item.longestWinlessStreak);
  const valueRows = rows.map((row) => {
    const pricedFinished = predictions
      .filter((prediction) => prediction.member_id === row.id && prediction.points_awarded !== null)
      .map((prediction) => ({ points: prediction.points_awarded, odds: fractionalOddsRatio(fixtureById.get(prediction.fixture_id)?.odds_fractional) }))
      .filter((pick): pick is { points: number; odds: number } => pick.odds !== null);
    const profit = pricedFinished.reduce((sum, pick) => sum + (pick.points === 3 ? pick.odds : -1), 0);
    return { name: row.name, valueRoi: pricedFinished.length >= 5 ? (profit / pricedFinished.length) * 100 : null };
  });
  const valueLeader = jointValueTop(valueRows, (item) => item.valueRoi);
  const fact = (single: string, plural: string, record: { names: string[]; score: number }, detail: (score: number) => string, empty: string): PublicSeasonFact => ({
    label: record.names.length > 1 ? plural : single,
    value: record.names.length ? record.names.join(", ") : "—",
    detail: record.names.length ? detail(record.score) : empty,
  });
  const seasonFacts: PublicSeasonFact[] = [
    fact("GOAL MAGNET", "GOAL MAGNETS", goalMagnet, (score) => `${score} goals in finished picks`, "Waiting for finished picks"),
    fact("BTTS KING", "BTTS KINGS", bttsKing, (score) => `${score} BTTS wins`, "No BTTS wins yet"),
    fact("HOME-WIN HUNTER", "HOME-WIN HUNTERS", homeHunter, (score) => `${score} selected games ended home wins`, "No trend yet"),
    fact("AWAY-WIN HUNTER", "AWAY-WIN HUNTERS", awayHunter, (score) => `${score} selected games ended away wins`, "No trend yet"),
    fact("DRAW MAGNET", "DRAW MAGNETS", drawMagnet, (score) => `${score} selected games ended level`, "No trend yet"),
    fact("BIGGEST ODDS WINNER", "BIGGEST ODDS WINNERS", biggestOddsWinner, (score) => `${score.toFixed(2)}/1 winning BTTS price`, "Waiting for priced winners"),
    fact("LONGEST BTTS STREAK", "LONGEST BTTS STREAKS", longestBttsStreak, (score) => `${score} consecutive BTTS wins`, "No streak yet"),
    fact("LONGEST WINLESS RUN", "LONGEST WINLESS RUNS", longestWinlessRun, (score) => `${score} consecutive non-winning picks`, "No run yet"),
    fact("VALUE LEADER", "VALUE LEADERS", valueLeader, (score) => `${score >= 0 ? "+" : ""}${score.toFixed(1)}% theoretical ROI`, "Qualifies after 5 priced finished picks"),
  ];

  const leagueTeamCounts = new Map<string, number>();
  predictions.forEach((prediction) => {
    const fixture = fixtureById.get(prediction.fixture_id);
    for (const team of [fixture?.home_team, fixture?.away_team]) {
      const name = team?.trim();
      if (name) leagueTeamCounts.set(name, (leagueTeamCounts.get(name) ?? 0) + 1);
    }
  });
  const leagueMostPickedCount = leagueTeamCounts.size ? Math.max(...leagueTeamCounts.values()) : 0;
  const leagueMostPickedTeams = leagueMostPickedCount >= 2
    ? [...leagueTeamCounts.entries()].filter(([, count]) => count === leagueMostPickedCount).map(([name]) => name).sort((a, b) => a.localeCompare(b))
    : [];
  const leagueMostPickedBreakdown = leagueMostPickedTeams.flatMap((team) => {
    const memberCounts = new Map<string, number>();
    predictions.forEach((prediction) => {
      const fixture = fixtureById.get(prediction.fixture_id);
      if (fixture?.home_team?.trim() === team || fixture?.away_team?.trim() === team) {
        memberCounts.set(prediction.member_id, (memberCounts.get(prediction.member_id) ?? 0) + 1);
      }
    });
    return [...memberCounts.entries()]
      .sort((a, b) => b[1] - a[1] || String((profiles ?? []).find((profile) => profile.id === a[0])?.display_name ?? "").localeCompare(String((profiles ?? []).find((profile) => profile.id === b[0])?.display_name ?? "")))
      .map(([memberId, count]) => {
        const name = (profiles ?? []).find((profile) => profile.id === memberId)?.display_name ?? "Member";
        return `${team} · ${name} · ${count} pick${count === 1 ? "" : "s"}`;
      });
  });
  seasonFacts.push({
    label: leagueMostPickedTeams.length > 1 ? "MOST PICKED TEAMS" : "MOST PICKED TEAM",
    value: leagueMostPickedTeams.length ? leagueMostPickedTeams.join(", ") : "No repeat team yet",
    detail: leagueMostPickedTeams.length ? `${leagueMostPickedCount} league selections` : "A team must appear in at least 2 selections",
    breakdown: leagueMostPickedBreakdown,
  });


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
