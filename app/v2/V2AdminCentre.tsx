"use client";

import { useMemo, useState } from "react";
import styles from "./V2AdminCentre.module.css";

type Gameweek = { id: string; number: number; status: "open" | "locked" | "complete"; opens_at: string | null; locks_at: string };
type Profile = { id: string; display_name: string; active: boolean; role: string };
type Fixture = { id: string; status: string; is_eligible: boolean; kickoff_at: string; home_team?: string; away_team?: string; competition?: string };
type Prediction = { id: string; member_id: string };
type FixtureState = "loading" | "ready" | "error";
type AdminTab = "overview" | "gameweek" | "selections" | "members" | "fixtures" | "results" | "seasons" | "advanced";

type Props = {
  seasonLabel: string;
  gameweek: Gameweek | null;
  profiles: Profile[];
  fixtures: Fixture[];
  predictions: Prediction[];
  alertsCount: number;
  fixtureState?: FixtureState;
  entryFee: number;
  isUltimate: boolean;
};

function formatDate(value: string | null) {
  if (!value) return "Not set";
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

export default function V2AdminCentre({ seasonLabel, gameweek, profiles, fixtures, predictions, alertsCount, fixtureState = "ready", entryFee, isUltimate }: Props) {
  const [tab, setTab] = useState<AdminTab>("overview");
  const activeMembers = profiles.filter((row) => row.active && row.role !== "guest");
  const eligibleFixtures = fixtures.filter((row) => row.is_eligible).length;
  const finishedFixtures = fixtures.filter((row) => ["FT", "AET", "PEN"].includes(row.status)).length;
  const submittedIds = useMemo(() => new Set(predictions.map((row) => row.member_id)), [predictions]);
  const submitted = predictions.length;
  const outstanding = Math.max(0, activeMembers.length - submitted);
  const fixturesReady = fixtureState === "ready";
  const healthy = fixturesReady && alertsCount === 0 && Boolean(gameweek) && eligibleFixtures > 0;
  const systemState = fixtureState === "loading" ? "CHECKING" : fixtureState === "error" ? "UNAVAILABLE" : healthy ? "READY" : alertsCount ? "ATTENTION" : "CHECK";
  const systemDetail = fixtureState === "loading" ? "Confirming fixture cover" : fixtureState === "error" ? "Fixture browser unavailable" : alertsCount ? `${alertsCount} unresolved alert${alertsCount === 1 ? "" : "s"}` : "No unresolved provider or gameweek alerts";

  const tabs: Array<{ id: AdminTab; label: string; ultimateOnly?: boolean }> = [
    { id: "overview", label: "Overview" },
    { id: "gameweek", label: "Gameweek" },
    { id: "selections", label: "Selections" },
    { id: "members", label: "Members", ultimateOnly: true },
    { id: "fixtures", label: "Fixtures" },
    { id: "results", label: "Results" },
    { id: "seasons", label: "Seasons" },
    { id: "advanced", label: "Advanced" },
  ];

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroTitle}><span>SEASON {seasonLabel}</span><h1>Admin</h1><p>League Management</p></div>
        <div className={styles.statusSignal}><span>SYSTEM STATE</span><strong>{systemState}</strong><small>{systemDetail}</small></div>
      </header>

      <nav className={styles.tabs} aria-label="Admin sections">
        {tabs.filter((item) => !item.ultimateOnly || isUltimate).map((item) => <button type="button" key={item.id} className={tab === item.id ? styles.activeTab : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </nav>

      {tab === "overview" ? (
        <section className={styles.section}>
          <header className={styles.sectionHeading}><span>CURRENT STATUS</span><h2>Overview</h2></header>
          <div className={styles.commandStrip}>
            <div><span>GAMEWEEK</span><strong>{gameweek ? `GW ${gameweek.number}` : "—"}</strong><small>{gameweek?.status ?? "No active week"}</small></div>
            <div><span>SUBMISSIONS</span><strong>{submitted}/{activeMembers.length}</strong><small>{outstanding ? `${outstanding} still to pick` : "Everyone is in"}</small></div>
            <div><span>ELIGIBLE FIXTURES</span><strong>{fixturesReady ? eligibleFixtures : "…"}</strong><small>{fixtureState === "loading" ? "Checking" : fixtureState === "error" ? "Unavailable" : `${fixtures.length} loaded`}</small></div>
            <div><span>ALERTS</span><strong>{alertsCount}</strong><small>{alertsCount ? "Review required" : "Clear"}</small></div>
          </div>
          <div className={styles.attentionRow}>
            <div className={styles.attentionNumber}>{alertsCount || outstanding}</div>
            <div><span>ATTENTION</span><strong>{alertsCount ? "League alerts need review" : outstanding ? `${outstanding} member${outstanding === 1 ? "" : "s"} still to submit` : "Nothing urgent"}</strong><p>{alertsCount ? "Review the alert feed before the next gameweek action." : outstanding ? "Fixture cover is available; member selections are still outstanding." : "Current gameweek checks are clear."}</p></div>
          </div>
        </section>
      ) : null}

      {tab === "gameweek" ? (
        <section className={styles.section}>
          <header className={styles.sectionHeading}><span>GAMEWEEK {gameweek?.number ?? "—"}</span><h2>Gameweek</h2></header>
          <div className={styles.operationLedger}>
            <div className={styles.operation}><div><span>Opening</span><strong>{formatDate(gameweek?.opens_at ?? null)}</strong></div><p>Controls when member selections open.</p></div>
            <div className={styles.operation}><div><span>Deadline</span><strong>{formatDate(gameweek?.locks_at ?? null)}</strong></div><p>Locks member changes for the round.</p></div>
            <div className={styles.operation}><div><span>Move gameweek</span><strong>Shift this round</strong></div><p>Move a normal gameweek and carry later scheduled weeks with it.</p></div>
            <div className={styles.operation}><div><span>One-off round</span><strong>Midweek / custom</strong></div><p>Create an exceptional round using the existing one-off gameweek rules.</p></div>
          </div>
        </section>
      ) : null}

      {tab === "selections" ? (
        <section className={styles.section}>
          <header className={styles.sectionHeading}><span>GAMEWEEK {gameweek?.number ?? "—"}</span><h2>Selections</h2></header>
          <div className={styles.memberLedger}>
            {activeMembers.map((member) => <div key={member.id}><strong>{member.display_name}</strong><span className={submittedIds.has(member.id) ? styles.good : styles.muted}>{submittedIds.has(member.id) ? "SELECTED" : "WAITING PICK"}</span></div>)}
          </div>
        </section>
      ) : null}

      {tab === "members" && isUltimate ? (
        <section className={styles.section}>
          <header className={styles.sectionHeading}><span>LEAGUE MEMBERS</span><h2>Members</h2></header>
          <div className={styles.memberLedger}>{activeMembers.map((member) => <div key={member.id}><strong>{member.display_name}</strong><span>{member.role === "ultimate_admin" ? "ULTIMATE ADMIN" : member.role === "admin" ? "ADMIN" : "MEMBER"}</span></div>)}</div>
        </section>
      ) : null}

      {tab === "fixtures" ? (
        <section className={styles.section}>
          <header className={styles.sectionHeading}><span>GAMEWEEK {gameweek?.number ?? "—"}</span><h2>Fixtures</h2></header>
          <div className={styles.summaryLine}><strong>{fixturesReady ? eligibleFixtures : "…"}</strong><span>eligible fixtures</span><i>·</i><strong>{fixturesReady ? fixtures.length : "…"}</strong><span>loaded</span></div>
          <div className={styles.fixtureLedger}>{fixtures.slice(0, 12).map((fixture) => <div key={fixture.id}><strong>{fixture.home_team && fixture.away_team ? `${fixture.home_team} v ${fixture.away_team}` : "Fixture"}</strong><span>{fixture.competition ?? formatDate(fixture.kickoff_at)}</span><b>{fixture.status}</b></div>)}</div>
        </section>
      ) : null}

      {tab === "results" ? (
        <section className={styles.section}>
          <header className={styles.sectionHeading}><span>GAMEWEEK {gameweek?.number ?? "—"}</span><h2>Results</h2></header>
          <div className={styles.summaryLine}><strong>{fixturesReady ? finishedFixtures : "…"}</strong><span>finished</span><i>·</i><strong>{fixturesReady ? Math.max(0, fixtures.length - finishedFixtures) : "…"}</strong><span>remaining</span></div>
          <p className={styles.sectionCopy}>Result settlement, scoring checks and manual corrections remain part of this section in the full V2 migration.</p>
        </section>
      ) : null}

      {tab === "seasons" ? (
        <section className={styles.section}>
          <header className={styles.sectionHeading}><span>CURRENT SEASON</span><h2>Seasons</h2></header>
          <div className={styles.seasonLine}><div><span>ACTIVE</span><strong>{seasonLabel}</strong></div><div><span>ENTRY FEE</span><strong>£{entryFee.toFixed(0)}</strong></div><div><span>MEMBERS</span><strong>{activeMembers.length}</strong></div></div>
        </section>
      ) : null}

      {tab === "advanced" ? (
        <section className={`${styles.section} ${styles.advancedSection}`}>
          <header className={styles.sectionHeading}><span>ADVANCED ADMINISTRATION</span><h2>Advanced</h2></header>
          <p className={styles.sectionCopy}>Provider recovery, exceptional overrides and specialist maintenance stay separated from everyday league management.</p>
          <a className={styles.advancedLink} href="/admin-controls">Open Advanced Controls →</a>
        </section>
      ) : null}

      <footer className={styles.footer}><span>THE BOUNCE</span><strong>BTTS LEAGUE · ADMIN</strong></footer>
    </main>
  );
}
