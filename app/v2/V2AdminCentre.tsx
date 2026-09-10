"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fixtureDateForGameweek, selectionRule } from "@/lib/gameweek-rules";
import { addUtcCalendarDays, londonLocalToUtc, londonParts } from "@/lib/london-time";
import styles from "./V2AdminCentre.module.css";

type Gameweek = {
  id: string;
  number: number;
  status: "open" | "locked" | "complete";
  opens_at: string | null;
  locks_at: string;
  selection_rule_mode?: "exact_time" | "any_kickoff" | null;
  selection_weekday?: number | null;
  selection_time?: string | null;
  selection_times?: string[] | null;
  selection_time_from?: string | null;
  selection_time_to?: string | null;
  one_off_rule?: boolean | null;
};
type Profile = { id: string; display_name: string; active: boolean; role: string; slot_number?: number | null };
type Fixture = {
  id: string;
  gameweek_id?: string | null;
  status: string;
  is_eligible: boolean;
  kickoff_at: string;
  home_team?: string;
  away_team?: string;
  competition?: string;
  country?: string;
  home_score?: number | null;
  away_score?: number | null;
  odds_fractional?: string | null;
};
type Prediction = { id: string; gameweek_id?: string; member_id: string; fixture_id?: string; points_awarded?: number | null };
type ScoreAdjustment = { id: string; gameweek_id: string; member_id: string; points: number; reason: string; source: "automatic" | "admin" };
type FixtureState = "loading" | "ready" | "error";
type AdminTab = "overview" | "gameweek" | "selections" | "members" | "fixtures" | "results" | "seasons" | "advanced";
type UserRow = {
  id: string;
  username: string;
  display_name: string;
  role: "ultimate_admin" | "admin" | "member" | "guest";
  active: boolean;
  slot_number: number | null;
  password?: string;
  mobile_number?: string;
  rousset_count?: number;
};
type AlertRow = {
  id: string;
  title?: string;
  message?: string;
  severity?: string;
  created_at?: string;
  resolved?: boolean;
  fixture_id?: string | null;
  profiles?: { display_name?: string } | null;
  fixtures?: { home_team?: string; away_team?: string; kickoff_at?: string; status?: string } | null;
};
type ProviderRun = { id?: string; status?: string; started_at?: string; requests_used?: number };

type Props = {
  seasonLabel: string;
  gameweek: Gameweek | null;
  gameweeks: Gameweek[];
  profiles: Profile[];
  fixtures: Fixture[];
  predictions: Prediction[];
  adjustments: ScoreAdjustment[];
  alertsCount: number;
  fixtureState?: FixtureState;
  entryFee: number;
  isUltimate: boolean;
  onChanged: () => void | Promise<void>;
  onReloadAll: () => void;
  onEmulate?: (profileId: string) => void;
  onAlertsChanged?: () => void | Promise<void>;
};

const finishedStatuses = new Set(["FT", "AET", "PEN"]);
const weekdays = [[1, "Monday"], [2, "Tuesday"], [3, "Wednesday"], [4, "Thursday"], [5, "Friday"], [6, "Saturday"], [7, "Sunday"]] as const;

