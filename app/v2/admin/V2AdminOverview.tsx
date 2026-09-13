"use client";

import { useEffect, useState } from "react";
import overviewStyles from "./V2AdminOverview.module.css";
import type { AdminProps, Profile } from "./types";
import { formatDate, token } from "./helpers";

type AlertFixtureState = { kickoff_at?: string; status?: string; home_team?: string; away_team?: string; is_eligible?: boolean };
type AlertRow = {
  id: string;
  alert_type?: string;
  title?: string;
  message?: string;
  severity?: string;
  resolved?: boolean;
  fixture_id?: string | null;
  profiles?: { display_name?: string } | null;
  fixtures?: { home_team?: string; away_team?: string; kickoff_at?: string; status?: string } | null;
  details?: { before?: AlertFixtureState; after?: AlertFixtureState } | null;
};
type ProviderRun = { status?: string; started_at?: string; requests_used?: number };

type Props = AdminProps & { activeMembers: Profile[] };

function sameInstant(left: unknown, right: unknown) {
  const leftMs = Date.parse(String(left ?? ""));
  const rightMs = Date.parse(String(right ?? ""));
  return Number.isFinite(leftMs) && Number.isFinite(rightMs) && leftMs === rightMs;
}

function alertMessage(alert: AlertRow) {
  const before = alert.details?.before;
  const after = alert.details?.after;
  if (alert.alert_type === "fixture_change_affecting_pick" && before && after) {
    const changes: string[] = [];
    if (before.kickoff_at && after.kickoff_at && !sameInstant(before.kickoff_at, after.kickoff_at)) {
      changes.push(`Kick-off moved: ${formatDate(before.kickoff_at)} → ${formatDate(after.kickoff_at)}`);
    }
    if (before.status !== after.status) changes.push(`Status: ${before.status ?? "—"} → ${after.status ?? "—"}`);
    if (before.home_team !== after.home_team || before.away_team !== after.away_team) changes.push("Fixture teams changed");
    if (changes.length) return changes.join(" · ");
  }

  return String(alert.message ?? "").replace(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})/g,
    (value) => formatDate(value),
  );
}

export default function V2AdminOverview({ gameweek, activeMembers, fixtures, predictions, alertsCount, fixtureState = "ready", onAlertsChanged }: Props) {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [runs, setRuns] = useState<ProviderRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [showProvider, setShowProvider] = useState(false);
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
  const visibleAlertCount = unresolved.length || alertsCount;

  return <section className={overviewStyles.overview}>
    <header className={overviewStyles.heading}><span>LEAGUE CONTROL ROOM</span><h2>Overview</h2></header>

    <div className={overviewStyles.statusBar}>
      <div><span>GAMEWEEK</span><strong>{gameweek ? `GW ${gameweek.number}` : "—"}</strong><small>{gameweek?.status ?? "No active week"}</small></div>
      <div><span>SUBMISSIONS</span><strong>{submitted}/{activeMembers.length}</strong><small>{outstanding ? `${outstanding} still to pick` : "Everyone is in"}</small></div>
      <div><span>FIXTURE COVER</span><strong>{fixtureState === "ready" ? eligible : "…"}</strong><small>{fixtureState === "loading" ? "Checking provider cover" : fixtureState === "error" ? "Fixture data unavailable" : `${fixtures.length} attached`}</small></div>
      <div><span>ATTENTION</span><strong className={visibleAlertCount ? overviewStyles.attentionState : overviewStyles.clearState}>{visibleAlertCount ? `${visibleAlertCount} alert${visibleAlertCount === 1 ? "" : "s"}` : "All clear"}</strong><small>{visibleAlertCount ? "Review below" : "No unresolved provider or gameweek alerts"}</small></div>
    </div>

    {run ? <>
      <button type="button" className={overviewStyles.providerToggle} onClick={() => setShowProvider((value) => !value)} aria-expanded={showProvider}>{showProvider ? "Hide provider details" : "Provider details"}</button>
      {showProvider ? <div className={overviewStyles.providerDetails}>
        <div><span>LAST CHECK</span><strong>{String(run.status ?? "—").toUpperCase()}</strong></div>
        <div><span>RUN TIME</span><strong>{formatDate(run.started_at)}</strong></div>
        <div><span>API REQUESTS</span><strong>{run.requests_used ?? 0}</strong></div>
      </div> : null}
    </> : null}

    <div className={overviewStyles.attentionBlock}>
      <header className={overviewStyles.attentionHeading}>
        <div><span>{visibleAlertCount ? "ACTION REQUIRED" : "SYSTEM HEALTH"}</span><h3>{visibleAlertCount ? "Attention Queue" : "All systems clear"}</h3></div>
        <div className={overviewStyles.attentionTabs}>
          <button type="button" className={!showResolved ? overviewStyles.active : ""} onClick={() => setShowResolved(false)}>Needs attention · {unresolved.length}</button>
          <button type="button" className={showResolved ? overviewStyles.active : ""} onClick={() => setShowResolved(true)}>Resolved · {alerts.length - unresolved.length}</button>
          {!showResolved && unresolved.length ? <button type="button" className={overviewStyles.clearAll} onClick={() => void bulk(unresolved)}>Clear all</button> : null}
        </div>
      </header>

      <div className={overviewStyles.alertList}>{loading ? <p className={overviewStyles.loading}>Loading alerts…</p> : visible.length ? visible.slice(0, 20).map((alert) => {
        const message = alertMessage(alert);
        return <article key={alert.id}>
          <div className={overviewStyles.alertCopy}><span>{String(alert.severity ?? "warning").toUpperCase()}</span><strong>{alert.title ?? `${alert.fixtures?.home_team ?? "Fixture"} v ${alert.fixtures?.away_team ?? ""}`}</strong>{alert.profiles?.display_name ? <small>Pick belongs to {alert.profiles.display_name}</small> : null}{message ? <p>{message}</p> : null}</div>
          <div className={overviewStyles.actions}><button type="button" onClick={() => void setResolved(alert, !alert.resolved)}>{alert.resolved ? "Reopen" : "Resolve"}</button>{!alert.resolved && alert.fixture_id ? <button type="button" onClick={() => void bulk(unresolved.filter((row) => row.fixture_id === alert.fixture_id))}>Clear same fixture</button> : null}</div>
        </article>;
      }) : <div className={overviewStyles.empty}><strong>{showResolved ? "No resolved alerts" : "All clear"}</strong><p>{showResolved ? "Resolved items will appear here." : "No unresolved provider or gameweek alerts need attention."}</p></div>}</div>
    </div>
  </section>;
}
