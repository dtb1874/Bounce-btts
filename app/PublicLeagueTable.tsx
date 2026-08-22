"use client";

import Link from "next/link";
import { useState } from "react";
import type { PublicTableData } from "@/lib/public-table";
import ShareTableButton from "./ShareTableButton";
import styles from "./PublicLeagueTable.module.css";

export default function PublicLeagueTable({
  seasonLabel,
  prizePot,
  gameweekNumber,
  rows,
  formGameweeks,
  formRows,
  seasonFacts,
  playerInsights,
  headline,
}: PublicTableData) {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  return (
    <main className="publicTablePage" onClick={() => setExpandedPlayer(null)}>
      <header className="publicHero">
        <img src="/assets/hearts-crest.png?v=gold-crest-20260817-1945" alt="Heart of Midlothian crest" />
        <div>
          <p>EST 2024 · SEASON {seasonLabel}{gameweekNumber ? ` · GW ${gameweekNumber}` : ""}</p>
          <h1>BOUNCE</h1>
          <h2>BTTS LEAGUE</h2>
        </div>
        <Link className="publicLoginButton" href="/login">Member login</Link>
      </header>

      <section className="publicTableCard">
        <div className="publicTableHeading">
          <div><span>LIVE PUBLIC STANDINGS</span><h3>League Table</h3></div>
          <div className="publicTableActions">
            <strong>Prize pot £{prizePot.toFixed(0)}</strong>
            <ShareTableButton rows={rows} seasonLabel={seasonLabel} gameweekNumber={gameweekNumber} prizePot={prizePot} />
          </div>
        </div>

        <div className={styles.standingsWrap}>
          <table className={styles.standingsTable}>
            <thead><tr><th>POS</th><th>PLAYER</th><th>P</th><th>W</th><th>S-N</th><th>0-0</th><th>PTS</th></tr></thead>
            <tbody>{rows.map((row, index) => (
              <tr key={row.id} className={index === 0 ? styles.leaderRow : undefined}>
                <td>{index + 1}</td><th scope="row">{row.name}</th><td>{row.played}</td><td>{row.wins}</td><td>{row.oneSided}</td><td>{row.zeroZeroCount}</td><td className={styles.pointsCell}>{row.points}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p className="tieRule">S-N means a score–nil result worth +1. Ties: fewest 0–0 results, most BTTS wins, then alphabetical.</p>
      </section>

      <section className={`${styles.publicPanel} ${styles.statPanel}`}>
        <div className={styles.sectionHeading}><div><span>SEASON SNAPSHOT</span><h3>League Stats</h3></div></div>
        <div className={styles.statCluster}>
          <div className={styles.statItem}><span>LEAGUE LEADER</span><strong>{headline.leagueLeader?.name ?? "—"}</strong><small>{headline.leagueLeader ? `${headline.leagueLeader.points} pts` : "No scores yet"}</small></div>
          <div className={styles.statItem}><span>SEASON POT</span><strong>£{prizePot.toFixed(0)}</strong><small>{rows.length} active players</small></div>
          <div className={styles.statItem}><span>LEAGUE STRIKE RATE</span><strong>{headline.leagueStrikeRate == null ? "—" : `${headline.leagueStrikeRate.toFixed(1)}%`}</strong><small>{headline.bttsWins} BTTS wins</small></div>
          <div className={styles.statItem}><span>{headline.formLeaderNames.length > 1 ? "FORM LEADERS" : "FORM LEADER"}</span><strong className={headline.formLeaderNames.length > 1 ? "jointStatValue" : undefined}>{headline.formLeaderNames.length ? headline.formLeaderNames.join(", ") : "—"}</strong><small>{headline.formLeaderNames.length ? `${headline.topFormPoints} pts across current form` : "Waiting for scored weeks"}</small></div>
          <div className={styles.statItem}><span>{headline.bttsLeaderNames.length > 1 ? "BTTS LEADERS" : "BTTS LEADER"}</span><strong className={headline.bttsLeaderNames.length > 1 ? "jointStatValue" : undefined}>{headline.bttsLeaderNames.length ? headline.bttsLeaderNames.join(", ") : "—"}</strong><small>{headline.bttsLeaderNames.length ? `${headline.topBttsWins} BTTS wins` : "No BTTS wins yet"}</small></div>
          <div className={styles.statItem}><span>CREATURE OF HABIT</span><strong className={headline.creatureLeaders.length > 1 ? "jointStatValue" : undefined}>{headline.creatureLeaders.length ? headline.creatureLeaders.map((row) => `${row.name} — ${row.team}, ${row.count} picks`).join(" / ") : "—"}</strong><small>{headline.creatureLeaders.length ? `${headline.creatureLeaders.map((row) => `${row.wins}W · ${row.losses}L`).join(" / ")} · Most repeat selections of the same team` : "Most repeat selections of the same team"}</small></div>
          <div className={styles.statItem}><span>GOALS IN PICKS</span><strong>{headline.leagueGoals}</strong><small>Finished selected fixtures</small></div>
          <div className={styles.statItem}><span>FINISHED PICKS</span><strong>{headline.finishedPicks}</strong><small>{headline.recordedSelections} selections recorded</small></div>
        </div>
        <details className="leagueMoreStats">
          <summary>More league stats <span className="leagueMoreStatsChevron" aria-hidden="true">⌄</span></summary>
          <div className={styles.statCluster}>
            {seasonFacts.map((fact) => <div className={styles.statItem} key={fact.label}>
              <span>{fact.label}</span>
              <strong className={fact.value.includes(", ") ? "jointStatValue" : undefined}>{fact.value}</strong>
              <small>{fact.detail}</small>
              {fact.label.startsWith("MOST PICKED TEAM") && fact.breakdown?.length ? (
                <details className="leagueStatBreakdown" onClick={(event) => event.stopPropagation()}>
                  <summary>View pick breakdown</summary>
                  <div>{fact.breakdown.map((line) => <small key={line}>{line}</small>)}</div>
                </details>
              ) : null}
            </div>)}
          </div>
        </details>
      </section>

      <section className={styles.publicPanel}>
        <div className={styles.sectionHeading}><div><span>LAST SIX SCORED GAMEWEEKS</span><h3>Current Form</h3></div></div>
        {formGameweeks.length ? <div className={styles.formTable}>
          <div className={`${styles.formRow} ${styles.formHeader}`}><span>POS</span><span>PLAYER</span>{formGameweeks.map((number) => <span key={number}>GW{number}</span>)}<span>FORM</span></div>
          {formRows.map((row, index) => <div className={styles.formRow} key={row.id}><span>{index + 1}</span><strong>{row.name}</strong>{row.values.map((value, i) => <span className={value === 3 ? styles.good : value === 1 ? styles.ok : value !== null && value < 0 ? styles.bad : ""} key={`${row.id}-${formGameweeks[i]}`}>{value ?? "—"}</span>)}<b>{row.total}</b></div>)}
        </div> : <p className={styles.empty}>Form will appear once gameweeks have scored.</p>}
      </section>

      <section className={styles.publicPanel}>
        <div className={styles.sectionHeading}><div><span>SEASON SELECTION PROFILE</span><h3>Player Stats</h3></div></div><p style={{margin:"-4px 0 10px",fontSize:"11px",color:"#8f8a86",letterSpacing:".02em"}}>Tap a player to expand stats</p>
        <div className={styles.playerList}>
          {playerInsights.map((row) => {
            const open = expandedPlayer === row.id;
            return <article className={`${styles.playerCard} ${open ? styles.playerCardOpen : ""}`} key={row.id} onClick={(event) => event.stopPropagation()}>
              <button type="button" className={styles.playerSummary} aria-expanded={open} onClick={() => setExpandedPlayer(open ? null : row.id)}>
                <strong>{row.name}</strong><span>{rows.find((standing) => standing.id === row.id)?.points ?? 0} pts</span><b>{open ? "−" : "+"}</b>
              </button>
              {open && <div className={styles.playerDetails}>
                <div className="playerStatHeadline"><span>STRIKE RATE</span><b>{row.strikeRate.toFixed(1)}%</b></div>
                <div className="playerStatHeadline"><span>POINTS / PICK</span><b>{row.pointsPerPick.toFixed(2)}</b></div>
                <div className="playerStatHeadline"><span>CURRENT BTTS STREAK</span><b>{row.currentStreak}</b></div>
                <div className="playerStatHeadline"><span>BEST BTTS STREAK</span><b>{row.bestStreak}</b></div>
                <div><span>AVG SELECTED ODDS</span><b>{row.averageSelectedOdds == null ? "—" : `${row.averageSelectedOdds.toFixed(2)}/1`}</b></div>
                <div><span>AVG WINNING ODDS</span><b>{row.averageWinningOdds == null ? "—" : `${row.averageWinningOdds.toFixed(2)}/1`}</b></div>
                <div><span>BIGGEST WINNING ODDS</span><b>{row.biggestWinningOdds == null ? "—" : `${row.biggestWinningOdds.toFixed(2)}/1`}</b></div>
                <div><span>LONGEST WINLESS RUN</span><b>{row.longestWinlessStreak}</b></div>
                <div><span>TOTAL GOALS</span><b>{row.goals}</b></div>
                <div><span>AVG GOALS / PICK</span><b>{row.averageGoals ? row.averageGoals.toFixed(1) : "—"}</b></div>
                <div><span>RESULT SPLIT</span><b>{row.homeWins}H · {row.draws}D · {row.awayWins}A</b></div>
                <div className={styles.playerCompetition}><span>MOST PICKED COMPETITION</span><b>{row.favouriteCompetition}</b></div>
                <div className={styles.playerCompetition}><span>MOST PICKED TEAM</span><b>{row.mostPickedTeamCount >= 2 ? `${row.mostPickedTeam} · ${row.mostPickedTeamCount} picks` : row.mostPickedTeam}</b></div>
              </div>}
            </article>;
          })}
        </div>
        <p className="publicReadOnlyNote">Public view is read-only. League members use Member login to make or change selections.</p>
      </section>

      <footer className="siteFooter"><span>♡</span><strong>MADE BY THE ARTIST, FOR THE BOUNCE</strong></footer>
    </main>
  );
}