async function token() {
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token ?? "";
}
function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}
function localInput(value: string | null | undefined) {
  if (!value) return "";
  const p = londonParts(new Date(value));
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}T${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}
function displayFixture(fixture: Fixture | undefined) {
  return fixture?.home_team && fixture?.away_team ? `${fixture.home_team} v ${fixture.away_team}` : "No selection";
}
function fixtureMeta(fixture: Fixture) {
  const bits = [fixture.competition, formatDate(fixture.kickoff_at), fixture.odds_fractional ? `${fixture.odds_fractional} BTTS` : null];
  return bits.filter(Boolean).join(" · ");
}
function calendarDayDifference(from: string, to: string) {
  const a = from.split("-").map(Number), b = to.split("-").map(Number);
  if (a.length !== 3 || b.length !== 3 || a.some(Number.isNaN) || b.some(Number.isNaN)) return null;
  return Math.round((Date.UTC(b[0], b[1] - 1, b[2], 12) - Date.UTC(a[0], a[1] - 1, a[2], 12)) / 86_400_000);
}
function shiftLondonInstant(iso: string | null, days: number) {
  if (!iso) return null;
  const parts = londonParts(new Date(iso));
  const shifted = addUtcCalendarDays(parts.year, parts.month, parts.day, days);
  return londonLocalToUtc(shifted.year, shifted.month, shifted.day, parts.hour, parts.minute).toISOString();
}
function weekdayForDate(value: string) {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const day = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12)).getUTCDay();
  return day === 0 ? 7 : day;
}
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function SearchableFixturePicker({ value, fixtures, disabled, takenBy, onChange }: { value: string; fixtures: Fixture[]; disabled?: boolean; takenBy: (fixtureId: string) => string | null; onChange: (fixtureId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = fixtures.find((row) => row.id === value);
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => fixtures.filter((row) => !q || `${row.home_team ?? ""} ${row.away_team ?? ""} ${row.competition ?? ""} ${row.country ?? ""}`.toLowerCase().includes(q)), [fixtures, q]);
  function choose(id: string) { onChange(id); setOpen(false); setQuery(""); }
  return <div className={`${styles.fixturePicker} ${open ? styles.fixturePickerOpen : ""}`}>
    <button type="button" className={styles.fixturePickerTrigger} disabled={disabled} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span><strong>{displayFixture(selected)}</strong><small>{selected ? fixtureMeta(selected) : "Search team, competition or country"}</small></span><b>⌄</b>
    </button>
    {open ? <div className={styles.fixturePickerMenu}>
      <input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search fixtures…" />
      <div className={styles.fixturePickerResults}>
        <button type="button" onClick={() => choose("")}><span><strong>No selection</strong><small>Clear this player&apos;s fixture</small></span></button>
        {filtered.map((fixture) => { const owner = takenBy(fixture.id); return <button type="button" key={fixture.id} disabled={Boolean(owner)} onClick={() => choose(fixture.id)}><span><strong>{displayFixture(fixture)}</strong><small>{fixtureMeta(fixture)}</small></span><em>{owner ? `Taken · ${owner}` : fixture.id === value ? "Selected" : "Available"}</em></button>; })}
        {!filtered.length ? <p>No fixtures match “{query}”.</p> : null}
      </div>
    </div> : null}
  </div>;
}

function OverviewPanel({ gameweek, activeMembers, fixtures, predictions, alertsCount, fixtureState, onAlertsChanged }: { gameweek: Gameweek | null; activeMembers: Profile[]; fixtures: Fixture[]; predictions: Prediction[]; alertsCount: number; fixtureState: FixtureState; onAlertsChanged?: () => void | Promise<void> }) {
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
      const [alertsResponse, runsResponse] = await Promise.all([
        fetch("/api/admin/alerts", { headers: { authorization: `Bearer ${auth}` }, cache: "no-store" }),
        fetch("/api/admin/provider-sync", { headers: { authorization: `Bearer ${auth}` }, cache: "no-store" }),
      ]);
      const alertPayload = await alertsResponse.json();
      const runPayload = await runsResponse.json();
      if (alertsResponse.ok) setAlerts(alertPayload.alerts ?? []);
      if (runsResponse.ok) setRuns(runPayload.runs ?? []);
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
    await Promise.all(rows.map((alert) => fetch("/api/admin/alerts", { method: "PATCH", headers: { "content-type": "application/json", authorization: `Bearer ${auth}` }, body: JSON.stringify({ id: alert.id, resolved: true }) })));
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

function GameweekPanel({ gameweek, gameweeks, isUltimate, onReloadAll }: { gameweek: Gameweek | null; gameweeks: Gameweek[]; isUltimate: boolean; onReloadAll: () => void }) {
  const [status, setStatus] = useState<Gameweek["status"]>("open");
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
    setStatus(gameweek?.status ?? "open"); setOpensAt(localInput(gameweek?.opens_at)); setDeadline(localInput(gameweek?.locks_at)); setMode(rule.mode); setWeekday(rule.weekday); setFromTime(rule.from); setToTime(rule.to);
    setMoveDate(gameweek ? fixtureDateForGameweek(gameweek) : ""); setMessage("");
  }, [gameweek?.id]);
  if (!gameweek) return <section className={styles.section}><header className={styles.sectionHeading}><span>GAMEWEEK</span><h2>Gameweek</h2></header><p>No gameweek is selected.</p></section>;
  async function patch(body: Record<string, unknown>) {
    const response = await fetch("/api/admin/gameweek", { method: "PATCH", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Could not update gameweek.");
    return payload;
  }
  async function save() {
    if (!deadline) return setMessage("Choose a deadline.");
    setBusy("save"); setMessage("");
    try {
      await patch({ id: gameweek.id, status, opensAt: opensAt ? new Date(opensAt).toISOString() : null, locksAt: new Date(deadline).toISOString(), selectionRuleMode: mode, selectionWeekday: weekday, selectionTimeFrom: fromTime, selectionTimeTo: toTime, selectionTime: fromTime, oneOffRule: Boolean(gameweek.one_off_rule) });
      setMessage(`GW ${gameweek.number} settings saved.`); onReloadAll();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save gameweek."); } finally { setBusy(""); }
  }
  async function move() {
    const current = fixtureDateForGameweek(gameweek);
    if (!moveDate || moveDate === current) return;
    const expected = selectionRule(gameweek).weekday;
    if (weekdayForDate(moveDate) !== expected) return setMessage(`Choose a ${weekdays.find(([value]) => value === expected)?.[1] ?? "matching weekday"} for a simple move.`);
    const days = calendarDayDifference(current, moveDate);
    if (!days) return;
    if (!window.confirm(`Move GW${gameweek.number} by ${days} day${Math.abs(days) === 1 ? "" : "s"}? Later normal gameweeks will shift by the same amount. Existing IDs, fixtures, picks and results are preserved.`)) return;
    setBusy("move"); setMessage("");
    try {
      await patch({ id: gameweek.id, status: gameweek.status, opensAt: shiftLondonInstant(gameweek.opens_at, days), locksAt: shiftLondonInstant(gameweek.locks_at, days), selectionRuleMode: gameweek.selection_rule_mode ?? "exact_time", selectionWeekday: expected, selectionTimeFrom: gameweek.selection_time_from ?? gameweek.selection_time ?? "15:00", selectionTimeTo: gameweek.selection_time_to ?? gameweek.selection_time ?? "15:00", selectionTime: gameweek.selection_time_from ?? gameweek.selection_time ?? "15:00", oneOffRule: false });
      setMessage(`GW${gameweek.number} moved.`); onReloadAll();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not move gameweek."); } finally { setBusy(""); }
  }
  async function insertOneOff() {
    if (!oneOffOpen || !oneOffDeadline) return setMessage("Choose opening and deadline times for the one-off gameweek.");
    if (oneOffFrom > oneOffTo) return setMessage("Kick-off From cannot be later than To.");
    if (!window.confirm(`Insert a one-off gameweek after GW${gameweek.number}? Later rounds keep their dates and data and move up one number.`)) return;
    setBusy("oneoff"); setMessage("");
    try {
      const response = await fetch("/api/admin/gameweek", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ insertAfterGameweekId: gameweek.id, opensAt: new Date(oneOffOpen).toISOString(), locksAt: new Date(oneOffDeadline).toISOString(), selectionRuleMode: "exact_time", selectionWeekday: oneOffWeekday, selectionTimeFrom: oneOffFrom, selectionTimeTo: oneOffTo, selectionTime: oneOffFrom }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Could not insert one-off gameweek.");
      setMessage(`One-off GW${payload.gameweek?.number ?? gameweek.number + 1} inserted.`); onReloadAll();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not insert one-off gameweek."); } finally { setBusy(""); }
  }
  async function remove() {
    if (!window.confirm(`Remove GW${gameweek.number}? This only succeeds before it opens and when it has no selections or score adjustments. Later gameweeks will renumber.`)) return;
    setBusy("remove"); setMessage("");
    try {
      const response = await fetch("/api/admin/gameweek", { method: "DELETE", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id: gameweek.id }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Could not remove gameweek.");
      onReloadAll();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not remove gameweek."); } finally { setBusy(""); }
  }
  return <section className={styles.section}>
    <header className={styles.sectionHeading}><span>GAMEWEEK {gameweek.number}</span><h2>Gameweek</h2></header>
    <div className={styles.formLedger}>
      <label>Status<select value={status} onChange={(e) => setStatus(e.target.value as Gameweek["status"])}><option value="open">Open</option><option value="locked">Locked</option><option value="complete">Complete</option></select></label>
      <label>Selections open<input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} /></label>
      <label>Deadline<input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>
      <label>Eligible fixture day<select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>{weekdays.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Fixture rule<select value={mode} onChange={(e) => setMode(e.target.value as "exact_time" | "any_kickoff")}><option value="exact_time">Kick-off time/window</option><option value="any_kickoff">Any UK kick-off that day</option></select></label>
      {mode === "exact_time" ? <><label>Kick-offs from<input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} /></label><label>Kick-offs to<input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} /></label></> : null}
    </div>
    <div className={styles.actionBar}><button className={styles.primaryButton} type="button" disabled={Boolean(busy)} onClick={() => void save()}>{busy === "save" ? "Saving…" : `Save GW ${gameweek.number} settings`}</button></div>
    {isUltimate ? <div className={styles.advancedLedger}>
      <article><div><span>MOVE GAMEWEEK DATE</span><strong>{fixtureDateForGameweek(gameweek)}</strong><p>Move this normal round and shift later normal gameweeks by the same number of days.</p></div><div className={styles.inlineControls}><input aria-label="New gameweek date" type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} /><button className={styles.secondaryButton} type="button" disabled={Boolean(busy) || Boolean(gameweek.one_off_rule)} onClick={() => void move()}>{busy === "move" ? "Moving…" : "Move gameweek"}</button></div></article>
      <article><div><span>ONE-OFF / MIDWEEK</span><strong>Insert after GW {gameweek.number}</strong><p>Existing later gameweeks keep their dates, fixtures and data and are renumbered.</p></div><div className={styles.compactForm}><label>Opens<input type="datetime-local" value={oneOffOpen} onChange={(e) => setOneOffOpen(e.target.value)} /></label><label>Deadline<input type="datetime-local" value={oneOffDeadline} onChange={(e) => setOneOffDeadline(e.target.value)} /></label><label>Fixture day<select value={oneOffWeekday} onChange={(e) => setOneOffWeekday(Number(e.target.value))}>{weekdays.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>From<input type="time" value={oneOffFrom} onChange={(e) => setOneOffFrom(e.target.value)} /></label><label>To<input type="time" value={oneOffTo} onChange={(e) => setOneOffTo(e.target.value)} /></label><button className={styles.secondaryButton} type="button" disabled={Boolean(busy)} onClick={() => void insertOneOff()}>{busy === "oneoff" ? "Inserting…" : "Insert one-off"}</button></div></article>
      <article className={styles.dangerRow}><div><span>REMOVE FUTURE GAMEWEEK</span><strong>GW {gameweek.number}</strong><p>Available only before opening and only when the round has no selections or score adjustments.</p></div><button className={styles.dangerButton} type="button" disabled={Boolean(busy)} onClick={() => void remove()}>{busy === "remove" ? "Removing…" : `Remove GW ${gameweek.number}`}</button></article>
    </div> : null}
    {message ? <div className={styles.feedback}>{message}</div> : null}
    <div className={styles.scheduleStrip}>{gameweeks.filter((row) => Math.abs(row.number - gameweek.number) <= 2).map((row) => <div key={row.id}><strong>GW {row.number}{row.one_off_rule ? " · ONE-OFF" : ""}</strong><span>{formatDate(row.locks_at)}</span></div>)}</div>
  </section>;
}

function SelectionsPanel({ gameweek, profiles, fixtures, predictions, adjustments, onChanged }: { gameweek: Gameweek | null; profiles: Profile[]; fixtures: Fixture[]; predictions: Prediction[]; adjustments: ScoreAdjustment[]; onChanged: () => void | Promise<void> }) {
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
  const changed = active.filter((member) => (draft[member.id] ?? "") !== (predictions.find((row) => row.member_id === member.id)?.fixture_id ?? ""));
  function takenBy(fixtureId: string, memberId: string) { return active.find((row) => row.id !== memberId && draft[row.id] === fixtureId)?.display_name ?? null; }
  async function saveAll() {
    if (!gameweek || !changed.length) return;
    const owners = new Map<string, string>();
    for (const [memberId, fixtureId] of Object.entries(draft)) { if (!fixtureId) continue; if (owners.has(fixtureId) && owners.get(fixtureId) !== memberId) return setMessage("A fixture has been selected for more than one player."); owners.set(fixtureId, memberId); }
    setBusy(true); setMessage("");
    try {
      const auth = await token();
      for (const member of changed) {
        const old = predictions.find((row) => row.member_id === member.id);
        if (old) {
          const remove = await fetch("/api/admin/predictions", { method: "DELETE", headers: { "content-type": "application/json", authorization: `Bearer ${auth}` }, body: JSON.stringify({ gameweekId: gameweek.id, memberId: member.id }) });
          if (!remove.ok) throw new Error((await remove.json()).error ?? "Could not remove selection.");
        }
        const fixtureId = draft[member.id];
        if (fixtureId) {
          const save = await fetch("/api/admin/predictions", { method: "PUT", headers: { "content-type": "application/json", authorization: `Bearer ${auth}` }, body: JSON.stringify({ gameweekId: gameweek.id, memberId: member.id, fixtureId }) });
          if (!save.ok) throw new Error((await save.json()).error ?? "Could not save selection.");
        }
      }
      setMessage(`${changed.length} selection change${changed.length === 1 ? "" : "s"} saved.`); await onChanged(); loadedGameweek.current = null;
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save selections."); } finally { setBusy(false); }
  }
  async function saveAdjustment() {
    if (!gameweek || !adjustMember) return;
    const response = await fetch("/api/admin/adjustments", { method: "PUT", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ gameweekId: gameweek.id, memberId: adjustMember, points: Number(adjustPoints), reason: adjustReason }) });
    const payload = await response.json(); setMessage(response.ok ? "Points adjustment saved." : payload.error ?? "Could not save adjustment."); if (response.ok) await onChanged();
  }
  async function removeAdjustment() {
    if (!gameweek || !adjustMember) return;
    const response = await fetch("/api/admin/adjustments", { method: "DELETE", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ gameweekId: gameweek.id, memberId: adjustMember }) });
    const payload = await response.json(); setMessage(response.ok ? "Points adjustment removed." : payload.error ?? "Could not remove adjustment."); if (response.ok) await onChanged();
  }
  if (!gameweek) return <section className={styles.section}><header className={styles.sectionHeading}><span>GAMEWEEK</span><h2>Selections</h2></header><p>No gameweek selected.</p></section>;
  const existingAdjustment = adjustments.find((row) => row.gameweek_id === gameweek.id && row.member_id === adjustMember);
  return <section className={styles.section}>
    <header className={styles.sectionHeading}><span>GAMEWEEK {gameweek.number}</span><h2>Selections</h2></header>
    <p className={styles.sectionCopy}>Stage multiple changes, then save them together. A fixture can only belong to one player.</p>
    <div className={styles.selectionLedger}>{active.map((member) => { const currentId = predictions.find((row) => row.member_id === member.id)?.fixture_id ?? ""; const dirty = (draft[member.id] ?? "") !== currentId; return <div key={member.id}><div className={styles.memberIdentity}><span>{member.slot_number ?? ""}</span><strong>{member.display_name}</strong><small>{dirty ? "UNSAVED" : currentId ? "SAVED" : "NO PICK"}</small></div><SearchableFixturePicker value={draft[member.id] ?? ""} fixtures={eligibleFixtures} disabled={busy} takenBy={(fixtureId) => takenBy(fixtureId, member.id)} onChange={(fixtureId) => setDraft((value) => ({ ...value, [member.id]: fixtureId }))} /></div>; })}</div>
    <div className={styles.actionBar}><button type="button" className={styles.secondaryButton} disabled={busy || !changed.length} onClick={() => setDraft(Object.fromEntries(active.map((member) => [member.id, predictions.find((row) => row.member_id === member.id)?.fixture_id ?? ""]))) }>Discard changes</button><button type="button" className={styles.primaryButton} disabled={busy || !changed.length} onClick={() => void saveAll()}>{busy ? "Saving…" : `Save all selections (${changed.length})`}</button></div>
    <div className={styles.subsection}><header><span>MANUAL POINTS</span><h3>Adjustment</h3></header><div className={styles.compactForm}><label>Player<select value={adjustMember} onChange={(e) => setAdjustMember(e.target.value)}>{active.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}</select></label><label>Points<input type="number" step="1" value={adjustPoints} onChange={(e) => setAdjustPoints(e.target.value)} /></label><label>Reason<input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} /></label><button type="button" className={styles.secondaryButton} onClick={() => void saveAdjustment()}>Save adjustment</button>{existingAdjustment ? <button type="button" className={styles.dangerButton} onClick={() => void removeAdjustment()}>Remove adjustment</button> : null}</div>{existingAdjustment ? <small>Existing: {existingAdjustment.points > 0 ? "+" : ""}{existingAdjustment.points} · {existingAdjustment.reason} · {existingAdjustment.source}</small> : null}</div>
    {message ? <div className={styles.feedback}>{message}</div> : null}
  </section>;
}

async function makePortrait(file: File, zoom: number, focusX: number, focusY: number) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error("Could not open image.")); img.src = url; });
    const canvas = document.createElement("canvas"); canvas.width = 720; canvas.height = 900;
    const context = canvas.getContext("2d"); if (!context) throw new Error("Could not prepare portrait.");
    const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight) * Math.max(1.1, zoom);
    const sourceWidth = canvas.width / scale, sourceHeight = canvas.height / scale;
    const sx = Math.max(0, image.naturalWidth - sourceWidth) * Math.max(0, Math.min(100, focusX)) / 100;
    const sy = Math.max(0, image.naturalHeight - sourceHeight) * Math.max(0, Math.min(100, focusY)) / 100;
    context.drawImage(image, sx, sy, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not create portrait.")), "image/jpeg", .9));
  } finally { URL.revokeObjectURL(url); }
}

