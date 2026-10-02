"use client";

import { useState } from "react";
import styles from "../V2AdminCentre.module.css";
import type { AdminProps } from "./types";
import { token } from "./helpers";

export default function V2AdminSeasons({ seasonLabel, entryFee, profiles, onReloadAll }: AdminProps) {
  const [label, setLabel] = useState("");
  const [gameweeks, setGameweeks] = useState("38");
  const [firstFixtureDate, setFirstFixtureDate] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const active = profiles.filter((row) => row.active && row.role !== "guest").length;

  async function create() {
    if (!label.trim()) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/seasons", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ label: label.trim(), gameweeks: Number(gameweeks), firstFixtureDate: firstFixtureDate || null }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Could not create season.");
      setMessage(`Season ${label.trim()} created with ${gameweeks} gameweeks and ${payload.copiedUsers ?? 0} members copied.`); setLabel(""); onReloadAll();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create season."); } finally { setBusy(false); }
  }

  return <section className={styles.section}>
    <header className={styles.sectionHeading}><span>CURRENT SEASON</span><h2>Seasons</h2></header>
    <div className={styles.paymentStrip}><div><span>ACTIVE</span><strong>{seasonLabel}</strong></div><div><span>ENTRY FEE</span><strong>£{entryFee.toFixed(0)}</strong></div><div><span>MEMBERS</span><strong>{active}</strong></div></div>
    <div className={styles.subsection}><header><span>NEW SEASON</span><h3>Create schedule</h3></header><div className={styles.formLedger}><label>Season name<input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="2027/28" /></label><label>Planned gameweeks<input type="number" min="1" max="60" value={gameweeks} onChange={(e) => setGameweeks(e.target.value)} /></label><label>First fixture date<input type="date" value={firstFixtureDate} onChange={(e) => setFirstFixtureDate(e.target.value)} /></label></div><button type="button" className={styles.primaryButton} disabled={busy || !label.trim()} onClick={() => void create()}>{busy ? "Creating…" : "Create new season"}</button><p className={styles.sectionCopy}>The canonical season calendar creates normal Saturday rounds with their opening and deadline schedule, and copies active named members into the new season.</p></div>
    {message ? <div className={styles.feedback}>{message}</div> : null}
  </section>;
}
