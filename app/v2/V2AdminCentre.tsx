"use client";

import styles from "./V2AdminCentre.module.css";

type Gameweek = { id: string; number: number; status: "open" | "locked" | "complete"; opens_at: string | null; locks_at: string };
type Profile = { id: string; display_name: string; active: boolean; role: string };
type Fixture = { id: string; status: string; is_eligible: boolean; kickoff_at: string };
type Prediction = { id: string; member_id: string };

type Props = {
  seasonLabel: string;
  gameweek: Gameweek | null;
  profiles: Profile[];
  fixtures: Fixture[];
  predictions: Prediction[];
  alertsCount: number;
  fixturesReady?: boolean;
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

export default function V2AdminCentre({ seasonLabel, gameweek, profiles, fixtures, predictions, alertsCount, fixturesReady = true }: Props) {
  const activeMembers = profiles.filter((row) => row.active && row.role !== "guest");
  const eligibleFixtures = fixtures.filter((row) => row.is_eligible).length;
  const submitted = predictions.length;
  const outstanding = Math.max(0, activeMembers.length - submitted);
  const healthy = fixturesReady && alertsCount === 0 && Boolean(gameweek) && eligibleFixtures > 0;
  const systemState = !fixturesReady ? "CHECKING" : healthy ? "READY" : alertsCount ? "ATTENTION" : "CHECK";
  const systemDetail = !fixturesReady
    ? "Confirming fixture cover for this gameweek"
    : alertsCount
      ? `${alertsCount} unresolved alert${alertsCount === 1 ? "" : "s"}`
      : "No unresolved provider or gameweek alerts";

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span>LEAGUE CONTROL · {seasonLabel}</span>
          <h1>Run the week without fighting the interface.</h1>
          <p>Routine league operations first. Advanced intervention stays available, but out of the way until it is needed.</p>
        </div>
        <div className={styles.statusSignal}>
          <span>SYSTEM STATE</span>
          <strong>{systemState}</strong>
          <small>{systemDetail}</small>
        </div>
      </header>

      <section className={styles.commandStrip}>
        <div><span>GAMEWEEK</span><strong>{gameweek ? `GW ${gameweek.number}` : "—"}</strong><small>{gameweek?.status ?? "No active week"}</small></div>
        <div><span>SUBMISSIONS</span><strong>{submitted}/{activeMembers.length}</strong><small>{outstanding ? `${outstanding} still to pick` : "Everyone is in"}</small></div>
        <div><span>ELIGIBLE FIXTURES</span><strong>{fixturesReady ? eligibleFixtures : "…"}</strong><small>{fixturesReady ? `${fixtures.length} loaded` : "Checking fixture browser"}</small></div>
        <div><span>ALERTS</span><strong>{alertsCount}</strong><small>{alertsCount ? "Review required" : "Clear"}</small></div>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}><div><span>THIS GAMEWEEK</span><h2>Schedule & selection</h2></div><a href="/admin-controls">Open full controls →</a></header>
        <div className={styles.operationLedger}>
          <div className={styles.operation}><div><span>Opening</span><strong>{formatDate(gameweek?.opens_at ?? null)}</strong></div><p>Controls when members can begin selecting.</p><a href="/admin-controls">Edit</a></div>
          <div className={styles.operation}><div><span>Deadline</span><strong>{formatDate(gameweek?.locks_at ?? null)}</strong></div><p>Locks member changes and protects the weekly round.</p><a href="/admin-controls">Edit</a></div>
          <div className={styles.operation}><div><span>Move gameweek</span><strong>Shift this round</strong></div><p>Move the selected normal gameweek and carry later scheduled weeks with it.</p><a href="/admin-controls">Manage</a></div>
          <div className={styles.operation}><div><span>One-off round</span><strong>Midweek / custom</strong></div><p>Create an exceptional round without disturbing normal rules.</p><a href="/admin-controls">Manage</a></div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.darkSection}`}>
        <header className={styles.sectionHeader}><div><span>LEAGUE OPERATIONS</span><h2>People, fixtures, results.</h2></div></header>
        <div className={styles.threeColumns}>
          <article>
            <span>MEMBERS</span>
            <strong>{activeMembers.length}</strong>
            <p>Create, activate and manage league members without a fixed twelve-person ceiling.</p>
            <a href="/admin-controls">Manage users →</a>
          </article>
          <article>
            <span>FIXTURE DATA</span>
            <strong>{fixturesReady ? fixtures.length : "…"}</strong>
            <p>Review eligible matches, provider imports and odds without mixing routine work with recovery tools.</p>
            <a href="/admin-controls">Manage fixtures →</a>
          </article>
          <article>
            <span>RESULTS</span>
            <strong>{fixturesReady ? fixtures.filter((row) => ["FT", "AET", "PEN"].includes(row.status)).length : "…"}</strong>
            <p>Check settlement, scoring and manual corrections from one controlled workflow.</p>
            <a href="/admin-controls">Manage results →</a>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}><div><span>ATTENTION QUEUE</span><h2>Only what needs you.</h2></div></header>
        <div className={styles.attentionRow}>
          <div className={styles.attentionNumber}>{alertsCount || outstanding}</div>
          <div>
            <strong>{alertsCount ? "League alerts need review" : outstanding ? `${outstanding} member${outstanding === 1 ? "" : "s"} still to submit` : "Nothing urgent"}</strong>
            <p>{alertsCount ? "Open the alert feed and deal with the underlying fixture or provider issue." : outstanding ? "The gameweek is healthy; the remaining action is member submission." : "The gameweek has fixture cover, no open alerts and all current submissions are in."}</p>
          </div>
          <a href={alertsCount ? "/?view=alerts" : "/admin-controls"}>{alertsCount ? "Review alerts" : "Open controls"} →</a>
        </div>
      </section>

      <section className={styles.advancedBand}>
        <div><span>ADVANCED</span><h2>Power when you need it. Quiet when you don’t.</h2><p>Provider recovery, overrides, season operations and exceptional fixes remain available behind the main admin flow.</p></div>
        <a href="/admin-controls">Advanced controls →</a>
      </section>
    </main>
  );
}