function MembersPanel({ entryFee, onReloadAll, onEmulate }: { entryFee: number; onReloadAll: () => void; onEmulate?: (id: string) => void }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [paid, setPaid] = useState<Record<string, boolean>>({});
  const [seasonId, setSeasonId] = useState("");
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [portraitUrls, setPortraitUrls] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [zoom, setZoom] = useState<Record<string, number>>({});
  const [focusX, setFocusX] = useState<Record<string, number>>({});
  const [focusY, setFocusY] = useState<Record<string, number>>({});
  async function load() {
    setLoading(true);
    try {
      const auth = await token();
      const response = await fetch("/api/admin/users", { headers: { authorization: `Bearer ${auth}` }, cache: "no-store" });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Could not load members.");
      const rows = (payload.users ?? []) as UserRow[]; setUsers(rows);
      const client = createClient();
      const season = await client.from("seasons").select("id").eq("is_current", true).maybeSingle(); const id = season.data?.id ?? ""; setSeasonId(id);
      if (id) { const memberships = await client.from("season_memberships").select("profile_id,paid").eq("season_id", id); setPaid(Object.fromEntries((memberships.data ?? []).map((row: any) => [row.profile_id, Boolean(row.paid)]))); }
      const images = await Promise.all(rows.map(async (row) => { const imageResponse = await fetch(`/api/admin/profile-image?profileId=${encodeURIComponent(row.id)}`, { headers: { authorization: `Bearer ${auth}` } }); if (!imageResponse.ok) return [row.id, ""] as const; const imagePayload = await imageResponse.json(); return [row.id, String(imagePayload.portraitUrl ?? "")] as const; }));
      setPortraitUrls(Object.fromEntries(images));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load members."); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); return () => { Object.values(previewUrls).forEach((url) => { if (url) URL.revokeObjectURL(url); }); }; }, []);
  function update(id: string, values: Partial<UserRow>) { setUsers((rows) => rows.map((row) => row.id === id ? { ...row, ...values } : row)); }
  async function save(user: UserRow) {
    setBusy(user.id); setMessage("");
    try {
      const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id: user.id, username: user.username, displayName: user.display_name, role: user.role, active: user.active, password: user.password ?? "", mobileNumber: user.mobile_number ?? "" }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Could not save member.");
      setMessage(`${user.display_name} saved.`); await load(); onReloadAll();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save member."); } finally { setBusy(""); }
  }
  async function createMember() {
    if (!newName.trim()) return;
    setBusy("create"); setMessage("");
    try {
      const response = await fetch("/api/admin/users", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ displayName: newName.trim() }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Could not create member.");
      setNewName(""); setMessage(`${payload.user.display_name} created · username ${payload.user.username} · password ${payload.user.password}`); await load(); onReloadAll();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create member."); } finally { setBusy(""); }
  }
  async function togglePaid(user: UserRow) {
    if (!seasonId) return;
    const next = !paid[user.id];
    const response = await createClient().from("season_memberships").update({ paid: next, paid_at: next ? new Date().toISOString() : null }).eq("season_id", seasonId).eq("profile_id", user.id);
    if (response.error) return setMessage(response.error.message); setPaid((value) => ({ ...value, [user.id]: next }));
  }
  async function resetUser(user: UserRow) {
    if (!window.confirm(`Reset ${user.display_name} to an inactive placeholder? Their profile picture and private contact details will be cleared.`)) return;
    setBusy(`reset-${user.id}`);
    const response = await fetch("/api/admin/users", { method: "DELETE", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ id: user.id }) });
    const payload = await response.json(); setMessage(response.ok ? `Account reset · ${payload.username} · ${payload.password}` : payload.error ?? "Could not reset account."); if (response.ok) { await load(); onReloadAll(); } setBusy("");
  }
  function choosePhoto(user: UserRow, file?: File) {
    if (!file) return; if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 10 * 1024 * 1024) return setMessage("Use a JPEG, PNG or WebP under 10 MB.");
    if (previewUrls[user.id]) URL.revokeObjectURL(previewUrls[user.id]);
    setFiles((value) => ({ ...value, [user.id]: file })); setPreviewUrls((value) => ({ ...value, [user.id]: URL.createObjectURL(file) })); setZoom((value) => ({ ...value, [user.id]: 1.15 })); setFocusX((value) => ({ ...value, [user.id]: 50 })); setFocusY((value) => ({ ...value, [user.id]: 45 }));
  }
  async function savePhoto(user: UserRow) {
    const file = files[user.id]; if (!file) return;
    setBusy(`photo-${user.id}`); setMessage("");
    try {
      const portrait = await makePortrait(file, zoom[user.id] ?? 1.15, focusX[user.id] ?? 50, focusY[user.id] ?? 45);
      const form = new FormData(); form.append("profileId", user.id); form.append("original", file, file.name || "original.jpg"); form.append("portrait", new File([portrait], "portrait.jpg", { type: "image/jpeg" }));
      const response = await fetch("/api/admin/profile-image", { method: "POST", headers: { authorization: `Bearer ${await token()}` }, body: form }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Could not save profile picture.");
      setPortraitUrls((value) => ({ ...value, [user.id]: `${payload.portraitUrl}?v=${Date.now()}` })); setMessage("Profile picture saved."); onReloadAll();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save profile picture."); } finally { setBusy(""); }
  }
  async function removePhoto(user: UserRow) {
    if (!window.confirm(`Remove ${user.display_name}'s profile picture?`)) return;
    const response = await fetch("/api/admin/profile-image", { method: "DELETE", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ profileId: user.id }) }); const payload = await response.json(); setMessage(response.ok ? "Profile picture removed." : payload.error ?? "Could not remove profile picture."); if (response.ok) { setPortraitUrls((value) => ({ ...value, [user.id]: "" })); onReloadAll(); }
  }
  const active = users.filter((row) => row.active && row.role !== "guest"); const paidCount = active.filter((row) => paid[row.id]).length;
  if (loading) return <section className={styles.section}><header className={styles.sectionHeading}><span>LEAGUE MEMBERS</span><h2>Members</h2></header><p>Loading members…</p></section>;
  return <section className={styles.section}>
    <header className={styles.sectionHeading}><span>ULTIMATE ADMIN</span><h2>Members</h2></header>
    <div className={styles.paymentStrip}><div><span>ENTRY FEE</span><strong>£{entryFee.toFixed(0)}</strong></div><div><span>PAID</span><strong>{paidCount}/{active.length}</strong><small>£{(paidCount * entryFee).toFixed(0)} received</small></div><div><span>OUTSTANDING</span><strong>£{((active.length - paidCount) * entryFee).toFixed(0)}</strong></div></div>
    <div className={styles.createMember}><input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New player name" /><button type="button" className={styles.primaryButton} disabled={busy === "create" || !newName.trim()} onClick={() => void createMember()}>{busy === "create" ? "Creating…" : "Create member"}</button></div>
    <div className={styles.userLedger}>{users.map((user) => <details key={user.id} open={user.slot_number === 1}><summary><div className={styles.userSummary}><span className={styles.avatar}>{portraitUrls[user.id] ? <img src={portraitUrls[user.id]} alt="" /> : initials(user.display_name)}</span><div><strong>{user.display_name}</strong><small>{user.username} · {user.role.replace("_", " ")} · R {user.rousset_count ?? 0}</small></div></div><div className={styles.userBadges}><button type="button" className={paid[user.id] ? styles.paidButton : styles.unpaidButton} onClick={(event) => { event.preventDefault(); void togglePaid(user); }}>{paid[user.id] ? "PAID" : "UNPAID"}</button><span>{user.active ? "ACTIVE" : "INACTIVE"}</span><b>⌄</b></div></summary><div className={styles.userEditor}>
      <div className={styles.formLedger}><label>Player name<input value={user.display_name} onChange={(e) => update(user.id, { display_name: e.target.value })} /></label><label>Username<input value={user.username} autoCapitalize="none" autoCorrect="off" onChange={(e) => update(user.id, { username: e.target.value })} /></label><label>Password<input type="text" autoComplete="off" value={user.password ?? ""} onChange={(e) => update(user.id, { password: e.target.value })} /></label><label>Role<select value={user.role} disabled={user.slot_number === 1} onChange={(e) => update(user.id, { role: e.target.value as UserRow["role"] })}><option value="member">Member</option><option value="admin">League Admin</option><option value="guest">Demo Guest</option>{user.slot_number === 1 ? <option value="ultimate_admin">Ultimate Admin</option> : null}</select></label><label>Mobile number<input type="tel" placeholder="+447700900123" value={user.mobile_number ?? ""} onChange={(e) => update(user.id, { mobile_number: e.target.value })} /></label><label>Account status<select value={user.active ? "active" : "inactive"} disabled={user.slot_number === 1} onChange={(e) => update(user.id, { active: e.target.value === "active" })}><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div>
      <div className={styles.rowActions}><button type="button" className={styles.secondaryButton} onClick={() => update(user.id, { password: `bounce${user.slot_number ?? ""}${Math.floor(10 + Math.random() * 90)}` })}>Generate password</button><button type="button" className={styles.secondaryButton} onClick={() => navigator.clipboard.writeText(`${user.display_name}\nUsername: ${user.username}\nPassword: ${user.password ?? ""}\nLogin: https://bounce-btts.vercel.app`).then(() => setMessage("Login details copied."))}>Copy login</button><button type="button" className={styles.secondaryButton} disabled={!user.password} onClick={() => { const text = ["Bounce BTTS League", `Player: ${user.display_name}`, `Username: ${user.username}`, `Password: ${user.password}`, "Login: https://bounce-btts.vercel.app", "", "Keep these login details private."].join("\n"); window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer"); }}>WhatsApp login</button>{onEmulate ? <button type="button" className={styles.secondaryButton} onClick={() => onEmulate(user.id)}>Emulate</button> : null}<button type="button" className={styles.primaryButton} disabled={busy === user.id} onClick={() => void save(user)}>{busy === user.id ? "Saving…" : "Save member"}</button>{user.slot_number !== 1 ? <button type="button" className={styles.dangerButton} disabled={busy === `reset-${user.id}`} onClick={() => void resetUser(user)}>Reset to placeholder</button> : null}</div>
      <div className={styles.photoEditor}><div className={styles.photoPreview}>{previewUrls[user.id] || portraitUrls[user.id] ? <img src={previewUrls[user.id] || portraitUrls[user.id]} alt={`${user.display_name} profile preview`} style={{ transform: previewUrls[user.id] ? `scale(${zoom[user.id] ?? 1.15})` : undefined, objectPosition: `${focusX[user.id] ?? 50}% ${focusY[user.id] ?? 45}%` }} /> : <span>No profile picture</span>}</div><div className={styles.photoControls}><label>Choose photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => choosePhoto(user, e.target.files?.[0])} /></label>{files[user.id] ? <><label>Zoom<input type="range" min="1.1" max="2.4" step="0.05" value={zoom[user.id] ?? 1.15} onChange={(e) => setZoom((value) => ({ ...value, [user.id]: Number(e.target.value) }))} /></label><label>Horizontal focus<input type="range" min="0" max="100" value={focusX[user.id] ?? 50} onChange={(e) => setFocusX((value) => ({ ...value, [user.id]: Number(e.target.value) }))} /></label><label>Vertical focus<input type="range" min="0" max="100" value={focusY[user.id] ?? 45} onChange={(e) => setFocusY((value) => ({ ...value, [user.id]: Number(e.target.value) }))} /></label><button type="button" className={styles.primaryButton} disabled={busy === `photo-${user.id}`} onClick={() => void savePhoto(user)}>Save profile picture</button></> : null}{portraitUrls[user.id] ? <button type="button" className={styles.secondaryButton} onClick={() => void removePhoto(user)}>Remove picture</button> : null}</div></div>
    </div></details>)}</div>
    {message ? <div className={styles.feedback}>{message}</div> : null}
  </section>;
}

function FixturesPanel({ gameweek, gameweeks, fixtures, onChanged }: { gameweek: Gameweek | null; gameweeks: Gameweek[]; fixtures: Fixture[]; onChanged: () => void | Promise<void> }) {
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ competition: "Scottish Premiership", country: "Scotland", homeTeam: "", awayTeam: "", kickoffLocal: "", oddsFractional: "" });
  const nextGameweek = gameweek ? gameweeks.find((row) => row.number > gameweek.number) ?? null : null;
  async function sync(target: Gameweek | null, mode: "results" | "full") {
    if (!target) return; setBusy(`${target.id}-${mode}`); setMessage("");
    try {
      const auth = { authorization: `Bearer ${await token()}` };
      const response = mode === "results" ? await fetch(`/api/live-results?gameweekId=${encodeURIComponent(target.id)}`, { headers: auth, cache: "no-store" }) : await fetch("/api/admin/provider-sync", { method: "POST", headers: { "content-type": "application/json", ...auth }, body: JSON.stringify({ gameweekIds: [target.id], mode }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Refresh failed."); setMessage(mode === "results" ? `Live refresh complete · ${payload.updated ?? 0} updated.` : `Full refresh complete · ${payload.fixturesAdded ?? 0} added · ${payload.fixturesUpdated ?? 0} updated · ${payload.oddsUpdated ?? 0} odds.`); await onChanged();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Refresh failed."); } finally { setBusy(""); }
  }
  async function add(event: FormEvent) {
    event.preventDefault(); if (!gameweek || !form.kickoffLocal) return; setBusy("add"); setMessage("");
    try {
      const response = await fetch("/api/admin/fixtures", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ ...form, kickoffAt: new Date(form.kickoffLocal).toISOString(), gameweekId: gameweek.id }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Could not add fixture."); setMessage("Fixture added."); setForm((value) => ({ ...value, homeTeam: "", awayTeam: "", kickoffLocal: "", oddsFractional: "" })); await onChanged();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not add fixture."); } finally { setBusy(""); }
  }
  return <section className={styles.section}><header className={styles.sectionHeading}><span>GAMEWEEK {gameweek?.number ?? "—"}</span><h2>Fixtures</h2></header>
    <div className={styles.actionBar}><button className={styles.primaryButton} type="button" disabled={!gameweek || Boolean(busy)} onClick={() => void sync(gameweek, "results")}>{busy.endsWith("-results") ? "Refreshing…" : "Quick live refresh"}</button><button className={styles.secondaryButton} type="button" disabled={!gameweek || Boolean(busy)} onClick={() => void sync(gameweek, "full")}>{busy.endsWith("-full") ? "Refreshing…" : "Full fixture & odds refresh"}</button>{nextGameweek ? <button className={styles.secondaryButton} type="button" disabled={Boolean(busy)} onClick={() => void sync(nextGameweek, "full")}>Full refresh GW {nextGameweek.number}</button> : null}</div>
    <div className={styles.fixtureLedger}>{fixtures.map((fixture) => <div key={fixture.id}><strong>{displayFixture(fixture)}</strong><span>{fixtureMeta(fixture)}</span><b>{fixture.status}</b></div>)}</div>
    <form className={styles.subsection} onSubmit={(event) => void add(event)}><header><span>MANUAL FIXTURE</span><h3>Add fixture</h3></header><div className={styles.formLedger}><label>Competition<input value={form.competition} onChange={(e) => setForm({ ...form, competition: e.target.value })} /></label><label>Country<input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></label><label>Home team<input required value={form.homeTeam} onChange={(e) => setForm({ ...form, homeTeam: e.target.value })} /></label><label>Away team<input required value={form.awayTeam} onChange={(e) => setForm({ ...form, awayTeam: e.target.value })} /></label><label>Kick-off (UK time)<input required type="datetime-local" value={form.kickoffLocal} onChange={(e) => setForm({ ...form, kickoffLocal: e.target.value })} /></label><label>BTTS fractional odds<input value={form.oddsFractional} onChange={(e) => setForm({ ...form, oddsFractional: e.target.value })} placeholder="8/11" /></label></div><button type="submit" className={styles.primaryButton} disabled={!gameweek || busy === "add"}>{busy === "add" ? "Adding…" : "Add fixture manually"}</button></form>
    {message ? <div className={styles.feedback}>{message}</div> : null}
  </section>;
}

