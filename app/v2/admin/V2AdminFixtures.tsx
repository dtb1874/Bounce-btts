"use client";

import { FormEvent, useState } from "react";
import styles from "../V2AdminCentre.module.css";
import type { AdminProps, Gameweek } from "./types";
import { displayFixture, fixtureMeta, token } from "./helpers";

export default function V2AdminFixtures({ gameweek, gameweeks, fixtures, onChanged }: AdminProps) {
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ competition: "Scottish Premiership", country: "Scotland", homeTeam: "", awayTeam: "", kickoffLocal: "", oddsFractional: "" });
  const nextGameweek = gameweek ? gameweeks.find((row) => row.number > gameweek.number) ?? null : null;

  async function sync(target: Gameweek | null, mode: "results" | "full") {
    if (!target) return;
    setBusy(`${target.id}-${mode}`); setMessage("");
    try {
      const auth = { authorization: `Bearer ${await token()}` };
      const response = mode === "results"
        ? await fetch(`/api/live-results?gameweekId=${encodeURIComponent(target.id)}`, { headers: auth, cache: "no-store" })
        : await fetch("/api/admin/provider-sync", { method: "POST", headers: { "content-type": "application/json", ...auth }, body: JSON.stringify({ gameweekIds: [target.id], mode }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Refresh failed.");
      setMessage(mode === "results" ? `Live refresh complete · ${payload.updated ?? 0} updated.` : `Full refresh complete · ${payload.fixturesAdded ?? 0} added · ${payload.fixturesUpdated ?? 0} updated · ${payload.oddsUpdated ?? 0} odds.`);
      await onChanged();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Refresh failed."); } finally { setBusy(""); }
  }
  async function add(event: FormEvent) {
    event.preventDefault();
    if (!gameweek || !form.kickoffLocal) return;
    const selectedGameweek = gameweek;
    setBusy("add"); setMessage("");
    try {
      const response = await fetch("/api/admin/fixtures", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ ...form, kickoffAt: new Date(form.kickoffLocal).toISOString(), gameweekId: selectedGameweek.id }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Could not add fixture.");
      setMessage("Fixture added."); setForm((current) => ({ ...current, homeTeam: "", awayTeam: "", kickoffLocal: "", oddsFractional: "" })); await onChanged();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not add fixture."); } finally { setBusy(""); }
  }

  return <section className={styles.section}>
    <header className={styles.sectionHeading}><span>GAMEWEEK {gameweek?.number ?? "—"}</span><h2>Fixtures</h2></header>
    <div className={styles.actionBar}><button className={styles.primaryButton} type="button" disabled={!gameweek || Boolean(busy)} onClick={() => void sync(gameweek, "results")}>{busy.endsWith("-results") ? "Refreshing…" : "Quick live refresh"}</button><button className={styles.secondaryButton} type="button" disabled={!gameweek || Boolean(busy)} onClick={() => void sync(gameweek, "full")}>{busy.endsWith("-full") ? "Refreshing…" : "Full fixture & odds refresh"}</button>{nextGameweek ? <button className={styles.secondaryButton} type="button" disabled={Boolean(busy)} onClick={() => void sync(nextGameweek, "full")}>Full refresh GW {nextGameweek.number}</button> : null}</div>
    <div className={styles.fixtureLedger}>{fixtures.map((fixture) => <div key={fixture.id}><strong>{displayFixture(fixture)}</strong><span>{fixtureMeta(fixture)}</span><b>{fixture.status}</b></div>)}</div>
    <form className={styles.subsection} onSubmit={(event) => void add(event)}><header><span>MANUAL FIXTURE</span><h3>Add fixture</h3></header><div className={styles.formLedger}><label>Competition<input value={form.competition} onChange={(e) => setForm({ ...form, competition: e.target.value })} /></label><label>Country<input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></label><label>Home team<input required value={form.homeTeam} onChange={(e) => setForm({ ...form, homeTeam: e.target.value })} /></label><label>Away team<input required value={form.awayTeam} onChange={(e) => setForm({ ...form, awayTeam: e.target.value })} /></label><label>Kick-off (UK time)<input required type="datetime-local" value={form.kickoffLocal} onChange={(e) => setForm({ ...form, kickoffLocal: e.target.value })} /></label><label>BTTS fractional odds<input value={form.oddsFractional} onChange={(e) => setForm({ ...form, oddsFractional: e.target.value })} placeholder="8/11" /></label></div><button type="submit" className={styles.primaryButton} disabled={!gameweek || busy === "add"}>{busy === "add" ? "Adding…" : "Add fixture manually"}</button></form>
    {message ? <div className={styles.feedback}>{message}</div> : null}
  </section>;
}
