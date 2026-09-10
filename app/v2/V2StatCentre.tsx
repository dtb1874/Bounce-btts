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
        </div>
        <div className={styles.heroSummary}>
          <div><span>LEAGUE LEADER</span><strong>{canonical.headline.leagueLeader?.name ?? "—"}</strong><small>{canonical.headline.leagueLeader ? `${canonical.headline.leagueLeader.points} pts` : "No scores yet"}</small></div>
          <div><span>STRIKE RATE</span><strong>{pct(canonical.headline.leagueStrikeRate)}</strong><small>{canonical.headline.bttsWins} BTTS wins</small></div>
          <div><span>FORM</span><strong>{canonical.headline.formLeaderNames.length ? canonical.headline.formLeaderNames.join(" / ") : "—"}</strong><small>{canonical.headline.formLeaderNames.length ? `${canonical.headline.topFormPoints} pts` : "Waiting for scored weeks"}</small></div>
        </div>
      </header>

      <nav className={styles.tabs} aria-label="Stat Centre sections">
        {tabs.map((item) => <button type="button" key={item.id} className={tab === item.id ? styles.activeTab : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </nav>

      {tab === "league" ? (
        <section className={styles.section}>
          <header className={styles.sectionHeading}><span>SEASON {seasonLabel}</span><h2>League Overview</h2></header>
          <div className={styles.snapshotLedger}>
            <div><span>LEAGUE LEADER</span><strong>{canonical.headline.leagueLeader?.name ?? "—"}</strong><small>{canonical.headline.leagueLeader ? `${canonical.headline.leagueLeader.points} pts` : "No scores yet"}</small></div>
            <div><span>SEASON POT</span><strong>£{prizePot.toFixed(0)}</strong><small>{standings.length} active players</small></div>
            <div><span>LEAGUE STRIKE RATE</span><strong>{pct(canonical.headline.leagueStrikeRate)}</strong><small>{canonical.headline.bttsWins} BTTS wins</small></div>
            <div><span>{canonical.headline.formLeaderNames.length > 1 ? "FORM LEADERS" : "FORM LEADER"}</span><strong>{canonical.headline.formLeaderNames.length ? canonical.headline.formLeaderNames.join(" / ") : "—"}</strong><small>{canonical.headline.formLeaderNames.length ? `${canonical.headline.topFormPoints} pts across current form` : "Waiting for scored weeks"}</small></div>
            <div><span>{canonical.headline.bttsLeaderNames.length > 1 ? "BTTS LEADERS" : "BTTS LEADER"}</span><strong>{canonical.headline.bttsLeaderNames.length ? canonical.headline.bttsLeaderNames.join(" / ") : "—"}</strong><small>{canonical.headline.bttsLeaderNames.length ? `${canonical.headline.topBttsWins} BTTS wins` : "No BTTS wins yet"}</small></div>
            <div><span>CREATURE OF HABIT</span><strong>{creature}</strong><small>{canonical.headline.creatureLeaders.length ? canonical.headline.creatureLeaders.map((row) => `${row.count} picks · ${row.wins}W ${row.losses}L`).join(" / ") : "Most repeat selections of the same team"}</small></div>
            <div><span>GOALS IN PICKS</span><strong>{canonical.headline.leagueGoals}</strong><small>Finished selected fixtures</small></div>
            <div><span>FINISHED PICKS</span><strong>{canonical.headline.finishedPicks}</strong><small>{canonical.headline.recordedSelections} selections recorded</small></div>
          </div>

          <header className={`${styles.sectionHeading} ${styles.tableHeading}`}><span>CURRENT TABLE</span><h2>League Table</h2></header>
          <div className={styles.tableHead}><span>Pos</span><span>Player</span><span>P</span><span>W</span><span>S-N</span><span>0–0</span><span>Pts</span></div>
          <div className={styles.tableBody}>
            {standings.map((row, index) => {
              const portrait = portraits[row.id];
              return (
                <div className={`${styles.tableRow} ${row.id === myId ? styles.me : ""}`} key={row.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span className={styles.tablePlayer}>
                    <span className={styles.tableAvatar}>{portrait ? <img src={portrait} alt="" onError={() => clearPortrait(row.id)} /> : row.name.slice(0, 1).toUpperCase()}</span>
                    <strong>{row.name}</strong>
                  </span>
                  <span>{row.played}</span><span>{row.wins}</span><span>{row.oneSided}</span><span>{row.zeroZeroCount}</span><b>{row.points}</b>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {tab === "players" ? (
        <section className={styles.section}>
          <header className={styles.sectionHeading}><span>SEASON SELECTION PROFILE</span><h2>Player Stats</h2></header>
          <div className={styles.playerChooser}>
            {activeProfiles.map((profile) => <button type="button" key={profile.id} className={playerId === profile.id ? styles.selectedPlayer : ""} onClick={() => setPlayerId(profile.id)}>{profile.display_name}</button>)}
          </div>
          {selected ? (
            <div className={styles.playerProfile}>
              <div className={styles.playerIdentity}>
                <span>{portraits[selected.id] ? <img src={portraits[selected.id]} alt="" onError={() => clearPortrait(selected.id)} /> : selected.name.slice(0, 1).toUpperCase()}</span>
                <div><small>PLAYER PROFILE</small><h3>{selected.name}</h3><p>{selectedStanding?.points ?? 0} points · {selectedStanding?.played ?? 0} played</p></div>
              </div>
              <div className={styles.playerStatLedger}>
                <div><span>STRIKE RATE</span><b>{pct(selected.strikeRate)}</b></div>
                <div><span>POINTS / PICK</span><b>{selected.pointsPerPick.toFixed(2)}</b></div>
                <div><span>CURRENT BTTS STREAK</span><b>{selected.currentStreak}</b></div>
                <div><span>BEST BTTS STREAK</span><b>{selected.bestStreak}</b></div>
                <div><span>AVG SELECTED ODDS</span><b>{odds(selected.averageSelectedOdds)}</b></div>
                <div><span>AVG WINNING ODDS</span><b>{odds(selected.averageWinningOdds)}</b></div>
                <div><span>BIGGEST WINNING ODDS</span><b>{odds(selected.biggestWinningOdds)}</b></div>
                <div><span>LONGEST WINLESS RUN</span><b>{selected.longestWinlessStreak}</b></div>
                <div><span>TOTAL GOALS</span><b>{selected.goals}</b></div>
                <div><span>AVG GOALS / PICK</span><b>{selected.averageGoals.toFixed(1)}</b></div>
                <div><span>RESULT SPLIT</span><b>{selected.homeWins}H · {selected.draws}D · {selected.awayWins}A</b></div>
                <div><span>MOST PICKED COMPETITION</span><b>{selected.favouriteCompetition}</b></div>
                <div><span>MOST PICKED TEAM</span><b>{selected.mostPickedTeamCount >= 2 ? `${selected.mostPickedTeam} · ${selected.mostPickedTeamCount} picks` : selected.mostPickedTeam}</b></div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "form" ? (
        <section className={styles.section}>
          <header className={styles.sectionHeading}><span>RECENT FORM</span><h2>Form & Trends</h2></header>
          <div className={styles.formKey}><span><i className={styles.winDot} /> +3</span><span><i className={styles.oneDot} /> +1</span><span><i className={styles.nilDot} /> −1</span></div>
          <div className={styles.formTable}>
            {standings.map((standing, index) => {
              const row = formById.get(standing.id);
              return (
                <div className={styles.formRow} key={standing.id}>
                  <span className={styles.formPos}>{index + 1}</span><strong>{standing.name}</strong>
                  <div className={styles.formMarks}>{(row?.values ?? []).map((value, i) => <span key={`${standing.id}-${i}`} className={value === 3 ? styles.winMark : value === 1 ? styles.oneMark : value === -1 ? styles.nilMark : styles.blankMark}>{value == null ? "·" : value > 0 ? `+${value}` : value}</span>)}</div>
                  <b>{row ? (row.total > 0 ? `+${row.total}` : row.total) : "—"}</b>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {tab === "records" ? (
        <section className={styles.section}>
          <header className={styles.sectionHeading}><span>SEASON {seasonLabel}</span><h2>League Records</h2></header>
          <div className={styles.recordLedger}>
            {canonical.seasonFacts.map((fact) => (
              <div key={fact.label}>
                <span>{fact.label}</span><strong>{fact.value}</strong><b>{fact.detail}</b>
                {fact.breakdown?.length ? <small>{fact.breakdown.join(" · ")}</small> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <footer className={styles.footer}><span>THE BOUNCE</span><strong>BTTS LEAGUE · EST. 2024</strong></footer>
    </main>
  );
}