function ResultsPanel({ gameweek, fixtures, predictions, onChanged }: { gameweek: Gameweek | null; fixtures: Fixture[]; predictions: Prediction[]; onChanged: () => void | Promise<void> }) {
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { setScores(Object.fromEntries(fixtures.map((fixture) => [fixture.id, { home: fixture.home_score?.toString() ?? "", away: fixture.away_score?.toString() ?? "" }]))); }, [fixtures]);
  async function save(fixture: Fixture, silent = false) {
    const score = scores[fixture.id]; if (!score || score.home === "" || score.away === "") return false;
    const response = await fetch("/api/admin/results", { method: "PATCH", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ fixtureId: fixture.id, homeScore: Number(score.home), awayScore: Number(score.away) }) }); const payload = await response.json(); if (!silent) setMessage(response.ok ? "Result and points saved." : payload.error ?? "Could not save result."); return response.ok;
  }
  async function recalc() {
    const rows = fixtures.filter((fixture) => predictions.some((prediction) => prediction.fixture_id === fixture.id) && finishedStatuses.has(fixture.status) && fixture.home_score != null && fixture.away_score != null);
    if (!rows.length) return setMessage("No finished selected fixtures to recalculate."); if (!window.confirm(`Recalculate points for ${rows.length} finished selected match${rows.length === 1 ? "" : "es"}?`)) return;
    setBusy("recalc"); let ok = 0; for (const fixture of rows) if (await save(fixture, true)) ok++; setBusy(""); setMessage(`Recalculated ${ok}/${rows.length} finished selected matches.`); await onChanged();
  }
  return <section className={styles.section}><header className={styles.sectionHeading}><span>GAMEWEEK {gameweek?.number ?? "—"}</span><h2>Results</h2></header><div className={styles.actionBar}><button type="button" className={styles.primaryButton} disabled={busy === "recalc"} onClick={() => void recalc()}>{busy === "recalc" ? "Recalculating…" : "Recalculate Gameweek Points"}</button></div>
    <div className={styles.resultLedger}>{fixtures.map((fixture) => { const prediction = predictions.find((row) => row.fixture_id === fixture.id); const warning = finishedStatuses.has(fixture.status) && prediction && prediction.points_awarded == null; return <div key={fixture.id}><div><strong>{displayFixture(fixture)}</strong><small>{fixture.competition ?? "Fixture"}{warning ? " · FINISHED BUT UNSCORED" : ""}</small></div><input aria-label={`${fixture.home_team} score`} type="number" min="0" value={scores[fixture.id]?.home ?? ""} onChange={(e) => setScores((value) => ({ ...value, [fixture.id]: { ...(value[fixture.id] ?? { home: "", away: "" }), home: e.target.value } }))} /><span>–</span><input aria-label={`${fixture.away_team} score`} type="number" min="0" value={scores[fixture.id]?.away ?? ""} onChange={(e) => setScores((value) => ({ ...value, [fixture.id]: { ...(value[fixture.id] ?? { home: "", away: "" }), away: e.target.value } }))} /><button type="button" className={styles.secondaryButton} onClick={async () => { setBusy(fixture.id); if (await save(fixture)) await onChanged(); setBusy(""); }}>{busy === fixture.id ? "Saving…" : "Save FT"}</button></div>; })}</div>{message ? <div className={styles.feedback}>{message}</div> : null}</section>;
}

