"use client";

import { useEffect, useMemo, useState } from "react";
import { competitionDisplayName } from "@/lib/competition-display";
import { calculateLeagueStats } from "@/lib/league-stats";
import styles from "./V2StatCentre.module.css";

type Profile = { id: string; display_name: string; active: boolean; role: string };
type Gameweek = { id: string; number: number; status: string };
type Fixture = { id: string; competition: string; country?: string | null; home_team: string; away_team: string; home_score: number | null; away_score: number | null; odds_fractional: string | null; odds_deadline_fractional?: string | null; status?: string | null };
type Prediction = { id: string; gameweek_id: string; member_id: string; fixture_id: string; points_awarded: number | null; created_at?: string };
type Adjustment = { gameweek_id: string; member_id: string; points: number };
type Standing = { id: string; name: string; played: number; wins: number; oneSided: number; zeroZeroCount: number; points: number };

type Props = {
  seasonLabel: string;
  profiles: Profile[];
  gameweeks: Gameweek[];
  fixtures: Fixture[];
  predictions: Prediction[];
  adjustments: Adjustment[];
  standings: Standing[];
  myId: string;
  entryFee: number;
};

type Tab = "league" | "players" | "form" | "records";

function pct(value: number | null | undefined) {
  return value == null ? "—" : `${value.toFixed(1)}%`;
}

function odds(value: number | null | undefined) {
  return value == null ? "—" : `${value.toFixed(2)}/1`;
}

