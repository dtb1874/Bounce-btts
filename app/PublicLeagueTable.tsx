"use client";

import Link from "next/link";
import { useState } from "react";
import type { PublicTableData } from "@/lib/public-table";
import ShareTableButton from "./ShareTableButton";
import styles from "./PublicLeagueTable.module.css";

export default function PublicLeagueTable({ seasonLabel, prizePot, gameweekNumber, rows, formGameweeks, formRows, leagueGoals, finishedPicks, recordedSelections, seasonFacts, playerInsights }: PublicTableData) {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  return (
    <main className="publicTablePage" onClick={() => setExpandedPlayer(null)}>
      <header className="publicHero">
        <img src="/assets/hearts-crest.png" alt="Heart of Midlothian crest" />
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
          <div className={styles.statItem}><span>LEAGUE LEADER</span><strong>{rows[0]?.name ?? "—"}</strong><small>{rows[0] ? `${rows[0].points} pts` : "No scores yet"}</small></div>
          <div className={styles.statItem}><span>SEASON POT</span><strong>£{prizePot.toFixed(0)}</strong><small>{rows.length} active players</small></div>
          <div className={styles.statItem}><span>GOALS IN PICKS</span><strong>{leagueGoals}</strong><small>Finished selected fixtures</small></div>
          <div className={styles.statItem}><span>FINISHED PICKS</span><strong>{finishedPicks}</strong><small>{recordedSelections} selections recorded</small></div>
          {seasonFacts.map((fact) => <div className={styles.statItem} key={fact.label}><span>{fact.label}</span><strong>{fact.value}</strong><small>{fact.detail}</small></div>)}
        </div>
      </section>

      <section className={styles.publicPanel}>
        <div className={styles.sectionHeading}><div><span>LAST SIX SCORED GAMEWEEKS</span><h3>Current Form</h3></div></div>
        {formGameweeks.length ? <div className={styles.formTable}>
          <div className={`${styles.formRow} ${styles.formHeader}`}><span>POS</span><span>PLAYER</span>{formGameweeks.map((number) => <span key={number}>GW{number}</span>)}<span>FORM</span></div>
          {formRows.map((row, index) => <div className={styles.formRow} key={row.id}><span>{index + 1}</span><strong>{row.name}</strong>{row.values.map((value, i) => <span className={value === 3 ? styles.good : value === 1 ? styles.ok : value !== null && value < 0 ? styles.bad : ""} key={`${row.id}-${formGameweeks[i]}`}>{value ?? "—"}</span>)}<b>{row.total}</b></div>)}
        </div> : <p className={styles.empty}>Form will appear once gameweeks have scored.</p>}
      </section>

      <section className={styles.publicPanel}>
        <div className={styles.sectionHeading}><div><span>SEASON SELECTION PROFILE</span><h3>Player Tendencies</h3></div></div>
        <div className={styles.playerList}>
          {playerInsights.map((row) => {
            const open = expandedPlayer === row.id;
            return <article className={`${styles.playerCard} ${open ? styles.playerCardOpen : ""}`} key={row.id} onClick={(event) => event.stopPropagation()}>
              <button type="button" className={styles.playerSummary} aria-expanded={open} onClick={() => setExpandedPlayer(open ? null : row.id)}>
                <strong>{row.name}</strong><span>{rows.find((standing) => standing.id === row.id)?.points ?? 0} pts</span><b>{open ? "−" : "+"}</b>
              </button>
              {open && <div className={styles.playerDetails}>
                <div><span>TOTAL GOALS</span><b>{row.goals}</b></div>
                <div><span>AVG GOALS / PICK</span><b>{row.averageGoals ? row.averageGoals.toFixed(1) : "—"}</b></div>
                <div><span>RESULT SPLIT</span><b>{row.homeWins}H · {row.draws}D · {row.awayWins}A</b></div>
                <div className={styles.playerCompetition}><span>MOST PICKED COMPETITION</span><b>{row.favouriteCompetition}</b></div>
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
