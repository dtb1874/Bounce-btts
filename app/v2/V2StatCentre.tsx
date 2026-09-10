"use client";

import { useMemo, useState } from "react";
import styles from "./V2StatCentre.module.css";

type Profile = { id: string; display_name: string; active: boolean; role: string };
type Gameweek = { id: string; number: number; status: string };
type Fixture = { id: string; competition: string; home_team: string; away_team: string; home_score: number | null; away_score: number | null; odds_fractional: string | null };
type Prediction = { id: string; gameweek_id: string; member_id: string; fixture_id: string; points_awarded: number | null };
type Standing = { id: string; name: string; played: number; wins: number; oneSided: number; zeroZeroCount: number; points: number };

type Props = {
  seasonLabel: string;
  profiles: Profile[];
  gameweeks: Gameweek[];
  fixtures: Fixture[];
  predictions: Prediction[];
  standings: Standing[];
  myId: string;
};

type Tab = "league" | "players" | "form" | "records";

function pct(value: number, total: number) {
  return total > 0 ? `${Math.round((value / total) * 100)}%` : "—";
}

function decimalOdds(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const n = Number(match[1]);
  const d = Number(match[2]);
  return Number.isFinite(n) && Number.isFinite(d) && d > 0 ? 1 + n / d : null;
}

