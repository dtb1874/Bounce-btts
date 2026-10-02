"use client";

import { useEffect, useState } from "react";
import styles from "../V2AdminCentre.module.css";
import type { AdminProps, Fixture } from "./types";
import { displayFixture, finishedStatuses, token } from "./helpers";

export default function V2AdminResults({ gameweek, fixtures, predictions, onChanged }: AdminProps) {
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { setScores(Object.fromEntries(fixtures.map((fixture) => [fixture.id, { home: fixture.home_score?.toString() ?? "", away: fixture.away_score?.toString() ?? "" }]))); }, [fixtures]);

  async function save(fixture: Fixture, silent = false) {
    const score = scores[fixture.id]; if (!score || score.home === "" || score.away === "") return false;
    const response = await fetch("/api/admin/results", { method: "PATCH", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ fixtureId: fixture.id, homeScore: Number(score.home), awayScore: Number(score.away) }) });
    const payload = await response.json(); if (!silent) setMessage(response.ok ? "Result and points saved." : payload.error ?? "Could not save result."); return response.ok;
  }
  async function recalc() {
    const rows = fixtures.filter((fixture) => predictions.some((prediction) => prediction.fixture_id === fixture.id) && finishedStatuses.has(fixture.status) && fixture.home_score != null && fixture.away_score != null);
    if (!rows.length) return setMessage("No finished selected fixtures to recalculate.");
    if (!window.confirm(`Recalculate points for ${rows.length} finished selected match${rows.length === 1 ? "" : "es"}?`)) return;
    setBusy("recalc"); let ok = 0;
    for (const fixture of rows) if (await save(fixture, true)) ok++;
    setBusy(""); setMessage(`Recalculated ${ok}/${rows.length} finished selected matches.`); await onChanged();
  }

  return <section className={styles.section}>
    <header className={styles.sectionHeading}><span>GAMEWEEK {gameweek?.number ?? "—"}</span><h2>Results</h2></header>
    <div className={styles.actionBar}><button type="button" className={styles.primaryButton} disabled={busy === "recalc"} onClick={() => void recalc()}>{busy === "recalc" ? "Recalculating…" : "Recalculate Gameweek Points"}</button></div>
    <div className={styles.resultLedger}>{fixtures.map((fixture) => { const prediction = predictions.find((row) => row.fixture_id === fixture.id); const warning = finishedStatuses.has(fixture.status) && prediction && prediction.points_awarded == null; return <div key={fixture.id}><div><strong>{displayFixture(fixture)}</strong><small>{fixture.competition ?? "Fixture"}{warning ? " · FINISHED BUT UNSCORED" : ""}</small></div><input aria-label={`${fixture.home_team ?? "Home"} score`} type="number" min="0" value={scores[fixture.id]?.home ?? ""} onChange={(e) => setScores((current) => ({ ...current, [fixture.id]: { ...(current[fixture.id] ?? { home: "", away: "" }), home: e.target.value } }))} /><span>–</span><input aria-label={`${fixture.away_team ?? "Away"} score`} type="number" min="0" value={scores[fixture.id]?.away ?? ""} onChange={(e) => setScores((current) => ({ ...current, [fixture.id]: { ...(current[fixture.id] ?? { home: "", away: "" }), away: e.target.value } }))} /><button type="button" className={styles.secondaryButton} onClick={async () => { setBusy(fixture.id); if (await save(fixture)) await onChanged(); setBusy(""); }}>{busy === fixture.id ? "Saving…" : "Save FT"}</button></div>; })}</div>
    {message ? <div className={styles.feedback}>{message}</div> : null}
  </section>;
}
