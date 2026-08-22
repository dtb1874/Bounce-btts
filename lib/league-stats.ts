export type LeagueStatsStanding = {
  id: string;
  name: string;
  played: number;
  wins: number;
  oneSided: number;
  zeroZeroCount: number;
  points: number;
};

export type LeagueStatsGameweek = { id: string; number: number };
export type LeagueStatsPrediction = {
  gameweek_id: string;
  member_id: string;
  fixture_id: string;
  points_awarded: number | null;
  created_at?: string;
};
export type LeagueStatsAdjustment = { gameweek_id: string; member_id: string; points: number };
export type LeagueStatsFixture = {
  id: string;
  competition?: string | null;
  country?: string | null;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  odds_fractional?: string | null;
  status?: string | null;
};

export type LeagueStatsFormRow = {
  id: string;
  name: string;
  values: Array<number | null>;
  total: number;
};

export type LeagueStatsPlayerInsight = {
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

export type LeagueStatsFact = {
  label: string;
  value: string;
  detail: string;
  breakdown?: string[];
};

export type LeagueStatsHeadline = {
  leagueLeader: { name: string; points: number } | null;
  leagueStrikeRate: number | null;
  bttsWins: number;
  formLeaderNames: string[];
  topFormPoints: number;
  bttsLeaderNames: string[];
  topBttsWins: number;
  creatureLeaders: Array<{ name: string; team: string; count: number; wins: number; losses: number }>;
  leagueGoals: number;
  finishedPicks: number;
  recordedSelections: number;
};

export type CanonicalLeagueStats = {
  formGameweeks: number[];
  formRows: LeagueStatsFormRow[];
  playerInsights: LeagueStatsPlayerInsight[];
  seasonFacts: LeagueStatsFact[];
  headline: LeagueStatsHeadline;
};

const FINISHED = new Set(["FT", "AET", "PEN"]);

function oddsRatio(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0
    ? numerator / denominator
    : null;
}

function fixtureFinished(fixture: LeagueStatsFixture) {
  if (fixture.home_score == null || fixture.away_score == null) return false;
  return fixture.status ? FINISHED.has(fixture.status) : true;
}

function jointRecord<T extends { name: string }>(items: T[], score: (item: T) => number | null | undefined) {
  const scored = items
    .map((item) => ({ item, score: Number(score(item) ?? 0) }))
    .filter((row) => Number.isFinite(row.score) && row.score > 0);
  if (!scored.length) return { names: [] as string[], score: 0 };
  const top = Math.max(...scored.map((row) => row.score));
  return {
    names: scored.filter((row) => row.score === top).map((row) => row.item.name).sort((a, b) => a.localeCompare(b)),
    score: top,
  };
}

function jointValueRecord<T extends { name: string }>(items: T[], score: (item: T) => number | null | undefined) {
  const scored = items
    .map((item) => ({ item, score: score(item) }))
    .filter((row): row is { item: T; score: number } => row.score != null && Number.isFinite(row.score));
  if (!scored.length) return { names: [] as string[], score: 0 };
  const rounded = scored.map((row) => ({ ...row, score: Math.round(row.score * 10) / 10 }));
  const top = Math.max(...rounded.map((row) => row.score));
  return {
    names: rounded.filter((row) => row.score === top).map((row) => row.item.name).sort((a, b) => a.localeCompare(b)),
    score: top,
  };
}

function fact(
  single: string,
  plural: string,
  record: { names: string[]; score: number },
  detail: (score: number) => string,
  empty: string,
): LeagueStatsFact {
  return {
    label: record.names.length > 1 ? plural : single,
    value: record.names.length ? record.names.join(", ") : "—",
    detail: record.names.length ? detail(record.score) : empty,
  };
}

export function calculateLeagueStats({
  standings,
  gameweeks,
  predictions,
  adjustments,
  fixtures,
  competitionName,
}: {
  standings: LeagueStatsStanding[];
  gameweeks: LeagueStatsGameweek[];
  predictions: LeagueStatsPrediction[];
  adjustments: LeagueStatsAdjustment[];
  fixtures: LeagueStatsFixture[];
  competitionName?: (fixture: LeagueStatsFixture) => string;
}): CanonicalLeagueStats {
  const fixtureById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  const gameweekNumberById = new Map(gameweeks.map((gameweek) => [gameweek.id, gameweek.number]));

  const scoredGameweekIds = new Set([
    ...predictions.filter((prediction) => prediction.points_awarded !== null).map((prediction) => prediction.gameweek_id),
    ...adjustments.map((adjustment) => adjustment.gameweek_id),
  ]);
  const recentGameweeks = [...gameweeks]
    .filter((gameweek) => scoredGameweekIds.has(gameweek.id))
    .sort((a, b) => b.number - a.number)
    .slice(0, 6)
    .reverse();

  const formRows: LeagueStatsFormRow[] = standings
    .map((standing) => {
      const values = recentGameweeks.map((gameweek) => {
        const matchingPredictions = predictions.filter(
          (prediction) =>
            prediction.member_id === standing.id &&
            prediction.gameweek_id === gameweek.id &&
            prediction.points_awarded !== null,
        );
        const matchingAdjustments = adjustments.filter(
          (adjustment) => adjustment.member_id === standing.id && adjustment.gameweek_id === gameweek.id,
        );
        if (!matchingPredictions.length && !matchingAdjustments.length) return null;
        return (
          matchingPredictions.reduce((sum, prediction) => sum + Number(prediction.points_awarded ?? 0), 0) +
          matchingAdjustments.reduce((sum, adjustment) => sum + Number(adjustment.points), 0)
        );
      });
      return {
        id: standing.id,
        name: standing.name,
        values,
        total: values.reduce<number>((sum, value) => sum + Number(value ?? 0), 0),
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  const playerInsights: LeagueStatsPlayerInsight[] = standings.map((standing) => {
    const selected = predictions.filter((prediction) => prediction.member_id === standing.id);
    const scored = selected
      .filter((prediction) => prediction.points_awarded !== null)
      .sort((a, b) => {
        const gameweekOrder = (gameweekNumberById.get(a.gameweek_id) ?? 0) - (gameweekNumberById.get(b.gameweek_id) ?? 0);
        return gameweekOrder || String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
      });
    const completed = selected
      .map((prediction) => ({ prediction, fixture: fixtureById.get(prediction.fixture_id) }))
      .filter((row): row is { prediction: LeagueStatsPrediction; fixture: LeagueStatsFixture } => Boolean(row.fixture && fixtureFinished(row.fixture)));

    let bestStreak = 0;
    let runningStreak = 0;
    let longestWinlessStreak = 0;
    let runningWinless = 0;
    for (const prediction of scored) {
      if (prediction.points_awarded === 3) {
        runningStreak += 1;
        bestStreak = Math.max(bestStreak, runningStreak);
        runningWinless = 0;
      } else {
        runningStreak = 0;
        runningWinless += 1;
        longestWinlessStreak = Math.max(longestWinlessStreak, runningWinless);
      }
    }
    let currentStreak = 0;
    for (let index = scored.length - 1; index >= 0; index -= 1) {
      if (scored[index].points_awarded !== 3) break;
      currentStreak += 1;
    }

    const goals = completed.reduce(
      (sum, row) => sum + Number(row.fixture.home_score ?? 0) + Number(row.fixture.away_score ?? 0),
      0,
    );
    const homeWins = completed.filter((row) => Number(row.fixture.home_score) > Number(row.fixture.away_score)).length;
    const awayWins = completed.filter((row) => Number(row.fixture.away_score) > Number(row.fixture.home_score)).length;
    const draws = completed.filter((row) => Number(row.fixture.home_score) === Number(row.fixture.away_score)).length;

    const competitionCounts = new Map<string, number>();
    const teamCounts = new Map<string, number>();
    for (const prediction of selected) {
      const fixture = fixtureById.get(prediction.fixture_id);
      if (!fixture) continue;
      const competition = competitionName?.(fixture) ?? fixture.competition?.trim() ?? "Other";
      competitionCounts.set(competition, (competitionCounts.get(competition) ?? 0) + 1);
      for (const rawTeam of [fixture.home_team, fixture.away_team]) {
        const team = rawTeam?.trim();
        if (team) teamCounts.set(team, (teamCounts.get(team) ?? 0) + 1);
      }
    }
    const favouriteCompetition = [...competitionCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "—";
    const mostPickedTeamCountRaw = teamCounts.size ? Math.max(...teamCounts.values()) : 0;
    const mostPickedTeamNames = mostPickedTeamCountRaw >= 2
      ? [...teamCounts.entries()]
          .filter(([, count]) => count === mostPickedTeamCountRaw)
          .map(([name]) => name)
          .sort((a, b) => a.localeCompare(b))
      : [];
    const repeatTeamPrimary = mostPickedTeamNames[0] ?? "";
    const repeatTeamFinished = repeatTeamPrimary
      ? scored.filter((prediction) => {
          const fixture = fixtureById.get(prediction.fixture_id);
          return fixture?.home_team?.trim() === repeatTeamPrimary || fixture?.away_team?.trim() === repeatTeamPrimary;
        })
      : [];

    const selectedOdds = selected
      .map((prediction) => oddsRatio(fixtureById.get(prediction.fixture_id)?.odds_fractional))
      .filter((value): value is number => value !== null);
    const winningOdds = scored
      .filter((prediction) => prediction.points_awarded === 3)
      .map((prediction) => oddsRatio(fixtureById.get(prediction.fixture_id)?.odds_fractional))
      .filter((value): value is number => value !== null);
    const scoredPoints = scored.reduce((sum, prediction) => sum + Number(prediction.points_awarded ?? 0), 0);

    return {
      id: standing.id,
      name: standing.name,
      goals,
      averageGoals: completed.length ? goals / completed.length : 0,
      homeWins,
      draws,
      awayWins,
      favouriteCompetition,
      mostPickedTeam: mostPickedTeamNames.length ? mostPickedTeamNames.join(", ") : "No repeat team yet",
      mostPickedTeamCount: mostPickedTeamNames.length ? mostPickedTeamCountRaw : 0,
      repeatTeamWins: repeatTeamFinished.filter((prediction) => prediction.points_awarded === 3).length,
      repeatTeamLosses: repeatTeamFinished.filter((prediction) => prediction.points_awarded !== 3).length,
      strikeRate: scored.length ? (scored.filter((prediction) => prediction.points_awarded === 3).length / scored.length) * 100 : 0,
      pointsPerPick: scored.length ? scoredPoints / scored.length : 0,
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
    .filter((row): row is { prediction: LeagueStatsPrediction; fixture: LeagueStatsFixture } => Boolean(row.fixture && fixtureFinished(row.fixture)));
  const leagueGoals = completedSelected.reduce(
    (sum, row) => sum + Number(row.fixture.home_score ?? 0) + Number(row.fixture.away_score ?? 0),
    0,
  );
  const scoredPredictions = predictions.filter((prediction) => prediction.points_awarded !== null);
  const bttsWins = scoredPredictions.filter((prediction) => prediction.points_awarded === 3).length;

  const topFormPoints = formRows.length ? Math.max(...formRows.map((row) => row.total)) : 0;
  const formLeaderNames = topFormPoints > 0
    ? formRows.filter((row) => row.total === topFormPoints).map((row) => row.name).sort((a, b) => a.localeCompare(b))
    : [];
  const topBttsWins = standings.length ? Math.max(...standings.map((row) => row.wins)) : 0;
  const bttsLeaderNames = topBttsWins > 0
    ? standings.filter((row) => row.wins === topBttsWins).map((row) => row.name).sort((a, b) => a.localeCompare(b))
    : [];
  const creatureCandidates = playerInsights
    .filter((row) => row.mostPickedTeamCount >= 2)
    .map((row) => ({
      name: row.name,
      team: row.mostPickedTeam.split(", ")[0] ?? row.mostPickedTeam,
      count: row.mostPickedTeamCount,
      wins: row.repeatTeamWins,
      losses: row.repeatTeamLosses,
    }));
  const creatureTop = creatureCandidates.length ? Math.max(...creatureCandidates.map((row) => row.count)) : 0;
  const creatureLeaders = creatureCandidates
    .filter((row) => row.count === creatureTop)
    .sort((a, b) => a.name.localeCompare(b.name));

  const goalKing = jointRecord(playerInsights, (row) => row.goals);
  const homeHunter = jointRecord(playerInsights, (row) => row.homeWins);
  const awayHunter = jointRecord(playerInsights, (row) => row.awayWins);
  const drawMagnet = jointRecord(playerInsights, (row) => row.draws);
  const bttsKings = jointRecord(standings, (row) => row.wins);
  const biggestOddsWinners = jointRecord(playerInsights, (row) => row.biggestWinningOdds);
  const longestBttsStreaks = jointRecord(playerInsights, (row) => row.bestStreak);
  const longestWinlessRuns = jointRecord(playerInsights, (row) => row.longestWinlessStreak);

  const valueRows = standings.map((standing) => {
    const pricedFinished = predictions
      .filter((prediction) => prediction.member_id === standing.id && prediction.points_awarded !== null)
      .map((prediction) => ({ points: prediction.points_awarded as number, odds: oddsRatio(fixtureById.get(prediction.fixture_id)?.odds_fractional) }))
      .filter((pick): pick is { points: number; odds: number } => pick.odds !== null);
    const profit = pricedFinished.reduce((sum, pick) => sum + (pick.points === 3 ? pick.odds : -1), 0);
    return { name: standing.name, valueRoi: pricedFinished.length >= 5 ? (profit / pricedFinished.length) * 100 : null };
  });
  const valueLeaders = jointValueRecord(valueRows, (row) => row.valueRoi);

  const seasonFacts: LeagueStatsFact[] = [
    fact("GOAL MAGNET", "GOAL MAGNETS", goalKing, (score) => `${score} goals in finished picks`, "Waiting for finished picks"),
    fact("BTTS KING", "BTTS KINGS", bttsKings, (score) => `${score} BTTS wins`, "No BTTS wins yet"),
    fact("HOME-WIN HUNTER", "HOME-WIN HUNTERS", homeHunter, (score) => `${score} selected matches ended home wins`, "No trend yet"),
    fact("AWAY-WIN HUNTER", "AWAY-WIN HUNTERS", awayHunter, (score) => `${score} selected matches ended away wins`, "No trend yet"),
    fact("DRAW MAGNET", "DRAW MAGNETS", drawMagnet, (score) => `${score} selected matches ended level`, "No trend yet"),
    fact("BIGGEST ODDS WINNER", "BIGGEST ODDS WINNERS", biggestOddsWinners, (score) => `${score.toFixed(2)}/1 winning BTTS price`, "Waiting for priced winners"),
    fact("LONGEST BTTS STREAK", "LONGEST BTTS STREAKS", longestBttsStreaks, (score) => `${score} consecutive BTTS wins`, "No streak yet"),
    fact("LONGEST WINLESS RUN", "LONGEST WINLESS RUNS", longestWinlessRuns, (score) => `${score} consecutive non-winning picks`, "No run yet"),
    fact("VALUE LEADER", "VALUE LEADERS", valueLeaders, (score) => `${score >= 0 ? "+" : ""}${score.toFixed(1)}% theoretical ROI`, "Qualifies after 5 priced finished picks"),
  ];

  const leaguePickedTeamCounts = new Map<string, number>();
  for (const prediction of predictions) {
    const fixture = fixtureById.get(prediction.fixture_id);
    if (!fixture) continue;
    for (const rawTeam of [fixture.home_team, fixture.away_team]) {
      const team = rawTeam?.trim();
      if (team) leaguePickedTeamCounts.set(team, (leaguePickedTeamCounts.get(team) ?? 0) + 1);
    }
  }
  const leaguePickedTeamTop = leaguePickedTeamCounts.size ? Math.max(...leaguePickedTeamCounts.values()) : 0;
  const leaguePickedTeamNames = leaguePickedTeamTop >= 2
    ? [...leaguePickedTeamCounts.entries()]
        .filter(([, count]) => count === leaguePickedTeamTop)
        .map(([name]) => name)
        .sort((a, b) => a.localeCompare(b))
    : [];
  const breakdown = leaguePickedTeamNames.flatMap((team) => {
    const memberCounts = new Map<string, number>();
    for (const prediction of predictions) {
      const fixture = fixtureById.get(prediction.fixture_id);
      if (fixture?.home_team?.trim() === team || fixture?.away_team?.trim() === team) {
        memberCounts.set(prediction.member_id, (memberCounts.get(prediction.member_id) ?? 0) + 1);
      }
    }
    return [...memberCounts.entries()]
      .sort((a, b) => b[1] - a[1] || (standings.find((row) => row.id === a[0])?.name ?? "").localeCompare(standings.find((row) => row.id === b[0])?.name ?? ""))
      .map(([memberId, count]) => `${team} · ${standings.find((row) => row.id === memberId)?.name ?? "Member"} · ${count} pick${count === 1 ? "" : "s"}`);
  });
  seasonFacts.push({
    label: leaguePickedTeamNames.length > 1 ? "MOST PICKED TEAMS" : "MOST PICKED TEAM",
    value: leaguePickedTeamNames.length ? leaguePickedTeamNames.join(", ") : "No repeat team yet",
    detail: leaguePickedTeamNames.length ? `${leaguePickedTeamTop} league selections` : "A team must appear in at least 2 selections",
    breakdown,
  });

  return {
    formGameweeks: recentGameweeks.map((gameweek) => gameweek.number),
    formRows,
    playerInsights,
    seasonFacts,
    headline: {
      leagueLeader: standings[0] ? { name: standings[0].name, points: standings[0].points } : null,
      leagueStrikeRate: scoredPredictions.length ? (bttsWins / scoredPredictions.length) * 100 : null,
      bttsWins,
      formLeaderNames,
      topFormPoints,
      bttsLeaderNames,
      topBttsWins,
      creatureLeaders,
      leagueGoals,
      finishedPicks: completedSelected.length,
      recordedSelections: predictions.length,
    },
  };
}
