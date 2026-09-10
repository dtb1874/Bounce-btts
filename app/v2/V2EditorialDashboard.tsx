"use client";

import { useMemo } from "react";
import styles from "./V2EditorialDashboard.module.css";

type Role = "ultimate_admin" | "admin" | "member" | "guest";
type View = "dashboard" | "pick" | "fixtures" | "table" | "results" | "history" | "players" | "about" | "alerts" | "admin";
type Profile = { id: string; display_name: string; role: Role; active: boolean };
type Gameweek = { id: string; number: number; status: "open" | "locked" | "complete"; opens_at: string | null; locks_at: string };
type Fixture = { id: string; gameweek_id: string | null; competition: string; home_team: string; away_team: string; kickoff_at: string; status: string; live_elapsed?: number | null; home_score: number | null; away_score: number | null; odds_fractional: string | null };
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

const liveStatuses = new Set(["1H", "2H", "HT", "ET", "P", "BT", "INT", "SUSP", "LIVE"]);
const finishedStatuses = new Set(["FT", "AET", "PEN"]);

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

function outcome(fixture: Fixture | undefined, prediction: Prediction | undefined) {
  if (!prediction) return { label: "NO PICK", detail: "Selection outstanding", tone: "quiet" };
  if (!fixture) return { label: "WAITING", detail: "Fixture data pending", tone: "quiet" };
  const home = fixture.home_score ?? 0;
  const away = fixture.away_score ?? 0;
  if (home > 0 && away > 0) return { label: "LANDED", detail: "Both teams scored", tone: "positive" };
  if (finishedStatuses.has(fixture.status)) return { label: "MISSED", detail: "Finished without BTTS", tone: "negative" };
  if (liveStatuses.has(fixture.status) || Date.now() >= new Date(fixture.kickoff_at).getTime()) {
    if (home > 0 && away === 0) return { label: `NEEDS ${fixture.away_team.toUpperCase()}`, detail: `${home}–${away} · ${fixture.live_elapsed ?? "LIVE"}`, tone: "live" };
    if (away > 0 && home === 0) return { label: `NEEDS ${fixture.home_team.toUpperCase()}`, detail: `${home}–${away} · ${fixture.live_elapsed ?? "LIVE"}`, tone: "live" };
    return { label: "LIVE", detail: `${home}–${away} · needs both teams`, tone: "live" };
  }
  return { label: "WAITING", detail: formatDate(fixture.kickoff_at), tone: "quiet" };
}

