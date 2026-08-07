import Link from "next/link";
import type { PublicTableData } from "@/lib/public-table";
import ShareTableButton from "./ShareTableButton";

export default function PublicLeagueTable({ seasonLabel, prizePot, rows }: PublicTableData) {
  return (
    <main className="publicTablePage">
      <header className="publicHero">
        <img src="/assets/hearts-crest.png" alt="Heart of Midlothian crest" />
        <div>
          <p>EST 2024 · SEASON {seasonLabel}</p>
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
            <ShareTableButton rows={rows} seasonLabel={seasonLabel} prizePot={prizePot} />
          </div>
        </div>

        <div className="largeTable publicLargeTable">
          <div className="largeTableRow header">
            <span>POS</span><span>PLAYER</span><span>P</span><span>W</span><span>0-0</span><span>PTS</span>
          </div>
          {rows.map((row, index) => (
            <div className={`largeTableRow ${index === 0 ? "leader" : ""}`} key={row.id}>
              <span>{index + 1}</span><strong>{row.name}</strong><span>{row.played}</span>
              <span>{row.wins}</span><span>{row.zeroZeroCount}</span><b>{row.points}</b>
            </div>
          ))}
        </div>
        <p className="tieRule">Ties: fewest 0–0 results, most BTTS wins, then alphabetical.</p>
        <p className="publicReadOnlyNote">This page is read-only. League members use Member login to submit or change their picks.</p>
      </section>

      <footer className="siteFooter"><span>♡</span><strong>MADE BY THE ARTIST, FOR THE BOUNCE</strong></footer>
    </main>
  );
}
