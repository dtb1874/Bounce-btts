"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const maroon = "#5b1530";
const maroonDark = "#270915";
const gold = "#d9b85f";
const cream = "#fff8e8";
const weekdays = [[1,"Monday"],[2,"Tuesday"],[3,"Wednesday"],[4,"Thursday"],[5,"Friday"],[6,"Saturday"],[7,"Sunday"]] as const;

type Profile = { id:string; username:string; display_name:string; role:"ultimate_admin"; active:boolean; slot_number:number|null };
type Gameweek = {
  id:string; number:number; status:"open"|"locked"|"complete"; opens_at:string|null; locks_at:string;
  selection_rule_mode:"exact_time"|"any_kickoff"; selection_weekday:number; selection_time:string;
  selection_times:string[]|null; selection_time_from:string; selection_time_to:string; one_off_rule:boolean;
};

function londonInput(iso:string|null) {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone:"Europe/London", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hour12:false }).formatToParts(new Date(iso));
  const get=(type:string)=>parts.find((part)=>part.type===type)?.value??"";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

async function accessToken() {
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token ?? "";
}

export default function AdvancedAdminControls({ profile, seasonLabel, initialGameweeks }:{ profile:Profile; seasonLabel:string; initialGameweeks:Gameweek[] }) {
  const [gameweeks,setGameweeks]=useState(initialGameweeks);
  const defaultAnchor = useMemo(() => {
    const now=Date.now();
    return [...initialGameweeks].filter((g)=>new Date(g.locks_at).getTime()<=now).sort((a,b)=>b.number-a.number)[0]?.id ?? initialGameweeks[0]?.id ?? "";
  },[initialGameweeks]);
  const [anchorId,setAnchorId]=useState(defaultAnchor);
  const anchor=useMemo(()=>gameweeks.find((g)=>g.id===anchorId)??null,[gameweeks,anchorId]);
  const [insertOpening,setInsertOpening]=useState("");
  const [insertDeadline,setInsertDeadline]=useState("");
  const [insertWeekday,setInsertWeekday]=useState(3);
  const [insertFrom,setInsertFrom]=useState("19:45");
  const [insertTo,setInsertTo]=useState("20:00");
  const [username,setUsername]=useState(profile.username);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  async function insertOneOff() {
    if (!anchor) return;
    if (!insertOpening || !insertDeadline) return setMessage("Choose the opening and deadline for the one-off gameweek.");
    if (insertFrom > insertTo) return setMessage("Kick-off From time cannot be later than To time.");
    setBusy(true); setMessage("");
    const response=await fetch("/api/admin/gameweek",{
      method:"POST",
      headers:{"content-type":"application/json",authorization:`Bearer ${await accessToken()}`},
      body:JSON.stringify({
        insertAfterGameweekId:anchor.id,
        opensAt:new Date(insertOpening).toISOString(),
        locksAt:new Date(insertDeadline).toISOString(),
        selectionRuleMode:"exact_time",
        selectionWeekday:insertWeekday,
        selectionTimeFrom:insertFrom,
        selectionTimeTo:insertTo,
      }),
    });
    const payload=await response.json();
    if (!response.ok) { setMessage(payload.error??"Could not insert one-off gameweek."); setBusy(false); return; }
    const inserted=payload.gameweek as Gameweek;
    setGameweeks((rows)=>[...rows.map((row)=>row.number>anchor.number?{...row,number:row.number+1}:row),inserted].sort((a,b)=>a.number-b.number));
    setAnchorId(inserted.id);
    setMessage(`GW${inserted.number} inserted as a one-off. The existing Saturday rounds were preserved and renumbered.`);
    setBusy(false);
  }

  async function saveUsername() {
    const clean=username.trim().toLowerCase().replace(/[^a-z0-9_-]/g,"");
    if (!clean) return setMessage("Enter a valid username.");
    setBusy(true); setMessage("");
    const response=await fetch("/api/admin/users",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${await accessToken()}`},body:JSON.stringify({id:profile.id,username:clean,displayName:profile.display_name,role:"ultimate_admin",active:true,password:""})});
    const payload=await response.json();
    if(response.ok){setUsername(clean);setMessage(`Username changed to ${clean}. Use this username the next time you sign in.`);}else setMessage(payload.error??"Could not change username.");
    setBusy(false);
  }

  return <main style={{minHeight:"100vh",background:`radial-gradient(circle at top, ${maroon} 0%, ${maroonDark} 62%)`,padding:"24px 14px 60px",color:cream,fontFamily:"Arial, sans-serif"}}>
    <div style={{maxWidth:760,margin:"0 auto"}}>
      <a href="/" style={{color:gold,textDecoration:"none",fontWeight:800}}>← Back to Bounce</a>
      <header style={{margin:"24px 0 20px"}}><div style={{color:gold,fontSize:12,fontWeight:900,letterSpacing:2}}>ULTIMATE ADMIN · {seasonLabel}</div><h1 style={{margin:"7px 0 6px",fontSize:34}}>Advanced Controls</h1><p style={{margin:0,color:"#eadfc5",lineHeight:1.5}}>Insert temporary extra gameweeks without replacing the normal Saturday schedule.</p></header>
      {message&&<div style={{background:"rgba(217,184,95,.15)",border:`1px solid ${gold}`,padding:12,borderRadius:10,marginBottom:14}}>{message}</div>}

      <section style={sectionStyle}>
        <div style={{color:gold,fontSize:12,fontWeight:900,letterSpacing:1.5}}>ONE-OFF / MIDWEEK SPECIAL</div>
        <h2 style={{color:cream,margin:"7px 0 8px"}}>Insert extra gameweek</h2>
        <p style={{color:"#eadfc5",lineHeight:1.45,marginTop:0}}>This inserts a brand-new round. Every later scheduled gameweek keeps its dates, fixtures and data and simply moves up one GW number.</p>
        <div style={{display:"grid",gap:14}}>
          <label style={labelStyle}><strong>Insert after</strong><select value={anchorId} onChange={(e)=>setAnchorId(e.target.value)} style={inputStyle}>{gameweeks.map((g)=><option key={g.id} value={g.id}>GW {g.number}{g.one_off_rule?" · ONE-OFF":""}</option>)}</select><small style={helpStyle}>For this week's midweek special, choose the Saturday round immediately before it.</small></label>
          <label style={labelStyle}><strong>Selections open</strong><input type="datetime-local" value={insertOpening} onChange={(e)=>setInsertOpening(e.target.value)} style={inputStyle}/></label>
          <label style={labelStyle}><strong>Selection deadline</strong><input type="datetime-local" value={insertDeadline} onChange={(e)=>setInsertDeadline(e.target.value)} style={inputStyle}/></label>
          <label style={labelStyle}><strong>Fixture day</strong><select value={insertWeekday} onChange={(e)=>setInsertWeekday(Number(e.target.value))} style={inputStyle}>{weekdays.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <label style={labelStyle}><strong>Kick-offs from</strong><input type="time" value={insertFrom} onChange={(e)=>setInsertFrom(e.target.value)} style={inputStyle}/></label>
            <label style={labelStyle}><strong>Kick-offs to</strong><input type="time" value={insertTo} onChange={(e)=>setInsertTo(e.target.value)} style={inputStyle}/></label>
          </div>
          <small style={helpStyle}>The window is inclusive. Example: <strong>19:45 → 20:00</strong> permits fixtures kicking off at 19:45, 20:00 and any valid kickoff in between. Set the same time in both boxes for one exact kickoff.</small>
          <button disabled={busy} onClick={insertOneOff} style={primaryStyle}>{busy?"Inserting…":`Insert one-off after GW${anchor?.number??""}`}</button>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={{color:gold,marginTop:0}}>Schedule check</h2>
        <div style={{display:"grid",gap:8}}>{gameweeks.filter((g)=>g.number>=(anchor?.number??0)-1&&g.number<=(anchor?.number??0)+3).map((g)=><div key={g.id} style={{display:"flex",justifyContent:"space-between",gap:12,borderBottom:"1px solid rgba(255,255,255,.08)",paddingBottom:8}}><strong>GW {g.number}{g.one_off_rule?" · ONE-OFF":""}</strong><span style={{color:"#cdbf9f",textAlign:"right"}}>{new Date(g.locks_at).toLocaleString("en-GB",{timeZone:"Europe/London",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})} deadline</span></div>)}</div>
      </section>

      <section style={sectionStyle}><h2 style={{color:gold,marginTop:0}}>Your Ultimate Admin login</h2><p style={{color:"#eadfc5",lineHeight:1.5}}>Your player name remains <strong>{profile.display_name}</strong>.</p><label style={labelStyle}><strong>Username</strong><input value={username} onChange={(e)=>setUsername(e.target.value)} autoCapitalize="none" autoCorrect="off" style={inputStyle}/></label><button disabled={busy} onClick={saveUsername} style={{...primaryStyle,marginTop:14}}>{busy?"Saving…":"Change my username"}</button></section>
    </div>
  </main>;
}

const sectionStyle={background:"rgba(20,5,11,.82)",border:"1px solid rgba(217,184,95,.45)",borderRadius:16,padding:18,marginBottom:18};
const labelStyle={display:"grid",gap:6} as const;
const helpStyle={color:"#cdbf9f",lineHeight:1.35} as const;
const inputStyle={width:"100%",boxSizing:"border-box" as const,padding:"12px 10px",borderRadius:9,border:"1px solid rgba(217,184,95,.55)",background:"#fffaf0",color:"#241019",fontSize:16};
const primaryStyle={border:0,borderRadius:9,padding:"13px 15px",background:gold,color:maroonDark,fontWeight:900,fontSize:15,cursor:"pointer"};
