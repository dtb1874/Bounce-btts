"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./UKLeagueSelector.module.css";

type Round = { name: string; count: number; enabled: boolean };
type Competition = { country: string; competition: string; enabled: boolean; count: number; rounds: Round[] };

export default function UKLeagueSelector({ onChanged, readOnly = false }: { onChanged?: () => void | Promise<void>; readOnly?: boolean }) {
  const [rows, setRows] = useState<Competition[]>([]);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("All UK");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  async function token() {
    const { data } = await createClient().auth.getSession();
    return data.session?.access_token ?? "";
  }
  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const response = await fetch("/api/admin/competitions", {
          headers: { authorization: `Bearer ${await token()}` },
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Could not load competitions.");
        if (mounted) setRows(payload.competitions ?? []);
      } catch (error) {
        if (mounted) setMessage(error instanceof Error ? error.message : "Could not load competitions.");
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const shown = useMemo(() => rows.filter(row =>
    (country === "All UK" || country === row.country) &&
    `${row.competition} ${row.country}`.toLowerCase().includes(search.trim().toLowerCase())
  ), [rows, country, search]);
  const enabledCount = rows.filter(row => row.enabled).length;

  async function change(row: Competition, round?: string) {
    if (readOnly || busy) return;
    const key = JSON.stringify([row.country, row.competition, round ?? ""]);
    const currentRound = round ? row.rounds.find(item => item.name === round) : null;
    const nextEnabled = round ? !currentRound?.enabled : !row.enabled;
    setBusy(key); setMessage("");
    try {
      const response = await fetch("/api/admin/competitions", {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` },
        body: JSON.stringify({
          country: row.country,
          competition: row.competition,
          ...(round ? { round } : {}),
          enabled: nextEnabled,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not update competition.");
      setRows(previous => previous.map(item =>
        item.country === row.country && item.competition === row.competition
          ? round
            ? { ...item, rounds: item.rounds.map(stage => stage.name === round ? { ...stage, enabled: nextEnabled } : stage) }
            : { ...item, enabled: nextEnabled }
          : item
      ));
      setMessage(`${row.competition}${round ? ` · ${round}` : ""} updated. ${payload.updated ?? 0} upcoming fixtures checked.`);
      await onChanged?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update competition.");
    } finally { setBusy(""); }
  }

  return <section className={styles.root} aria-label="UK league availability controls">
    <div className={styles.heading}>
      <div>
        <span className={styles.eyebrow}>Fixture eligibility</span>
        <h3>UK leagues & cup rounds</h3>
        <p>Choose which competitions and rounds members can select. Historical results stay untouched; newly discovered UK competitions are enabled by default.</p>
      </div>
      <div className={styles.count} aria-label={`${enabledCount} of ${rows.length} competitions enabled`}>
        <strong>{enabledCount}/{rows.length}</strong>
        Enabled
      </div>
    </div>
    <div className={styles.filters}>
      <input className={styles.field} aria-label="Search leagues" type="search" placeholder="Search league, cup or region" value={search} onChange={event => setSearch(event.target.value)} />
      <select className={styles.field} aria-label="Filter by country" value={country} onChange={event => setCountry(event.target.value)}>
        {["All UK", "Scotland", "England", "Wales", "Northern Ireland", "Northern-Ireland"].map(value => <option key={value} value={value}>{value}</option>)}
      </select>
    </div>
    {loading ? <p className={styles.empty}>Loading competitions…</p> : shown.length === 0
      ? <p className={styles.empty}>No matching competitions in the fixture catalogue.</p>
      : <div className={styles.list}>{shown.map(row => {
        const key = JSON.stringify([row.country, row.competition]);
        const open = expanded.includes(key);
        return <div className={styles.item} key={key}>
          <div className={styles.mainRow}>
            <input className={styles.toggle} type="checkbox" aria-label={`Enable ${row.competition}`} checked={row.enabled} disabled={Boolean(busy) || readOnly} onChange={() => void change(row)} />
            <div className={styles.identity}>
              <strong>{row.competition}</strong>
              <small>{row.country} · {row.count} imported fixtures</small>
            </div>
            {row.rounds.length ? <button className={styles.expand} type="button" aria-expanded={open} aria-label={`${open ? "Hide" : "Show"} ${row.competition} rounds`} onClick={() => setExpanded(values => open ? values.filter(value => value !== key) : [...values, key])}>{open ? "Hide" : "Show"} {row.rounds.length} rounds</button> : null}
            <span className={`${styles.state} ${!row.enabled ? styles.disabledState : ""}`}>{row.enabled ? "Available" : "Excluded"}</span>
          </div>
          {open ? <div className={styles.rounds}>{row.rounds.map(stage =>
            <label className={styles.round} key={stage.name}>
              <input className={styles.roundToggle} type="checkbox" aria-label={`${row.competition} ${stage.name}`} checked={stage.enabled} disabled={Boolean(busy) || readOnly || !row.enabled} onChange={() => void change(row, stage.name)} />
              <span>{stage.name} <small>({stage.count} fixtures)</small></span>
              <small>{!row.enabled ? "Competition excluded" : stage.enabled ? "Available" : "Excluded"}</small>
            </label>
          )}</div> : null}
        </div>;
      })}</div>}
    {message ? <p className={styles.feedback} role="status">{message}</p> : null}
  </section>;
}
