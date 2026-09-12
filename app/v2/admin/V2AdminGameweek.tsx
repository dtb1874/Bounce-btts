"use client";

import { useEffect, useState } from "react";
import { fixtureDateForGameweek, selectionRule } from "@/lib/gameweek-rules";
import styles from "../V2AdminCentre.module.css";
import type { AdminProps } from "./types";
import { calendarDayDifference, formatDate, localInput, shiftLondonInstant, token, weekdayForDate, weekdays } from "./helpers";

export default function V2AdminGameweek({ gameweek, gameweeks, isUltimate, onReloadAll }: AdminProps) {
  const [status, setStatus] = useState<"open" | "locked" | "complete">("open");
  const [opensAt, setOpensAt] = useState("");
  const [deadline, setDeadline] = useState("");
  const [mode, setMode] = useState<"exact_time" | "any_kickoff">("exact_time");
  const [weekday, setWeekday] = useState(6);
  const [fromTime, setFromTime] = useState("15:00");
  const [toTime, setToTime] = useState("15:00");
  const [moveDate, setMoveDate] = useState("");
  const [oneOffOpen, setOneOffOpen] = useState("");
  const [oneOffDeadline, setOneOffDeadline] = useState("");
  const [oneOffWeekday, setOneOffWeekday] = useState(3);
  const [oneOffFrom, setOneOffFrom] = useState("19:45");
  const [oneOffTo, setOneOffTo] = useState("20:00");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const rule = gameweek ? selectionRule(gameweek) : { mode: "exact_time" as const, weekday: 6, from: "15:00", to: "15:00" };
    setStatus(gameweek?.status ?? "open");
    setOpensAt(localInput(gameweek?.opens_at));
    setDeadline(localInput(gameweek?.locks_at));
    setMode(rule.mode); setWeekday(rule.weekday); setFromTime(rule.from); setToTime(rule.to);
    setMoveDate(gameweek ? fixtureDateForGameweek(gameweek) : "");
    setMessage("");
  }, [gameweek?.id]);

  if (!gameweek) return <section className={styles.section}><header className={styles.sectionHeading}><span>GAMEWEEK</span><h2>Gameweek</h2></header><p>No gameweek is selected.</p></section>;
  const selectedGameweek = gameweek;

  async function patch(body: Record<string, unknown>) {
    const response = await fetch("/api/admin/gameweek", { method: "PATCH", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Could not update gameweek.");
  }
  async function save() {
    if (!deadline) return setMessage("Choose a deadline.");
    setBusy("save"); setMessage("");
    try {
      await patch({ id: selectedGameweek.id, status, opensAt: opensAt ? new Date(opensAt).toISOString() : null, locksAt: new Date(deadline).toISOString(), selectionRuleMode: mode, selectionWeekday: weekday, selectionTimeFrom: fromTime, selectionTimeTo: toTime, selectionTime: fromTime, oneOffRule: Boolean(selectedGameweek.one_off_rule) });
      setMessage(`GW ${selectedGameweek.number} settings saved.`); onReloadAll();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save gameweek."); } finally { setBusy(""); }
  }
  async function move() {
    const current = fixtureDateForGameweek(selectedGameweek);
    if (!moveDate || moveDate === current) return;
    const expected = selectionRule(selectedGameweek).weekday;
    if (weekdayForDate(moveDate) !== expected) return setMessage(`Choose a ${weekdays.find(([value]) => value === expected)?.[1] ?? "matching weekday"} for a simple move.`);
    const days = calendarDayDifference(current, moveDate);
    if (!days) return;
    if (!window.confirm(`Move GW${selectedGameweek.number} by ${days} day${Math.abs(days) === 1 ? "" : "s"}? Later normal gameweeks will shift by the same amount. Existing IDs, fixtures, picks and results are preserved.`)) return;
    setBusy("move"); setMessage("");
    try {
      await patch({ id: selectedGameweek.id, status: selectedGameweek.status, opensAt: shiftLondonInstant(selectedGameweek.opens_at, days), locksAt: shiftLondonInstant(selectedGameweek.locks_at, days), selectionRuleMode: selectedGameweek.selection_rule_mode ?? "exact_time", selectionWeekday: expected, selectionTimeFrom: selectedGameweek.selection_time_from ?? selectedGameweek.selection_time ?? "15:00", selectionTimeTo: selectedGameweek.selection_time_to ?? selectedGameweek.selection_time ?? "15:00", selectionTime: selectedGameweek.selection_time_from ?? selectedGameweek.selection_time ?? "15:00", oneOffRule: false });
      setMessage(`GW${selectedGameweek.number} moved.`); onReloadAll();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not move gameweek."); } finally { setBusy(""); }
  }
  async function insertOneOff() {
    if (!oneOffOpen || !oneOffDeadline) return setMessage("Choose opening and deadline times for the one-off gameweek.");
    if (oneOffFrom > oneOffTo) return setMessage("Kick-off From cannot be later than To.");
    if (!window.confirm(`Insert a one-off gameweek after GW${selectedGameweek.number}? Later rounds keep their dates and data and move up one number.`)) return;
    setBusy("oneoff"); setMessage("");
    try {
      const response = await fetch("/api/admin/gameweek", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ insertAfterGameweekId: selectedGameweek.id, opensAt: new Date(oneOffOpen).toISOString(), locksAt: new Date(oneOffDeadline).toISOString(), selectionRuleMode: "exact_time", selectionWeekday: oneOffWeekday, selectionTimeFrom: oneOffFrom, selectionTimeTo: oneOffTo, selectionTime: oneOffFrom }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Could not insert one-off gameweek.");
      setMessage(`One-off GW${payload.gameweek?.number ?? selectedGameweek.number + 1} inserted.`); onReloadAll();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not insert one-off gameweek."); } finally { setBusy(""); }
  }
  async function remove() {
    if (!window.confirm(`Remove GW${selectedGameweek.number}? This only succeeds before it opens and when it has no selections or score adjustments. Later gameweeks will renumber.`)) return;
    setBusy("remove"); setMessage("");
    try {
      const response = await fetch("/api/admin/gameweek", { method: "DELETE", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id: selectedGameweek.id }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Could not remove gameweek."); onReloadAll();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not remove gameweek."); } finally { setBusy(""); }
  }

  return <section className={styles.section}>
    <header className={styles.sectionHeading}><span>GAMEWEEK {selectedGameweek.number}</span><h2>Gameweek</h2></header>
    <div className={styles.formLedger}>
      <label>Status<select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="open">Open</option><option value="locked">Locked</option><option value="complete">Complete</option></select></label>
      <label>Selections open<input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} /></label>
      <label>Deadline<input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>
      <label>Eligible fixture day<select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>{weekdays.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Fixture rule<select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}><option value="exact_time">Kick-off time/window</option><option value="any_kickoff">Any UK kick-off that day</option></select></label>
      {mode === "exact_time" ? <><label>Kick-offs from<input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} /></label><label>Kick-offs to<input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} /></label></> : null}
    </div>
    <div className={styles.actionBar}><button className={styles.primaryButton} type="button" disabled={Boolean(busy)} onClick={() => void save()}>{busy === "save" ? "Saving…" : `Save GW ${selectedGameweek.number} settings`}</button></div>
    {isUltimate ? <div className={styles.advancedLedger}>
      <article><div><span>MOVE GAMEWEEK DATE</span><strong>{fixtureDateForGameweek(selectedGameweek)}</strong><p>Move this normal round and carry later normal rounds with it.</p></div><div className={styles.inlineControls}><input aria-label="New gameweek date" type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} /><button className={styles.secondaryButton} type="button" disabled={Boolean(busy) || Boolean(selectedGameweek.one_off_rule)} onClick={() => void move()}>{busy === "move" ? "Moving…" : "Move gameweek"}</button></div></article>
      <article><div><span>ONE-OFF / MIDWEEK</span><strong>Insert after GW {selectedGameweek.number}</strong><p>Existing later gameweeks keep their dates, fixtures and data and are renumbered.</p></div><div className={styles.compactForm}><label>Opens<input type="datetime-local" value={oneOffOpen} onChange={(e) => setOneOffOpen(e.target.value)} /></label><label>Deadline<input type="datetime-local" value={oneOffDeadline} onChange={(e) => setOneOffDeadline(e.target.value)} /></label><label>Fixture day<select value={oneOffWeekday} onChange={(e) => setOneOffWeekday(Number(e.target.value))}>{weekdays.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>From<input type="time" value={oneOffFrom} onChange={(e) => setOneOffFrom(e.target.value)} /></label><label>To<input type="time" value={oneOffTo} onChange={(e) => setOneOffTo(e.target.value)} /></label><button className={styles.secondaryButton} type="button" disabled={Boolean(busy)} onClick={() => void insertOneOff()}>{busy === "oneoff" ? "Inserting…" : "Insert one-off"}</button></div></article>
      <article className={styles.dangerRow}><div><span>REMOVE FUTURE GAMEWEEK</span><strong>GW {selectedGameweek.number}</strong><p>Available only before opening and only when the round has no selections or score adjustments.</p></div><button className={styles.dangerButton} type="button" disabled={Boolean(busy)} onClick={() => void remove()}>{busy === "remove" ? "Removing…" : `Remove GW ${selectedGameweek.number}`}</button></article>
    </div> : null}
    {message ? <div className={styles.feedback}>{message}</div> : null}
    <div className={styles.scheduleStrip}>{gameweeks.filter((row) => Math.abs(row.number - selectedGameweek.number) <= 2).map((row) => <div key={row.id}><strong>GW {row.number}{row.one_off_rule ? " · ONE-OFF" : ""}</strong><span>{formatDate(row.locks_at)}</span></div>)}</div>
  </section>;
}
