"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../V2AdminCentre.module.css";
import type { AdminProps, Fixture } from "./types";
import { displayFixture, fixtureMeta, token } from "./helpers";

function SearchableFixturePicker({ value, fixtures, disabled, takenBy, onChange }: { value: string; fixtures: Fixture[]; disabled?: boolean; takenBy: (fixtureId: string) => string | null; onChange: (fixtureId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = fixtures.find((row) => row.id === value);
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => fixtures.filter((row) => !q || `${row.home_team ?? ""} ${row.away_team ?? ""} ${row.competition ?? ""} ${row.country ?? ""}`.toLowerCase().includes(q)), [fixtures, q]);
  function choose(id: string) { onChange(id); setOpen(false); setQuery(""); }
  return <div className={`${styles.fixturePicker} ${open ? styles.fixturePickerOpen : ""}`}>
    <button type="button" className={styles.fixturePickerTrigger} disabled={disabled} aria-expanded={open} onClick={() => setOpen((current) => !current)}><span><strong>{displayFixture(selected)}</strong><small>{selected ? fixtureMeta(selected) : "Search team, competition or country"}</small></span><b>⌄</b></button>
    {open ? <div className={styles.fixturePickerMenu}><input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search fixtures…" /><div className={styles.fixturePickerResults}>
      <button type="button" onClick={() => choose("")}><span><strong>No selection</strong><small>Clear this player&apos;s fixture</small></span></button>
      {filtered.map((fixture) => { const owner = takenBy(fixture.id); return <button type="button" key={fixture.id} disabled={Boolean(owner)} onClick={() => choose(fixture.id)}><span><strong>{displayFixture(fixture)}</strong><small>{fixtureMeta(fixture)}</small></span><em>{owner ? `Taken · ${owner}` : fixture.id === value ? "Selected" : "Available"}</em></button>; })}
      {!filtered.length ? <p>No fixtures match “{query}”.</p> : null}
    </div></div> : null}
  </div>;
}

export default function V2AdminSelections({ gameweek, profiles, fixtures, predictions, adjustments, onChanged }: AdminProps) {
  const active = useMemo(() => profiles.filter((row) => row.active && row.role !== "guest").sort((a, b) => (a.slot_number ?? 999) - (b.slot_number ?? 999) || a.display_name.localeCompare(b.display_name)), [profiles]);
  const eligibleFixtures = useMemo(() => fixtures.filter((row) => row.is_eligible).sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at)), [fixtures]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [adjustMember, setAdjustMember] = useState(active[0]?.id ?? "");
  const [adjustPoints, setAdjustPoints] = useState("-1");
  const [adjustReason, setAdjustReason] = useState("Missed selection");
  const loadedGameweek = useRef<string | null>(null);

  useEffect(() => {
    if (loadedGameweek.current === gameweek?.id) return;
    loadedGameweek.current = gameweek?.id ?? null;
    setDraft(Object.fromEntries(active.map((member) => [member.id, predictions.find((row) => row.member_id === member.id)?.fixture_id ?? ""])));
  }, [gameweek?.id, predictions, active]);
  useEffect(() => { if (!active.some((row) => row.id === adjustMember)) setAdjustMember(active[0]?.id ?? ""); }, [active, adjustMember]);

  if (!gameweek) return <section className={styles.section}><header className={styles.sectionHeading}><span>GAMEWEEK</span><h2>Selections</h2></header><p>No gameweek selected.</p></section>;
  const selectedGameweek = gameweek;
  const changed = active.filter((member) => (draft[member.id] ?? "") !== (predictions.find((row) => row.member_id === member.id)?.fixture_id ?? ""));
  const existingAdjustment = adjustments.find((row) => row.gameweek_id === selectedGameweek.id && row.member_id === adjustMember);

  function takenBy(fixtureId: string, memberId: string) { return active.find((row) => row.id !== memberId && draft[row.id] === fixtureId)?.display_name ?? null; }
  function resetDraft() { setDraft(Object.fromEntries(active.map((member) => [member.id, predictions.find((row) => row.member_id === member.id)?.fixture_id ?? ""]))); }

  async function saveAll() {
    if (!changed.length) return;
    const owners = new Map<string, string>();
    for (const [memberId, fixtureId] of Object.entries(draft)) {
      if (!fixtureId) continue;
      if (owners.has(fixtureId) && owners.get(fixtureId) !== memberId) return setMessage("A fixture has been selected for more than one player.");
      owners.set(fixtureId, memberId);
    }
    setBusy(true); setMessage("");
    try {
      const auth = await token();
      for (const member of changed) {
        const old = predictions.find((row) => row.member_id === member.id);
        if (old) {
          const remove = await fetch("/api/admin/predictions", { method: "DELETE", headers: { "content-type": "application/json", authorization: `Bearer ${auth}` }, body: JSON.stringify({ gameweekId: selectedGameweek.id, memberId: member.id }) });
          if (!remove.ok) throw new Error((await remove.json()).error ?? "Could not remove selection.");
        }
        const fixtureId = draft[member.id];
        if (fixtureId) {
          const save = await fetch("/api/admin/predictions", { method: "PUT", headers: { "content-type": "application/json", authorization: `Bearer ${auth}` }, body: JSON.stringify({ gameweekId: selectedGameweek.id, memberId: member.id, fixtureId }) });
          if (!save.ok) throw new Error((await save.json()).error ?? "Could not save selection.");
        }
      }
      setMessage(`${changed.length} selection change${changed.length === 1 ? "" : "s"} saved.`);
      loadedGameweek.current = null;
      await onChanged();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save selections."); } finally { setBusy(false); }
  }
  async function saveAdjustment() {
    if (!adjustMember) return;
    const response = await fetch("/api/admin/adjustments", { method: "PUT", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ gameweekId: selectedGameweek.id, memberId: adjustMember, points: Number(adjustPoints), reason: adjustReason }) });
    const payload = await response.json(); setMessage(response.ok ? "Points adjustment saved." : payload.error ?? "Could not save adjustment."); if (response.ok) await onChanged();
  }
  async function removeAdjustment() {
    if (!adjustMember) return;
    const response = await fetch("/api/admin/adjustments", { method: "DELETE", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ gameweekId: selectedGameweek.id, memberId: adjustMember }) });
    const payload = await response.json(); setMessage(response.ok ? "Points adjustment removed." : payload.error ?? "Could not remove adjustment."); if (response.ok) await onChanged();
  }

  return <section className={styles.section}>
    <header className={styles.sectionHeading}><span>GAMEWEEK {selectedGameweek.number}</span><h2>Selections</h2></header>
    <p className={styles.sectionCopy}>Stage multiple changes, then save them together. A fixture can only belong to one player.</p>
    <div className={styles.selectionLedger}>{active.map((member) => { const currentId = predictions.find((row) => row.member_id === member.id)?.fixture_id ?? ""; const dirty = (draft[member.id] ?? "") !== currentId; return <div key={member.id}><div className={styles.memberIdentity}><span>{member.slot_number ?? ""}</span><strong>{member.display_name}</strong><small>{dirty ? "UNSAVED" : currentId ? "SAVED" : "NO PICK"}</small></div><SearchableFixturePicker value={draft[member.id] ?? ""} fixtures={eligibleFixtures} disabled={busy} takenBy={(fixtureId) => takenBy(fixtureId, member.id)} onChange={(fixtureId) => setDraft((current) => ({ ...current, [member.id]: fixtureId }))} /></div>; })}</div>
    <div className={styles.actionBar}><button type="button" className={styles.secondaryButton} disabled={busy || !changed.length} onClick={resetDraft}>Discard changes</button><button type="button" className={styles.primaryButton} disabled={busy || !changed.length} onClick={() => void saveAll()}>{busy ? "Saving…" : `Save all selections (${changed.length})`}</button></div>
    <div className={styles.subsection}><header><span>MANUAL POINTS</span><h3>Adjustment</h3></header><div className={styles.compactForm}><label>Player<select value={adjustMember} onChange={(e) => setAdjustMember(e.target.value)}>{active.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}</select></label><label>Points<input type="number" step="1" value={adjustPoints} onChange={(e) => setAdjustPoints(e.target.value)} /></label><label>Reason<input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} /></label><button type="button" className={styles.secondaryButton} onClick={() => void saveAdjustment()}>Save adjustment</button>{existingAdjustment ? <button type="button" className={styles.dangerButton} onClick={() => void removeAdjustment()}>Remove adjustment</button> : null}</div>{existingAdjustment ? <small>Existing: {existingAdjustment.points > 0 ? "+" : ""}{existingAdjustment.points} · {existingAdjustment.reason} · {existingAdjustment.source}</small> : null}</div>
    {message ? <div className={styles.feedback}>{message}</div> : null}
  </section>;
}