function SeasonsPanel({ seasonLabel, entryFee, profiles, onReloadAll }: { seasonLabel: string; entryFee: number; profiles: Profile[]; onReloadAll: () => void }) {
  const [label, setLabel] = useState(""); const [gameweeks, setGameweeks] = useState("38"); const [firstFixtureDate, setFirstFixtureDate] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function create() {
    if (!label.trim()) return; setBusy(true); setMessage("");
    try { const response = await fetch("/api/admin/seasons", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` }, body: JSON.stringify({ label: label.trim(), gameweeks: Number(gameweeks), firstFixtureDate: firstFixtureDate || null }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Could not create season."); setMessage(`Season ${label.trim()} created with ${gameweeks} gameweeks and ${payload.copiedUsers ?? 0} members copied.`); setLabel(""); onReloadAll(); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create season."); } finally { setBusy(false); }
  }
  const active = profiles.filter((row) => row.active && row.role !== "guest").length;
  return <section className={styles.section}><header className={styles.sectionHeading}><span>CURRENT SEASON</span><h2>Seasons</h2></header><div className={styles.paymentStrip}><div><span>ACTIVE</span><strong>{seasonLabel}</strong></div><div><span>ENTRY FEE</span><strong>£{entryFee.toFixed(0)}</strong></div><div><span>MEMBERS</span><strong>{active}</strong></div></div><div className={styles.subsection}><header><span>NEW SEASON</span><h3>Create schedule</h3></header><div className={styles.formLedger}><label>Season name<input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="2027/28" /></label><label>Planned gameweeks<input type="number" min="1" max="60" value={gameweeks} onChange={(e) => setGameweeks(e.target.value)} /></label><label>First fixture date<input type="date" value={firstFixtureDate} onChange={(e) => setFirstFixtureDate(e.target.value)} /></label></div><button type="button" className={styles.primaryButton} disabled={busy || !label.trim()} onClick={() => void create()}>{busy ? "Creating…" : "Create new season"}</button><p className={styles.sectionCopy}>The canonical season calendar creates normal Saturday rounds with their opening and deadline schedule, and copies active named members into the new season.</p></div>{message ? <div className={styles.feedback}>{message}</div> : null}</section>;
}

export default function V2AdminCentre({ seasonLabel, gameweek, gameweeks, profiles, fixtures, predictions, adjustments, alertsCount, fixtureState = "ready", entryFee, isUltimate, onChanged, onReloadAll, onEmulate, onAlertsChanged }: Props) {
  const [tab, setTab] = useState<AdminTab>("overview");
  const activeMembers = profiles.filter((row) => row.active && row.role !== "guest");
  const eligibleFixtures = fixtures.filter((row) => row.is_eligible).length;
  const healthy = fixtureState === "ready" && alertsCount === 0 && Boolean(gameweek) && eligibleFixtures > 0;
  const systemState = fixtureState === "loading" ? "CHECKING" : fixtureState === "error" ? "UNAVAILABLE" : healthy ? "READY" : alertsCount ? "ATTENTION" : "CHECK";
  const systemDetail = fixtureState === "loading" ? "Confirming fixture cover" : fixtureState === "error" ? "Fixture data unavailable" : alertsCount ? `${alertsCount} unresolved alert${alertsCount === 1 ? "" : "s"}` : "No unresolved provider or gameweek alerts";
  const tabs: Array<{ id: AdminTab; label: string; ultimateOnly?: boolean }> = [
    { id: "overview", label: "Overview" }, { id: "gameweek", label: "Gameweek" }, { id: "selections", label: "Selections" }, { id: "members", label: "Members", ultimateOnly: true }, { id: "fixtures", label: "Fixtures" }, { id: "results", label: "Results" }, { id: "seasons", label: "Seasons" }, { id: "advanced", label: "Advanced" },
  ];
  return <main className={styles.page}>
    <header className={styles.hero}><div className={styles.heroTitle}><span>SEASON {seasonLabel}</span><h1>Admin</h1><p>League Management</p></div><div className={styles.statusSignal}><span>SYSTEM STATE</span><strong>{systemState}</strong><small>{systemDetail}</small></div></header>
    <nav className={styles.tabs} aria-label="Admin sections">{tabs.filter((item) => !item.ultimateOnly || isUltimate).map((item) => <button type="button" key={item.id} className={tab === item.id ? styles.activeTab : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
    {tab === "overview" ? <OverviewPanel gameweek={gameweek} activeMembers={activeMembers} fixtures={fixtures} predictions={predictions} alertsCount={alertsCount} fixtureState={fixtureState} onAlertsChanged={onAlertsChanged} /> : null}
    {tab === "gameweek" ? <GameweekPanel gameweek={gameweek} gameweeks={gameweeks} isUltimate={isUltimate} onReloadAll={onReloadAll} /> : null}
    {tab === "selections" ? <SelectionsPanel gameweek={gameweek} profiles={profiles} fixtures={fixtures} predictions={predictions} adjustments={adjustments} onChanged={onChanged} /> : null}
    {tab === "members" && isUltimate ? <MembersPanel entryFee={entryFee} onReloadAll={onReloadAll} onEmulate={onEmulate} /> : null}
    {tab === "fixtures" ? <FixturesPanel gameweek={gameweek} gameweeks={gameweeks} fixtures={fixtures} onChanged={onChanged} /> : null}
    {tab === "results" ? <ResultsPanel gameweek={gameweek} fixtures={fixtures} predictions={predictions} onChanged={onChanged} /> : null}
    {tab === "seasons" ? <SeasonsPanel seasonLabel={seasonLabel} entryFee={entryFee} profiles={profiles} onReloadAll={onReloadAll} /> : null}
    {tab === "advanced" ? <section className={`${styles.section} ${styles.advancedSection}`}><header className={styles.sectionHeading}><span>ADVANCED ADMINISTRATION</span><h2>Advanced</h2></header><div className={styles.advancedLedger}><article><div><span>LEGACY SAFETY NET</span><strong>Advanced Controls</strong><p>The dedicated Ultimate Admin screen remains available while V2 moves specialist controls into the native Admin workspace.</p></div>{isUltimate ? <a className={styles.advancedLink} href="/admin-controls">Open Advanced Controls →</a> : null}</article><article><div><span>RULE OWNERSHIP</span><strong>Canonical league behaviour</strong><p>V2 Admin uses the existing secured APIs and canonical gameweek/scoring rules; it does not maintain a second copy of league logic.</p></div></article></div></section> : null}
  </main>;
}
