"use client";

import { useEffect, useState } from "react";
import styles from "../V2AdminCentre.module.css";
import type { AdminProps, Profile } from "./types";
import { formatDate, token } from "./helpers";

type AlertRow = { id: string; title?: string; message?: string; severity?: string; resolved?: boolean; fixture_id?: string | null; profiles?: { display_name?: string } | null; fixtures?: { home_team?: string; away_team?: string } | null };
type ProviderRun = { status?: string; started_at?: string; requests_used?: number };

type Props = AdminProps & { activeMembers: Profile[] };

export default function V2AdminOverview({ gameweek, activeMembers, fixtures, predictions, alertsCount, fixtureState = "ready", onAlertsChanged }: Props) {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [runs, setRuns] = useState<ProviderRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const eligible = fixtures.filter((row) => row.is_eligible).length;
  const submitted = new Set(predictions.map((row) => row.member_id)).size;
  const outstanding = Math.max(0, activeMembers.length - submitted);

  async function load() {
    setLoading(true);
    try {
      const auth = await token();
      const [a, r] = await Promise.all([
        fetch("/api/admin/alerts", { headers: { authorization: `Bearer ${auth}` }, cache: "no-store" }),
        fetch("/api/admin/provider-sync", { headers: { authorization: `Bearer ${auth}` }, cache: "no-store" }),
      ]);
      const ap = await a.json(); const rp = await r.json();
      if (a.ok) setAlerts(ap.alerts ?? []);
      if (r.ok) setRuns(rp.runs ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function setResolved(alert: AlertRow, resolved: boolean) {
    const response = await fetch("/api/admin/alerts", { method: "PATCH", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id: alert.id, resolved }) });
    if (response.ok) { await load(); await onAlertsChanged?.(); }
  }
  async function bulk(rows: AlertRow[]) {
    if (!rows.length || !window.confirm(`Clear ${rows.length} alert${rows.length === 1 ? "" : "s"}?`)) return;
    const auth = await token();
    await Promise.all(rows.map((row) => fetch("/api/admin/alerts", { method: "PATCH", headers: { "content-type": "application/json", authorization: `Bearer ${auth}` }, body: JSON.stringify({ id: row.id, resolved: true }) })));
    await load(); await onAlertsChanged?.();
  }

  const unresolved = alerts.filter((row) => !row.resolved);
  const visible = alerts.filter((row) => Boolean(row.resolved) === showResolved);
  const run = runs[0];

  return <section className={styles.section}>
    <header className={styles.sectionHeading}><span>CURRENT STATUS</span><h2>Overview</h2></header>
    <div className={styles.commandStrip}>
      <div><span>GAMEWEEK</span><strong>{gameweek ? `GW ${gameweek.number}` : "—"}</strong><small>{gameweek?.status ?? "No active week"}</small></div>
      <div><span>SUBMISSIONS</span><strong>{submitted}/{activeMembers.length}</strong><small>{outstanding ? `${outstanding} still to pick` : "Everyone is in"}</small></div>
      <div><span>ELIGIBLE FIXTURES</span><strong>{fixtureState === "ready" ? eligible : "…"}</strong><small>{fixtureState === "loading" ? "Checking" : fixtureState === "error" ? "Unavailable" : `${fixtures.length} attached`}</small></div>
      <div><span>ALERTS</span><strong>{unresolved.length || alertsCount}</strong><small>{unresolved.length || alertsCount ? "Review required" : "Clear"}</small></div>
    </div>
    {run ? <div className={styles.providerStrip}><div><span>LAST PROVIDER CHECK</span><strong>{String(run.status ?? "—").toUpperCase()}</strong></div><div><span>RUN TIME</span><strong>{formatDate(run.started_at)}</strong></div><div><span>API REQUESTS</span><strong>{run.requests_used ?? 0}</strong></div></div> : null}
    <div className={styles.alertToolbar}><div><button type="button" className={!showResolved ? styles.activeMiniTab : ""} onClick={() => setShowResolved(false)}>Needs attention · {unresolved.length}</button><button type="button" className={showResolved ? styles.activeMiniTab : ""} onClick={() => setShowResolved(true)}>Resolved · {alerts.length - unresolved.length}</button></div>{!showResolved && unresolved.length ? <button type="button" className={styles.secondaryButton} onClick={() => void bulk(unresolved)}>Clear all</button> : null}</div>
    <div className={styles.alertList}>{loading ? <p>Loading alerts…</p> : visible.length ? visible.slice(0, 20).map((alert) => <article key={alert.id}><div><span>{String(alert.severity ?? "warning").toUpperCase()}</span><strong>{alert.title ?? `${alert.fixtures?.home_team ?? "Fixture"} v ${alert.fixtures?.away_team ?? ""}`}</strong>{alert.profiles?.display_name ? <small>Pick belongs to {alert.profiles.display_name}</small> : null}{alert.message ? <p>{alert.message}</p> : null}</div><div className={styles.rowActions}><button type="button" className={styles.secondaryButton} onClick={() => void setResolved(alert, !alert.resolved)}>{alert.resolved ? "Reopen" : "Resolve"}</button>{!alert.resolved && alert.fixture_id ? <button type="button" className={styles.secondaryButton} onClick={() => void bulk(unresolved.filter((row) => row.fixture_id === alert.fixture_id))}>Clear same fixture</button> : null}</div></article>) : <div className={styles.emptyState}>{showResolved ? "No resolved alerts." : "All clear."}</div>}</div>
  </section>;
}
