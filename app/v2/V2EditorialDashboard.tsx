"use client";

import { useEffect, useMemo, useState } from "react";
import { competitionDisplayName } from "@/lib/competition-display";
import { compactPickOutcome, formatFootballElapsed, isLiveFixtureStatus } from "@/lib/football-live-display";
import styles from "./V2EditorialDashboard.module.css";

type Role = "ultimate_admin" | "admin" | "member" | "guest";
type View = "dashboard" | "pick" | "fixtures" | "table" | "results" | "history" | "players" | "about" | "alerts" | "admin";
type Profile = { id: string; display_name: string; role: Role; active: boolean };
type Gameweek = { id: string; number: number; status: "open" | "locked" | "complete"; opens_at: string | null; locks_at: string };
type Fixture = { id: string; gameweek_id: string | null; competition: string; country?: string | null; home_team: string; away_team: string; kickoff_at: string; status: string; live_elapsed?: number | null; home_score: number | null; away_score: number | null; odds_fractional: string | null };
type Prediction = { id: string; gameweek_id: string; member_id: string; fixture_id: string; points_awarded: number | null };
type Standing = { id: string; name: string; played: number; wins: number; oneSided: number; zeroZeroCount: number; points: number };

type Props = {
  gameweek: Gameweek | null;
  profiles: Profile[];
  fixtures: Fixture[];
  predictions: Prediction[];
  standings: Standing[];
  seasonLabel: string;
  entryFee: number;
  isOpen: boolean;
  myId: string;
  setView: (view: View) => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function ordinal(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

export default function V2EditorialDashboard({ gameweek, profiles, fixtures, predictions, standings, seasonLabel, entryFee, isOpen, myId, setView }: Props) {
  const [portraits, setPortraits] = useState<Record<string, string>>({});
  const myPrediction = predictions.find((row) => row.member_id === myId);
  const myFixture = fixtures.find((row) => row.id === myPrediction?.fixture_id);
  const myStandingIndex = standings.findIndex((row) => row.id === myId);
  const myStanding = myStandingIndex >= 0 ? standings[myStandingIndex] : undefined;
  const leader = standings[0];
  const activeMembers = profiles.filter((row) => row.active && row.role !== "guest");
  const submitted = predictions.length;
  const prizePot = activeMembers.length * entryFee;

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

  function clearPortrait(id: string) {
    setPortraits((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  const picks = useMemo(() => activeMembers.map((profile) => {
    const prediction = predictions.find((row) => row.member_id === profile.id);
    const fixture = fixtures.find((row) => row.id === prediction?.fixture_id);
    const result = fixture
      ? compactPickOutcome({ status: fixture.status, homeScore: fixture.home_score, awayScore: fixture.away_score })
      : { label: "—" as const, tone: "waiting" as const };
    return { profile, prediction, fixture, result };
  }), [activeMembers, predictions, fixtures]);

  const won = picks.filter((row) => row.result.tone === "won").length;
  const live = picks.filter((row) => row.fixture && isLiveFixtureStatus(row.fixture.status) && row.result.tone !== "won").length;
  const missing = Math.max(0, activeMembers.length - submitted);
  const gameweekState = !gameweek ? "NO ACTIVE GAMEWEEK" : isOpen ? "PICKS OPEN" : gameweek.status === "complete" ? "COMPLETE" : "PICKS LOCKED";

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.brandBlock}>
          <div className={styles.brandTitle} aria-label={`The Bounce BTTS League ${seasonLabel}`}>
            <small className={styles.brandThe}>The</small>
            <strong>BOUNCE</strong>
            <span>BTTS LEAGUE <i>· EST. 2024</i></span>
          </div>
          <div className={styles.brandMeta}>
            <img src="/assets/hearts-crest.png?v=gold-crest-20260817-1945" alt="" className={styles.brandCrest} />
            <div className={styles.seasonStamp}>{seasonLabel}</div>
          </div>
        </div>
      </section>

      <section className={styles.selectionBand}>
        <div className={styles.selectionMain}>
          <span className={styles.selectionLabel}>YOUR SELECTION</span>
          {myFixture ? (
            <>
              <div className={styles.fixtureNames}><strong>{myFixture.home_team}</strong><span>v</span><strong>{myFixture.away_team}</strong></div>
              <div className={styles.fixtureMeta}>{competitionDisplayName(myFixture)} · {formatDate(myFixture.kickoff_at)}</div>
            </>
          ) : (
            <div className={styles.noSelection}><strong>{isOpen ? "No pick submitted" : "No selection recorded"}</strong><span>{isOpen ? "Choose one eligible BTTS fixture before the deadline." : "This gameweek has no recorded selection for you."}</span></div>
          )}
        </div>
        <div className={styles.selectionWeekBrief}>
          <div className={styles.weekStatusLine}>
            <strong>{gameweek ? `GW ${gameweek.number}` : "SEASON"}</strong>
            <i>·</i>
            <span>{gameweekState}</span>
          </div>
          {gameweek?.locks_at ? <time className={styles.weekDeadline}>{formatDate(gameweek.locks_at)}</time> : null}
          {isOpen ? (
            <button className={styles.primaryAction} type="button" onClick={() => setView("pick")}>{myPrediction ? "Change my pick" : "Make my pick"}<span>→</span></button>
          ) : (
            <button className={styles.textAction} type="button" onClick={() => setView("results")}>View all picks <span>→</span></button>
          )}
        </div>
      </section>

      <section className={styles.pulse} aria-label="League snapshot">
        <div><span>YOUR POSITION</span><strong>{myStandingIndex >= 0 ? ordinal(myStandingIndex + 1) : "—"}</strong><small>{myStanding ? `${myStanding.points} pts` : "No score yet"}</small></div>
        <div><span>LEADER</span><strong>{leader?.name ?? "—"}</strong><small>{leader ? `${leader.points} pts` : "Season pending"}</small></div>
        <div><span>PICKS IN</span><strong>{submitted}/{activeMembers.length}</strong><small>{missing ? `${missing} outstanding` : "Full house"}</small></div>
        <div><span>PRIZE POT</span><strong>£{prizePot}</strong><small>{activeMembers.length} members</small></div>
      </section>

      <section className={styles.editorialSection}>
        <header className={styles.sectionHeader}>
          <div><span>GAMEWEEK {gameweek?.number ?? "—"}</span><h2>Everyone’s Picks</h2></div>
          <div className={styles.sectionAside}>{live ? `${live} live` : won ? `${won} won` : `${submitted} selected`}</div>
        </header>
        <div className={styles.pickLedger}>
          {picks.map(({ profile, prediction, fixture, result }) => {
            const portrait = portraits[profile.id];
            const selected = Boolean(prediction);
            const score = fixture?.home_score != null && fixture.away_score != null ? `${fixture.home_score}–${fixture.away_score}` : "—";
            const elapsed = fixture && isLiveFixtureStatus(fixture.status) ? formatFootballElapsed(fixture.status, fixture.live_elapsed) : fixture && ["FT", "AET", "PEN"].includes(fixture.status) ? "FT" : "—";
            return (
              <article className={styles.pickRow} key={profile.id}>
                <div className={styles.memberMark}>
                  {portrait ? <img src={portrait} alt="" onError={() => clearPortrait(profile.id)} /> : <span>{profile.display_name.slice(0, 1).toUpperCase()}</span>}
                </div>
                <div className={styles.pickContent}>
                  <div className={styles.pickTop}><strong>{profile.display_name}</strong><span className={selected ? styles.selectedState : styles.waitingState}>{selected ? "SELECTED" : "WAITING PICK"}</span></div>
                  <div className={styles.pickFixture}>{fixture ? <><strong>{fixture.home_team} v {fixture.away_team}</strong><span>{competitionDisplayName(fixture)}</span></> : <span>Awaiting selection</span>}</div>
                  {fixture ? <div className={styles.pickLiveLine}><strong>{score}</strong><i>·</i><span>{elapsed}</span><i>·</i><b className={`${styles.resultPill} ${styles[`result_${result.tone}`]}`}>{result.label}</b></div> : null}
                </div>
              </article>
            );
          })}
        </div>
        <button className={styles.sectionLink} type="button" onClick={() => setView("results")}>View all picks <span>→</span></button>
      </section>

      <section className={`${styles.editorialSection} ${styles.tableSection}`}>
        <header className={styles.sectionHeader}>
          <div><span>LEAGUE</span><h2>League Standing</h2></div>
          <button className={styles.sectionAsideButton} type="button" onClick={() => setView("table")}>Stat Centre →</button>
        </header>
        <div className={styles.tableHead}><span>Pos</span><span>Player</span><span>W</span><span>S-N</span><span>0–0</span><span>Pts</span></div>
        <div className={styles.tableBody}>
          {standings.slice(0, 8).map((row, index) => {
            const portrait = portraits[row.id];
            return (
              <div className={`${styles.tableRow} ${row.id === myId ? styles.me : ""}`} key={row.id}>
                <span className={styles.position}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.tablePlayer}>
                  <span className={styles.tableAvatar}>{portrait ? <img src={portrait} alt="" onError={() => clearPortrait(row.id)} /> : row.name.slice(0, 1).toUpperCase()}</span>
                  <strong>{row.name}</strong>
                </span>
                <span>{row.wins}</span><span>{row.oneSided}</span><span>{row.zeroZeroCount}</span><b>{row.points}</b>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.closingBand}>
        <div><span>THE BOUNCE</span><strong>BTTS LEAGUE · EST. 2024</strong></div>
        <button type="button" onClick={() => setView("history")}>League History <span>→</span></button>
      </section>
    </main>
  );
}