export default function V2StatCentre({ seasonLabel, profiles, gameweeks, fixtures, predictions, adjustments, standings, myId, entryFee }: Props) {
  const [tab, setTab] = useState<Tab>("league");
  const [playerId, setPlayerId] = useState(myId || profiles[0]?.id || "");
  const [portraits, setPortraits] = useState<Record<string, string>>({});
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const activeProfiles = useMemo(() => profiles.filter((row) => row.active && row.role !== "guest"), [profiles]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/member-portraits", { cache: "force-cache" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Portraits unavailable")))
      .then((data) => {
        if (cancelled) return;
        const next: Record<string, string> = {};
        for (const row of data.portraits ?? []) if (row.id && row.portraitUrl) next[row.id] = row.portraitUrl;
        setPortraits(next);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const canonical = useMemo(() => calculateLeagueStats({
    standings,
    gameweeks: gameweeks.map((row) => ({ id: row.id, number: row.number })),
    predictions,
    adjustments,
    fixtures: fixtures.map((row) => ({
      ...row,
      odds_fractional: row.odds_deadline_fractional ?? row.odds_fractional,
    })),
    competitionName: competitionDisplayName,
  }), [standings, gameweeks, predictions, adjustments, fixtures]);

  const selected = canonical.playerInsights.find((row) => row.id === playerId) ?? canonical.playerInsights[0];
  const selectedStanding = standings.find((row) => row.id === selected?.id);
  const prizePot = standings.length * entryFee;
  const formById = new Map(canonical.formRows.map((row) => [row.id, row]));
  const creature = canonical.headline.creatureLeaders.length
    ? canonical.headline.creatureLeaders.map((row) => `${row.name} · ${row.team}`).join(" / ")
    : "—";
  const mostPickedTeamRecord = canonical.seasonFacts.find((fact) => fact.label === "MOST PICKED TEAM" || fact.label === "MOST PICKED TEAMS");

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "league", label: "League" },
    { id: "players", label: "Players" },
    { id: "form", label: "Form & Trends" },
    { id: "records", label: "Records" },
  ];

  function clearPortrait(id: string) {
    setPortraits((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroTitle}>
          <span>SEASON {seasonLabel}</span>
          <h1>Stat Centre</h1>
          <p>League intelligence, player tendencies and season records.</p>
        </div>
        <div className={styles.heroArtwork} aria-hidden="true" />
        <div className={styles.heroSummary}>
          <div><span>LEADER</span><strong>{canonical.headline.leagueLeader?.name ?? "—"}</strong><small>{canonical.headline.leagueLeader ? `${canonical.headline.leagueLeader.points} pts` : "No scores yet"}</small></div>
          <div><span>STRIKE RATE</span><strong>{pct(canonical.headline.leagueStrikeRate)}</strong><small>{canonical.headline.bttsWins} BTTS wins</small></div>
          <div><span>FORM</span><strong className={styles.formLeaders}>{canonical.headline.formLeaderNames.length ? canonical.headline.formLeaderNames.map((name) => <span key={name}>{name}</span>) : <span>—</span>}</strong><small>{canonical.headline.formLeaderNames.length ? `${canonical.headline.topFormPoints} pts` : "Waiting for scored weeks"}</small></div>
        </div>
      </header>

      <nav className={styles.tabs} aria-label="Stat Centre sections">
        {tabs.map((item) => <button type="button" key={item.id} className={tab === item.id ? styles.activeTab : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </nav>

      {tab === "league" ? (
        <section className={styles.section}>
          <header className={styles.sectionHeading}><span>SEASON {seasonLabel}</span><h2>League Overview</h2></header>
          <div className={styles.leagueLeadLine}>
            <div><span>LEAGUE PULSE</span><strong>{canonical.headline.leagueLeader?.name ?? "No leader yet"}</strong><p>{canonical.headline.leagueLeader ? `${canonical.headline.leagueLeader.points} points at the top` : "Waiting for the first scored gameweek"}</p></div>
            <div className={styles.leaguePulseStats}><div><span>SEASON POT</span><b>£{prizePot.toFixed(0)}</b></div><div><span>STRIKE RATE</span><b>{pct(canonical.headline.leagueStrikeRate)}</b></div><div><span>BTTS WINS</span><b>{canonical.headline.bttsWins}</b></div></div>
          </div>
          <div className={styles.storyRows}>
            <article><span>FORM LEADER{canonical.headline.formLeaderNames.length > 1 ? "S" : ""}</span><strong>{canonical.headline.formLeaderNames.length ? canonical.headline.formLeaderNames.join(" / ") : "—"}</strong><p>{canonical.headline.formLeaderNames.length ? `${canonical.headline.topFormPoints} points across the current six-week form window` : "Waiting for scored weeks"}</p></article>
            <article><span>CREATURE OF HABIT</span><strong>{creature}</strong><p>{canonical.headline.creatureLeaders.length ? canonical.headline.creatureLeaders.map((row) => `${row.count} picks · ${row.wins}W ${row.losses}L`).join(" / ") : "Most repeat selections of the same team"}</p></article>
            <article><span>{mostPickedTeamRecord?.label ?? "MOST PICKED TEAM"}</span><strong>{mostPickedTeamRecord?.value ?? "—"}</strong><p>{mostPickedTeamRecord?.detail ?? "League-wide selection tendency"}</p></article>
            <article><span>SEASON VOLUME</span><strong>{canonical.headline.leagueGoals} goals</strong><p>{canonical.headline.finishedPicks} finished picks · {canonical.headline.recordedSelections} selections recorded</p></article>
          </div>
          <header className={`${styles.sectionHeading} ${styles.tableHeading}`}><span>CURRENT TABLE</span><h2>League Table</h2></header>
          <div className={styles.tableHead}><span>Pos</span><span>Player</span><span>P</span><span>W</span><span>S-N</span><span>0–0</span><span>Pts</span></div>
          <div className={styles.tableBody}>{standings.map((row, index) => { const portrait = portraits[row.id]; return <div className={`${styles.tableRow} ${row.id === myId ? styles.me : ""}`} key={row.id}><span>{String(index + 1).padStart(2, "0")}</span><span className={styles.tablePlayer}><span className={styles.tableAvatar}>{portrait ? <img src={portrait} alt="" onError={() => clearPortrait(row.id)} /> : row.name.slice(0, 1).toUpperCase()}</span><strong>{row.name}</strong></span><span>{row.played}</span><span>{row.wins}</span><span>{row.oneSided}</span><span>{row.zeroZeroCount}</span><b>{row.points}</b></div>; })}</div>
        </section>
      ) : null}

      {tab === "players" ? (
        <section className={styles.section}>
          <header className={styles.sectionHeading}><span>SEASON SELECTION PROFILE</span><h2>Player Stats</h2></header>
          <div className={styles.playerChooser}>{activeProfiles.map((profile) => <button type="button" key={profile.id} className={playerId === profile.id ? styles.selectedPlayer : ""} onClick={() => setPlayerId(profile.id)}>{profile.display_name}</button>)}</div>
          {selected ? <div className={styles.playerProfile}><div className={styles.playerIdentity}><span>{portraits[selected.id] ? <img src={portraits[selected.id]} alt="" onError={() => clearPortrait(selected.id)} /> : selected.name.slice(0, 1).toUpperCase()}</span><div><small>PLAYER PROFILE</small><h3>{selected.name}</h3><p>{selectedStanding?.points ?? 0} points · {selectedStanding?.played ?? 0} played</p></div></div><div className={styles.playerGroups}>
            <section><header><span>PERFORMANCE</span><h4>Output</h4></header><div className={styles.playerLines}><div><span>Strike rate</span><b>{pct(selected.strikeRate)}</b></div><div><span>Points / pick</span><b>{selected.pointsPerPick.toFixed(2)}</b></div><div><span>Current BTTS streak</span><b>{selected.currentStreak}</b></div><div><span>Best BTTS streak</span><b>{selected.bestStreak}</b></div></div></section>
            <section><header><span>SELECTION STYLE</span><h4>Tendencies</h4></header><div className={styles.playerLines}><div><span>Most picked competition</span><b>{selected.favouriteCompetition}</b></div><div><span>Most picked team</span><b>{selected.mostPickedTeamCount >= 2 ? `${selected.mostPickedTeam} · ${selected.mostPickedTeamCount}` : selected.mostPickedTeam}</b></div><div><span>Repeat-team record</span><b>{selected.mostPickedTeamCount >= 2 ? `${selected.repeatTeamWins}W · ${selected.repeatTeamLosses}L` : "—"}</b></div><div><span>Avg selected odds</span><b>{odds(selected.averageSelectedOdds)}</b></div></div></section>
            <section><header><span>RECORDS</span><h4>Highs & Lows</h4></header><div className={styles.playerLines}><div><span>Avg winning odds</span><b>{odds(selected.averageWinningOdds)}</b></div><div><span>Biggest winning odds</span><b>{odds(selected.biggestWinningOdds)}</b></div><div><span>Longest winless run</span><b>{selected.longestWinlessStreak}</b></div><div><span>Best BTTS streak</span><b>{selected.bestStreak}</b></div></div></section>
            <section><header><span>GOALS & RESULTS</span><h4>Match Profile</h4></header><div className={styles.playerLines}><div><span>Total goals</span><b>{selected.goals}</b></div><div><span>Avg goals / pick</span><b>{selected.averageGoals.toFixed(1)}</b></div><div><span>Result split</span><b>{selected.homeWins}H · {selected.draws}D · {selected.awayWins}A</b></div></div></section>
          </div></div> : null}
        </section>
      ) : null}

      {tab === "form" ? <section className={styles.section}><header className={styles.sectionHeading}><span>RECENT FORM</span><h2>Form & Trends</h2></header><div className={styles.formKey}><span><i className={styles.winDot} /> +3</span><span><i className={styles.oneDot} /> +1</span><span><i className={styles.nilDot} /> −1</span></div><div className={styles.formGameweeks} aria-label="Form gameweeks"><span /><strong>Player</strong><div>{canonical.formGameweeks.map((number) => <b key={number}>GW {number}</b>)}</div><strong>Total</strong></div><div className={styles.formTable}>{standings.map((standing, index) => { const row = formById.get(standing.id); return <div className={styles.formRow} key={standing.id}><span className={styles.formPos}>{index + 1}</span><strong>{standing.name}</strong><div className={styles.formMarks}>{(row?.values ?? []).map((value, i) => <span key={`${standing.id}-${i}`} className={value === 3 ? styles.winMark : value === 1 ? styles.oneMark : value === -1 ? styles.nilMark : styles.blankMark}>{value == null ? "·" : value > 0 ? `+${value}` : value}</span>)}</div><b>{row ? (row.total > 0 ? `+${row.total}` : row.total) : "—"}</b></div>; })}</div></section> : null}

      {tab === "records" ? <section className={styles.section}><header className={styles.sectionHeading}><span>SEASON {seasonLabel}</span><h2>League Records</h2></header><div className={styles.recordLedger}>{canonical.seasonFacts.map((fact) => { const expandable = Boolean(fact.breakdown?.length); const open = expandedRecord === fact.label; return <article key={fact.label} className={open ? styles.recordOpen : ""}><div className={styles.recordRow}><span>{fact.label}</span><strong>{fact.value}</strong><div className={styles.recordDetail}><b>{fact.detail}</b>{expandable ? <button type="button" onClick={() => setExpandedRecord(open ? null : fact.label)} aria-expanded={open}>{open ? "Hide detail" : "View detail"}</button> : null}</div></div>{open && fact.breakdown?.length ? <div className={styles.recordBreakdown}>{fact.breakdown.map((line) => <span key={line}>{line}</span>)}</div> : null}</article>; })}</div></section> : null}

      <footer className={styles.footer}><span>THE BOUNCE</span><strong>BTTS LEAGUE · EST. 2024</strong></footer>
    </main>
  );
}
