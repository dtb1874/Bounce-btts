"use client";

import { useState } from "react";
import ShareTableButton from "./ShareTableButton";
import { calculateLeagueStats, type LeagueStatsAdjustment, type LeagueStatsFixture, type LeagueStatsPrediction, type LeagueStatsStanding } from "@/lib/league-stats";
import { competitionDisplayName } from "@/lib/competition-display";
import styles from "./release.module.css";
import publicStyles from "./PublicLeagueTable.module.css";

type Gameweek = { id: string; number: number };

type Props = {
  standings: LeagueStatsStanding[];
  seasonLabel: string;
  gameweek: { number: number } | null;
  entryFee: number;
  fixtures: LeagueStatsFixture[];
  predictions: LeagueStatsPrediction[];
  gameweeks: Gameweek[];
  adjustments: LeagueStatsAdjustment[];
};

export default function CanonicalLeagueTable({ standings, seasonLabel, gameweek, entryFee, fixtures, predictions, gameweeks, adjustments }: Props) {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const prizePot = standings.length * entryFee;
  const canonical = calculateLeagueStats({
    standings,
    gameweeks,
    predictions,
    adjustments,
    fixtures,
    competitionName: competitionDisplayName,
  });
  const { headline, seasonFacts, playerInsights } = canonical;

  return <section className={styles.leaguePage} onClick={() => setExpandedPlayer(null)}>
    <div className={styles.heading}>
      <div>
        <span>SEASON {seasonLabel} · {gameweek ? `GAMEWEEK ${gameweek.number}` : ""} · EST 2024</span>
        <h2>League Table</h2>
        <p>S-N = score–nil +1. Ties: fewest 0–0 results, most BTTS wins, then alphabetical.</p>
      </div>
      <span className={styles.shareInline}><ShareTableButton rows={standings} seasonLabel={seasonLabel} gameweekNumber={gameweek?.number ?? null} prizePot={prizePot}/></span>
    </div>

    <div className={`${styles.panel} ${styles.table} ${styles.fullLeagueTable} ${styles.enhancedTableShell} ${styles.leagueTableFirst}`}>
      <div className={`${styles.tableRow} ${styles.header}`}><span>POS</span><span>PLAYER</span><span>P</span><span>W</span><span>S-N</span><span>0-0</span><span>PTS</span></div>
      {standings.map((row, index) => <div key={row.id} className={`${styles.tableRow} ${index === 0 ? styles.leader : ""} ${index < 3 ? styles.tableRowTopThree : ""}`}><span className={styles.positionCell}>{index === 0 ? "🏆" : index + 1}</span><strong>{row.name}</strong><span>{row.played}</span><span>{row.wins}</span><span>{row.oneSided}</span><span>{row.zeroZeroCount}</span><b>{row.points}</b></div>)}
    </div>

    <section className={`${publicStyles.publicPanel} ${publicStyles.statPanel}`}>
      <div className={publicStyles.sectionHeading}><div><span>SEASON SNAPSHOT</span><h3>League Stats</h3></div></div>
      <div className={publicStyles.statCluster}>
        <div className={publicStyles.statItem}><span>LEAGUE LEADER</span><strong>{headline.leagueLeader?.name ?? "—"}</strong><small>{headline.leagueLeader ? `${headline.leagueLeader.points} pts` : "No scores yet"}</small></div>
        <div className={publicStyles.statItem}><span>SEASON POT</span><strong>£{prizePot.toFixed(0)}</strong><small>{standings.length} active players</small></div>
        <div className={publicStyles.statItem}><span>LEAGUE STRIKE RATE</span><strong>{headline.leagueStrikeRate == null ? "—" : `${headline.leagueStrikeRate.toFixed(1)}%`}</strong><small>{headline.bttsWins} BTTS wins</small></div>
        <div className={publicStyles.statItem}><span>{headline.formLeaderNames.length > 1 ? "FORM LEADERS" : "FORM LEADER"}</span><strong className={headline.formLeaderNames.length > 1 ? "jointStatValue" : undefined}>{headline.formLeaderNames.length ? headline.formLeaderNames.join(", ") : "—"}</strong><small>{headline.formLeaderNames.length ? `${headline.topFormPoints} pts across current form` : "Waiting for scored weeks"}</small></div>
        <div className={publicStyles.statItem}><span>{headline.bttsLeaderNames.length > 1 ? "BTTS LEADERS" : "BTTS LEADER"}</span><strong className={headline.bttsLeaderNames.length > 1 ? "jointStatValue" : undefined}>{headline.bttsLeaderNames.length ? headline.bttsLeaderNames.join(", ") : "—"}</strong><small>{headline.bttsLeaderNames.length ? `${headline.topBttsWins} BTTS wins` : "No BTTS wins yet"}</small></div>
        <div className={publicStyles.statItem}><span>CREATURE OF HABIT</span><strong className={headline.creatureLeaders.length > 1 ? "jointStatValue" : undefined}>{headline.creatureLeaders.length ? headline.creatureLeaders.map((row) => `${row.name} — ${row.team}, ${row.count} picks`).join(" / ") : "—"}</strong><small>{headline.creatureLeaders.length ? `${headline.creatureLeaders.map((row) => `${row.wins}W · ${row.losses}L`).join(" / ")} · Most repeat selections of the same team` : "Most repeat selections of the same team"}</small></div>
        <div className={publicStyles.statItem}><span>GOALS IN PICKS</span><strong>{headline.leagueGoals}</strong><small>Finished selected fixtures</small></div>
        <div className={publicStyles.statItem}><span>FINISHED PICKS</span><strong>{headline.finishedPicks}</strong><small>{headline.recordedSelections} selections recorded</small></div>
      </div>
      <details className="leagueMoreStats">
        <summary>More league stats <span className="leagueMoreStatsChevron" aria-hidden="true">⌄</span></summary>
        <div className={publicStyles.statCluster}>{seasonFacts.map((fact) => <div className={publicStyles.statItem} key={fact.label}><span>{fact.label}</span><strong className={fact.value.includes(", ") ? "jointStatValue" : undefined}>{fact.value}</strong><small>{fact.detail}</small>{fact.label.startsWith("MOST PICKED TEAM") && fact.breakdown?.length ? <details className="leagueStatBreakdown" onClick={(event) => event.stopPropagation()}><summary>View pick breakdown</summary><div>{fact.breakdown.map((line) => <small key={line}>{line}</small>)}</div></details> : null}</div>)}</div>
      </details>
    </section>

    <section className={publicStyles.publicPanel}>
      <div className={publicStyles.sectionHeading}><div><span>SEASON SELECTION PROFILE</span><h3>Player Stats</h3></div></div>
      <p style={{ margin: "-4px 0 10px", fontSize: "11px", color: "#8f8a86", letterSpacing: ".02em" }}>Tap a player to expand stats</p>
      <div className={publicStyles.playerList}>{playerInsights.map((row) => {
        const open = expandedPlayer === row.id;
        return <article className={`${publicStyles.playerCard} ${open ? publicStyles.playerCardOpen : ""}`} key={row.id} onClick={(event) => event.stopPropagation()}>
          <button type="button" className={publicStyles.playerSummary} aria-expanded={open} onClick={() => setExpandedPlayer(open ? null : row.id)}><strong>{row.name}</strong><span>{standings.find((standing) => standing.id === row.id)?.points ?? 0} pts</span><b>{open ? "−" : "+"}</b></button>
          {open && <div className={publicStyles.playerDetails}>
            <div className="playerStatHeadline"><span>STRIKE RATE</span><b>{row.strikeRate.toFixed(1)}%</b></div><div className="playerStatHeadline"><span>POINTS / PICK</span><b>{row.pointsPerPick.toFixed(2)}</b></div><div className="playerStatHeadline"><span>CURRENT BTTS STREAK</span><b>{row.currentStreak}</b></div><div className="playerStatHeadline"><span>BEST BTTS STREAK</span><b>{row.bestStreak}</b></div><div><span>AVG SELECTED ODDS</span><b>{row.averageSelectedOdds == null ? "—" : `${row.averageSelectedOdds.toFixed(2)}/1`}</b></div><div><span>AVG WINNING ODDS</span><b>{row.averageWinningOdds == null ? "—" : `${row.averageWinningOdds.toFixed(2)}/1`}</b></div><div><span>BIGGEST WINNING ODDS</span><b>{row.biggestWinningOdds == null ? "—" : `${row.biggestWinningOdds.toFixed(2)}/1`}</b></div><div><span>LONGEST WINLESS RUN</span><b>{row.longestWinlessStreak}</b></div><div><span>TOTAL GOALS</span><b>{row.goals}</b></div><div><span>AVG GOALS / PICK</span><b>{row.averageGoals ? row.averageGoals.toFixed(1) : "—"}</b></div><div><span>RESULT SPLIT</span><b>{row.homeWins}H · {row.draws}D · {row.awayWins}A</b></div><div className={publicStyles.playerCompetition}><span>MOST PICKED COMPETITION</span><b>{row.favouriteCompetition}</b></div><div className={publicStyles.playerCompetition}><span>MOST PICKED TEAM</span><b>{row.mostPickedTeamCount >= 2 ? `${row.mostPickedTeam} · ${row.mostPickedTeamCount} picks` : row.mostPickedTeam}</b></div>
          </div>}
        </article>;
      })}</div>
    </section>
  </section>;
}
