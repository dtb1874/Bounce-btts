"use client";

import { useState } from "react";
import styles from "./V2AdminCentre.module.css";
import type { AdminProps, AdminTab } from "./admin/types";
import V2AdminOverview from "./admin/V2AdminOverview";
import V2AdminGameweek from "./admin/V2AdminGameweek";
import V2AdminSelections from "./admin/V2AdminSelections";
import V2AdminMembers from "./admin/V2AdminMembers";
import V2AdminFixtures from "./admin/V2AdminFixtures";
import V2AdminResults from "./admin/V2AdminResults";
import V2AdminSeasons from "./admin/V2AdminSeasons";

export default function V2AdminCentre(props: AdminProps) {
  const { seasonLabel, gameweek, profiles, fixtures, predictions, alertsCount, fixtureState = "ready", entryFee, isUltimate } = props;
  const [tab, setTab] = useState<AdminTab>("overview");
  const activeMembers = profiles.filter((row) => row.active && row.role !== "guest");
  const eligibleFixtures = fixtures.filter((row) => row.is_eligible).length;
  const healthy = fixtureState === "ready" && alertsCount === 0 && Boolean(gameweek) && eligibleFixtures > 0;
  const systemState = fixtureState === "loading" ? "CHECKING" : fixtureState === "error" ? "UNAVAILABLE" : healthy ? "READY" : alertsCount ? "ATTENTION" : "CHECK";
  const systemDetail = fixtureState === "loading" ? "Confirming fixture cover" : fixtureState === "error" ? "Fixture data unavailable" : alertsCount ? `${alertsCount} unresolved alert${alertsCount === 1 ? "" : "s"}` : "No unresolved provider or gameweek alerts";
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

  return <main className={styles.page}>
    <header className={styles.hero}>
      <div className={styles.heroTitle}><span>SEASON {seasonLabel}</span><h1>Admin</h1><p>League Management</p></div>
      <div className={styles.statusSignal}><span>SYSTEM STATE</span><strong>{systemState}</strong><small>{systemDetail}</small></div>
    </header>
    <nav className={styles.tabs} aria-label="Admin sections">
      {tabs.filter((item) => !item.ultimateOnly || isUltimate).map((item) => <button type="button" key={item.id} className={tab === item.id ? styles.activeTab : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}
    </nav>

    {tab === "overview" ? <V2AdminOverview {...props} activeMembers={activeMembers} /> : null}
    {tab === "gameweek" ? <V2AdminGameweek {...props} /> : null}
    {tab === "selections" ? <V2AdminSelections {...props} /> : null}
    {tab === "members" && isUltimate ? <V2AdminMembers entryFee={entryFee} onReloadAll={props.onReloadAll} onEmulate={props.onEmulate} /> : null}
    {tab === "fixtures" ? <V2AdminFixtures {...props} /> : null}
    {tab === "results" ? <V2AdminResults {...props} /> : null}
    {tab === "seasons" ? <V2AdminSeasons {...props} /> : null}
    {tab === "advanced" ? <section className={`${styles.section} ${styles.advancedSection}`}><header className={styles.sectionHeading}><span>ADVANCED ADMINISTRATION</span><h2>Advanced</h2></header><div className={styles.advancedLedger}><article><div><span>ULTIMATE ADMIN</span><strong>Advanced Controls</strong><p>The dedicated safety screen remains available for specialist controls while V2 keeps routine league management here.</p></div>{isUltimate ? <a className={styles.advancedLink} href="/admin-controls">Open Advanced Controls →</a> : null}</article><article><div><span>RULE OWNERSHIP</span><strong>Canonical league behaviour</strong><p>V2 Admin uses the existing secured APIs and canonical gameweek/scoring rules. No duplicate league logic is introduced.</p></div></article></div></section> : null}
  </main>;
}