export default function V2EditorialDashboard({ gameweek, profiles, fixtures, predictions, standings, seasonLabel, entryFee, isOpen, myId, setView }: Props) {
  const myPrediction = predictions.find((row) => row.member_id === myId);
  const myFixture = fixtures.find((row) => row.id === myPrediction?.fixture_id);
  const myStandingIndex = standings.findIndex((row) => row.id === myId);
  const myStanding = myStandingIndex >= 0 ? standings[myStandingIndex] : undefined;
  const leader = standings[0];
  const activeMembers = profiles.filter((row) => row.active && row.role !== "guest");
  const submitted = predictions.length;
  const prizePot = activeMembers.length * entryFee;

  const picks = useMemo(() => activeMembers.map((profile) => {
    const prediction = predictions.find((row) => row.member_id === profile.id);
    const fixture = fixtures.find((row) => row.id === prediction?.fixture_id);
    return { profile, prediction, fixture, state: outcome(fixture, prediction) };
  }), [activeMembers, predictions, fixtures]);

  const landed = picks.filter((row) => row.state.tone === "positive").length;
  const live = picks.filter((row) => row.state.tone === "live").length;
  const missing = Math.max(0, activeMembers.length - submitted);
  const heroTitle = !gameweek
    ? "The league, at a glance."
    : isOpen && !myPrediction
      ? "Your move."
      : isOpen && myPrediction
        ? "You’re in."
        : gameweek.status === "complete"
          ? "Week settled."
          : live > 0
            ? "Matchday is moving."
            : "The picks are locked.";

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroWash} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>BOUNCE BTTS · {seasonLabel}</span>
          <h1>{heroTitle}</h1>
          <p>
            {gameweek ? `Gameweek ${gameweek.number}` : "Season overview"}
            {gameweek?.locks_at ? ` · ${isOpen ? "Picks close" : "Deadline"} ${formatDate(gameweek.locks_at)}` : ""}
          </p>
          {isOpen ? (
            <button className={styles.primaryAction} type="button" onClick={() => setView("pick")}>{myPrediction ? "Change my pick" : "Make my pick"}<span>→</span></button>
          ) : (
            <button className={styles.textAction} type="button" onClick={() => setView("results")}>View all picks <span>→</span></button>
          )}
        </div>

        <div className={styles.selectionFeature}>
          <span className={styles.selectionLabel}>YOUR SELECTION</span>
          {myFixture ? (
            <>
              <div className={styles.fixtureNames}>
                <strong>{myFixture.home_team}</strong>
                <span>v</span>
                <strong>{myFixture.away_team}</strong>
              </div>
              <div className={styles.fixtureMeta}>{myFixture.competition} · {formatDate(myFixture.kickoff_at)}</div>
              <div className={`${styles.outcome} ${styles[outcome(myFixture, myPrediction).tone]}`}>
                <b>{outcome(myFixture, myPrediction).label}</b>
                <span>{outcome(myFixture, myPrediction).detail}</span>
              </div>
            </>
          ) : (
            <div className={styles.noSelection}>
              <strong>{isOpen ? "No pick submitted" : "No selection recorded"}</strong>
              <span>{isOpen ? "Choose one eligible BTTS fixture before the deadline." : "This gameweek has no recorded selection for you."}</span>
            </div>
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
          <div><span>GAMEWEEK PULSE</span><h2>Everyone’s picks</h2></div>
          <div className={styles.sectionAside}>{live ? `${live} live` : landed ? `${landed} landed` : `${submitted} submitted`}</div>
        </header>
        <div className={styles.pickLedger}>
          {picks.map(({ profile, fixture, state }) => (
            <article className={styles.pickRow} key={profile.id}>
              <div className={styles.memberMark}>{profile.display_name.slice(0, 1).toUpperCase()}</div>
              <div className={styles.memberName}><strong>{profile.display_name}</strong><span>{fixture?.competition ?? "Awaiting selection"}</span></div>
              <div className={styles.memberFixture}>{fixture ? <><strong>{fixture.home_team}</strong><span> v </span><strong>{fixture.away_team}</strong></> : <span>—</span>}</div>
              <div className={`${styles.memberState} ${styles[state.tone]}`}><strong>{state.label}</strong><span>{state.detail}</span></div>
            </article>
          ))}
        </div>
        <button className={styles.sectionLink} type="button" onClick={() => setView("results")}>Open the full gameweek view <span>→</span></button>
      </section>

      <section className={`${styles.editorialSection} ${styles.tableSection}`}>
        <header className={styles.sectionHeader}>
          <div><span>THE RACE</span><h2>League standing</h2></div>
          <button className={styles.sectionAsideButton} type="button" onClick={() => setView("table")}>Stat Centre →</button>
        </header>
        <div className={styles.tableHead}><span>Pos</span><span>Player</span><span>W</span><span>0–0</span><span>Pts</span></div>
        <div className={styles.tableBody}>
          {standings.slice(0, 8).map((row, index) => (
            <div className={`${styles.tableRow} ${row.id === myId ? styles.me : ""}`} key={row.id}>
              <span className={styles.position}>{String(index + 1).padStart(2, "0")}</span>
              <strong>{row.name}</strong>
              <span>{row.wins}</span>
              <span>{row.zeroZeroCount}</span>
              <b>{row.points}</b>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.closingBand}>
        <div><span>BOUNCE · EST. 2024</span><h2>Edinburgh built. Matchday driven.</h2></div>
        <button type="button" onClick={() => setView("history")}>League history <span>→</span></button>
      </section>
    </main>
  );
}