export default function V2StatCentre({ seasonLabel, profiles, gameweeks, fixtures, predictions, standings, myId }: Props) {
  const [tab, setTab] = useState<Tab>("league");
  const [playerId, setPlayerId] = useState(myId || profiles[0]?.id || "");

  const activeProfiles = useMemo(() => profiles.filter((row) => row.active && row.role !== "guest"), [profiles]);
  const scored = useMemo(() => predictions.filter((row) => row.points_awarded != null), [predictions]);
  const fixtureById = useMemo(() => new Map(fixtures.map((row) => [row.id, row])), [fixtures]);

  const playerStats = useMemo(() => activeProfiles.map((profile) => {
    const rows = scored.filter((row) => row.member_id === profile.id);
    const wins = rows.filter((row) => row.points_awarded === 3).length;
    const oneSided = rows.filter((row) => row.points_awarded === 1).length;
    const nils = rows.filter((row) => row.points_awarded === -1).length;
    const points = rows.reduce((sum, row) => sum + Number(row.points_awarded ?? 0), 0);
    const oddsWins = rows
      .filter((row) => row.points_awarded === 3)
      .map((row) => ({ row, odds: decimalOdds(fixtureById.get(row.fixture_id)?.odds_fractional) }))
      .filter((entry): entry is { row: Prediction; odds: number } => entry.odds != null)
      .sort((a, b) => b.odds - a.odds);
    return {
      id: profile.id,
      name: profile.display_name,
      played: rows.length,
      wins,
      oneSided,
      nils,
      points,
      strike: rows.length ? wins / rows.length : 0,
      ppg: rows.length ? points / rows.length : 0,
      biggestOdds: oddsWins[0]?.odds ?? null,
      biggestOddsFixture: oddsWins[0] ? fixtureById.get(oddsWins[0].row.fixture_id) : undefined,
    };
  }), [activeProfiles, scored, fixtureById]);

  const totalPlayed = playerStats.reduce((sum, row) => sum + row.played, 0);
  const totalWins = playerStats.reduce((sum, row) => sum + row.wins, 0);
  const totalNils = playerStats.reduce((sum, row) => sum + row.nils, 0);
  const bestStrike = [...playerStats].filter((row) => row.played > 0).sort((a, b) => b.strike - a.strike || b.played - a.played)[0];
  const bestPpg = [...playerStats].filter((row) => row.played > 0).sort((a, b) => b.ppg - a.ppg)[0];
  const bestOdds = [...playerStats].filter((row) => row.biggestOdds != null).sort((a, b) => Number(b.biggestOdds) - Number(a.biggestOdds))[0];
  const selected = playerStats.find((row) => row.id === playerId) ?? playerStats[0];

  const completedGameweeks = [...gameweeks].filter((row) => row.status === "complete").sort((a, b) => a.number - b.number);
  const recentGameweeks = completedGameweeks.slice(-6);
  const formRows = standings.map((standing) => {
    const form = recentGameweeks.map((gameweek) => scored.find((row) => row.member_id === standing.id && row.gameweek_id === gameweek.id)?.points_awarded ?? null);
    const formPoints = form.reduce<number>((sum, value) => sum + Number(value ?? 0), 0);
    return { ...standing, form, formPoints };
  }).sort((a, b) => b.formPoints - a.formPoints || b.points - a.points);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "league", label: "League" },
    { id: "players", label: "Players" },
    { id: "form", label: "Form & Trends" },
    { id: "records", label: "Records" },
  ];

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span>STAT CENTRE · {seasonLabel}</span>
          <h1>The numbers behind the Bounce.</h1>
          <p>League shape, individual form and season records — structured to tell the story, not bury it in tiles.</p>
        </div>
        <div className={styles.heroStat}>
          <span>LEAGUE BTTS STRIKE RATE</span>
          <strong>{pct(totalWins, totalPlayed)}</strong>
          <small>{totalWins} winning picks from {totalPlayed} settled selections</small>
        </div>
      </header>

      <nav className={styles.tabs} aria-label="Stat Centre sections">
        {tabs.map((item) => <button type="button" key={item.id} className={tab === item.id ? styles.activeTab : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </nav>

      {tab === "league" ? (
        <section className={styles.section}>
          <div className={styles.introGrid}>
            <div className={styles.bigStatement}>
              <span>SEASON READ</span>
              <h2>{standings[0]?.name ?? "No leader yet"}</h2>
              <p>{standings[0] ? `sets the pace on ${standings[0].points} points, with ${standings[0].wins} full BTTS wins.` : "The season picture will build as results settle."}</p>
            </div>
            <dl className={styles.statRail}>
              <div><dt>Best strike</dt><dd>{bestStrike ? `${bestStrike.name} · ${pct(bestStrike.wins, bestStrike.played)}` : "—"}</dd></div>
              <div><dt>Best PPG</dt><dd>{bestPpg ? `${bestPpg.name} · ${bestPpg.ppg.toFixed(2)}` : "—"}</dd></div>
              <div><dt>0–0s</dt><dd>{totalNils}</dd></div>
            </dl>
          </div>

          <div className={styles.ledgerHeader}><span>THE TABLE</span><h2>Season order</h2></div>
          <div className={styles.tableHead}><span>Pos</span><span>Player</span><span>Played</span><span>BTTS</span><span>0–0</span><span>Pts</span></div>
          <div className={styles.tableBody}>
            {standings.map((row, index) => (
              <div className={`${styles.tableRow} ${row.id === myId ? styles.me : ""}`} key={row.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{row.name}</strong>
                <span>{row.played}</span>
                <span>{row.wins}</span>
                <span>{row.zeroZeroCount}</span>
                <b>{row.points}</b>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "players" ? (
        <section className={styles.section}>
          <div className={styles.playerChooser}>
            <span>PLAYER ANALYSIS</span>
            <div>{activeProfiles.map((profile) => <button type="button" key={profile.id} className={playerId === profile.id ? styles.selectedPlayer : ""} onClick={() => setPlayerId(profile.id)}>{profile.display_name}</button>)}</div>
          </div>

          {selected ? (
            <div className={styles.playerProfile}>
              <div className={styles.playerIdentity}>
                <span>{selected.name.slice(0, 1).toUpperCase()}</span>
                <div><small>SEASON PROFILE</small><h2>{selected.name}</h2><p>{selected.points} points from {selected.played} settled picks.</p></div>
              </div>
              <div className={styles.playerNumbers}>
                <div><span>Strike rate</span><strong>{pct(selected.wins, selected.played)}</strong></div>
                <div><span>Points / pick</span><strong>{selected.ppg.toFixed(2)}</strong></div>
                <div><span>BTTS wins</span><strong>{selected.wins}</strong></div>
                <div><span>One-sided</span><strong>{selected.oneSided}</strong></div>
                <div><span>0–0s</span><strong>{selected.nils}</strong></div>
              </div>
              <div className={styles.playerStory}>
                <span>VALUE MOMENT</span>
                <h3>{selected.biggestOdds ? `${(selected.biggestOdds - 1).toFixed(2)}/1` : "No priced winner yet"}</h3>
                <p>{selected.biggestOddsFixture ? `${selected.biggestOddsFixture.home_team} v ${selected.biggestOddsFixture.away_team}` : "The highest-priced winning selection will appear here."}</p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "form" ? (
        <section className={styles.section}>
          <div className={styles.ledgerHeader}><span>RECENT FORM</span><h2>Last six settled weeks</h2></div>
          <div className={styles.formKey}><span><i className={styles.winDot} /> +3</span><span><i className={styles.oneDot} /> +1</span><span><i className={styles.nilDot} /> −1</span></div>
          <div className={styles.formTable}>
            {formRows.map((row, index) => (
              <div className={styles.formRow} key={row.id}>
                <span className={styles.formPos}>{index + 1}</span>
                <strong>{row.name}</strong>
                <div className={styles.formMarks}>{row.form.map((value, i) => <span key={`${row.id}-${i}`} className={value === 3 ? styles.winMark : value === 1 ? styles.oneMark : value === -1 ? styles.nilMark : styles.blankMark}>{value == null ? "·" : value > 0 ? `+${value}` : value}</span>)}</div>
                <b>{row.formPoints > 0 ? `+${row.formPoints}` : row.formPoints}</b>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "records" ? (
        <section className={styles.recordsSection}>
          <div className={styles.recordHero}>
            <span>SEASON RECORDS</span>
            <h2>Moments worth remembering.</h2>
          </div>
          <div className={styles.recordLedger}>
            <div><span>Highest strike rate</span><strong>{bestStrike?.name ?? "—"}</strong><b>{bestStrike ? pct(bestStrike.wins, bestStrike.played) : "—"}</b></div>
            <div><span>Best points per pick</span><strong>{bestPpg?.name ?? "—"}</strong><b>{bestPpg ? bestPpg.ppg.toFixed(2) : "—"}</b></div>
            <div><span>Biggest priced BTTS winner</span><strong>{bestOdds?.name ?? "—"}</strong><b>{bestOdds?.biggestOdds ? `${(bestOdds.biggestOdds - 1).toFixed(2)}/1` : "—"}</b></div>
            <div><span>Fewest 0–0s</span><strong>{[...playerStats].filter((row) => row.played > 0).sort((a, b) => a.nils - b.nils || b.points - a.points)[0]?.name ?? "—"}</strong><b>{[...playerStats].filter((row) => row.played > 0).sort((a, b) => a.nils - b.nils || b.points - a.points)[0]?.nils ?? "—"}</b></div>
          </div>
        </section>
      ) : null}

      <footer className={styles.footer}><span>BOUNCE DATA ROOM</span><strong>Form changes. The record stays.</strong></footer>
    </main>
  );
}
