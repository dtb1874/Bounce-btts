"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Competition = { country: string; competition: string; enabled: boolean; count: number };
export default function UKLeagueSelector({ onChanged, readOnly = false }: { onChanged?: () => void | Promise<void>; readOnly?: boolean }) {
  const [rows, setRows] = useState<Competition[]>([]);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("All UK");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  async function token() {
    const { data } = await createClient().auth.getSession();
    return data.session?.access_token ?? "";
  }
  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const response = await fetch("/api/admin/competitions", { headers: { authorization: `Bearer ${await token()}` }, cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Could not load competitions.");
        if (mounted) setRows(payload.competitions ?? []);
      } catch (error) {
        if (mounted) setMessage(error instanceof Error ? error.message : "Could not load competitions.");
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);
  const shown = useMemo(() => rows.filter(row => (country === "All UK" || country === row.country)
    && `${row.competition} ${row.country}`.toLowerCase().includes(search.toLowerCase())), [rows, country, search]);
  async function change(row: Competition) {
    const key = JSON.stringify([row.country,row.competition]);
    setBusy(key); setMessage("");
    try {
      const response = await fetch("/api/admin/competitions", { method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ country: row.country, competition: row.competition, enabled: !row.enabled }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not update competition.");
      setRows(previous => previous.map(item => item.country === row.country && item.competition === row.competition
        ? { ...item, enabled: !row.enabled } : item));
      setMessage(`${row.competition} (${row.country}) ${!row.enabled ? "enabled" : "disabled"}. ${payload.updated} upcoming fixtures updated.`);
      await onChanged?.();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update competition."); }
    finally { setBusy(""); }
  }
  return <section style={{ padding: "18px 0", color: "inherit" }}>
    <h3>UK leagues & fixture types</h3>
    <p>Choose which UK competitions can appear in members’ available picks. Disabled competitions stay in historical results. New UK competitions are enabled by default until switched off.</p>
    <div style={{display:"flex", flexWrap:"wrap",gap:10,marginBottom:14}}>
      <input aria-label="Search leagues" placeholder="Search leagues or cups" value={search} onChange={event=>setSearch(event.target.value)} style={{flex:"1 1 180px",padding:10,borderRadius:8}} />
      <select aria-label="Filter by country" value={country} onChange={event=>setCountry(event.target.value)} style={{padding:10,borderRadius:8}}>
        {["All UK","England","Scotland","Wales","Northern Ireland","Northern-Ireland"].map(c=><option key={c}>{c}</option>)}
      </select>
    </div>
    <p>{rows.filter(row=>row.enabled).length} enabled of {rows.length} UK competitions</p>
    {loading ? <p>Loading competitions…</p> : shown.length === 0 ? <p>No matching competitions in imported fixtures.</p> :
      <div style={{maxHeight:460,overflowY:"auto",display:"grid",gap:8}}>
        {shown.map(row=><label key={JSON.stringify([row.country,row.competition])} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",border:"1px solid rgba(217,184,95,.32)",borderRadius:9,cursor:"pointer"}}>
          <input type="checkbox" checked={row.enabled} disabled={Boolean(busy) || readOnly} onChange={()=>void change(row)} style={{width:20,height:20}} />
          <span style={{flex:1}}><strong>{row.competition}</strong><small style={{display:"block",opacity:.8}}>{row.country} · {row.count} stored fixture{row.count===1?"":"s"}</small></span>
          <small>{row.enabled?"Available":"Excluded"}</small>
        </label>)}
      </div>}
    {message ? <p role="status">{message}</p> : null}
  </section>;
}
