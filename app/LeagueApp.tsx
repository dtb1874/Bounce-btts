"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ShareTableButton from "./ShareTableButton";
import WeeklyPicksShareButton from "./WeeklyPicksShareButton";
import CombinedShareButton from "./CombinedShareButton";
import DataShareButton from "./DataShareButton";
import { historicalSeasons, rollOfHonour } from "@/lib/history-data";
import { outcomeLabel } from "@/lib/scoring";
import styles from "./release.module.css";

type View = "dashboard" | "pick" | "fixtures" | "table" | "results" | "combined" | "history" | "players" | "about" | "alerts" | "admin";
type AdminView = "users" | "selections" | "fixtures" | "results" | "gameweek" | "seasons";
type Role = "ultimate_admin" | "admin" | "member" | "guest";

type Profile = { id: string; username: string; display_name: string; role: Role; active: boolean; slot_number: number | null };
type Gameweek = { id: string; number: number; status: "open" | "locked" | "complete"; opens_at: string | null; locks_at: string; season_id: string | null };
type Fixture = { id: string; gameweek_id: string | null; competition: string; country: string; home_team: string; away_team: string; kickoff_at: string; status: string; live_elapsed?: number | null; home_score: number | null; away_score: number | null; odds_fractional: string | null; odds_checked_at: string | null; source: string; is_eligible: boolean };
type Prediction = { id: string; gameweek_id: string; member_id: string; fixture_id: string; points_awarded: number | null; created_at: string; updated_at: string };
type ScoreAdjustment = { id: string; gameweek_id: string; member_id: string; points: number; reason: string; source: "automatic" | "admin"; created_at: string; updated_at: string };
type SeasonHistory = { id: string; label: string; isCurrent: boolean; gameweeks: number; completedPicks: number; standings: Array<{ id: string; name: string; played: number; wins: number; oneSided?: number; zeroZeroCount: number; points: number }> };
type Standing = { id: string; name: string; played: number; wins: number; oneSided: number; zeroZeroCount: number; points: number };

type Props = {
  initialProfile: Profile;
  initialProfiles: Profile[];
  initialGameweek: Gameweek | null;
  initialGameweeks: Gameweek[];
  initialFixtures: Fixture[];
  initialAllFixtures: Fixture[];
  initialPredictions: Prediction[];
  initialAdjustments: ScoreAdjustment[];
  seasonLabel: string;
  entryFee: number;
  seasonHistory: SeasonHistory[];
};

const finishedStatuses = ["FT", "AET", "PEN"];
const RELEASE_VERSION = "2.0.0";
const RELEASE_DATE = "16 Aug 2026";
const navItems: Array<{ id: View; label: string; icon: string; adminOnly?: boolean }> = [
  { id: "dashboard", label: "Dashboard", icon: "⌂" },
  { id: "pick", label: "Make My Pick", icon: "⚑" },
  { id: "fixtures", label: "Fixtures", icon: "▦" },
  { id: "table", label: "League Table", icon: "☷" },
  { id: "results", label: "Results", icon: "✦" },
  { id: "history", label: "League History", icon: "◷" },
  { id: "players", label: "Players", icon: "◉" },
  { id: "about", label: "About", icon: "?" },
  { id: "alerts", label: "Alerts", icon: "!", adminOnly: true },
  { id: "admin", label: "Admin", icon: "⚙", adminOnly: true },
];

const competitionPriority = [
  "English Premier League", "English Championship", "English League One", "English League Two", "England — Carabao Cup",
  "Scottish Premiership", "National League", "National League North", "National League South", "Northern Irish Premiership",
  "Northern Irish Championship", "Scottish Championship", "Scottish League One", "Scottish League Two", "Welsh Premier League",
  "FAW Championship", "FA Cup", "Scottish Cup", "Premier Sports Cup", "Scottish Challenge Cup",
];

function normaliseText(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function normaliseCountry(country: string) {
  const v = normaliseText(country);
  if (v === "england") return "England";
  if (v === "scotland") return "Scotland";
  if (v === "wales") return "Wales";
  if (v === "northern ireland") return "Northern Ireland";
  if (v === "europe") return "Europe";
  if (v === "international") return "International";
  return country.trim() || "Other";
}
function competitionDisplayName(fixture: Pick<Fixture, "country" | "competition">) {
  const country = normaliseCountry(fixture.country), c = normaliseText(fixture.competition);
  if (country === "England") {
    if (["premier league","england premier league","english premier league"].includes(c)) return "English Premier League";
    if (["championship","england championship","english championship","efl championship"].includes(c)) return "English Championship";
    if (["league one","england league one","english league one","efl league one"].includes(c)) return "English League One";
    if (["league two","england league two","english league two","efl league two"].includes(c)) return "English League Two";
    if (["league cup","efl cup","england efl cup","carabao cup","england carabao cup"].includes(c)) return "England — Carabao Cup";
    if (c === "national league") return "National League";
    if (c.includes("national league north")) return "National League North";
    if (c.includes("national league south")) return "National League South";
  }
  if (country === "Scotland") {
    if (["premiership","scottish premiership","scotland premiership"].includes(c)) return "Scottish Premiership";
    if (["championship","scottish championship","scotland championship"].includes(c)) return "Scottish Championship";
    if (["league one","league 1","scottish league one","scottish league 1","scotland league one"].includes(c)) return "Scottish League One";
    if (["league two","league 2","scottish league two","scottish league 2","scotland league two"].includes(c)) return "Scottish League Two";
    if (["league cup","premier sports cup","scottish league cup"].includes(c)) return "Premier Sports Cup";
    if (["challenge cup","scottish challenge cup"].includes(c)) return "Scottish Challenge Cup";
  }
  if (country === "Northern Ireland") {
    if (["premiership","northern irish premiership","northern ireland premiership","nifl premiership","northern ireland premier"].includes(c)) return "Northern Irish Premiership";
    if (["championship","northern irish championship","northern ireland championship","nifl championship"].includes(c)) return "Northern Irish Championship";
  }
  if (country === "Wales") {
    if (["premier league","welsh premier league","wales premier league","cymru premier"].includes(c)) return "Welsh Premier League";
    if (["faw championship","welsh championship"].includes(c)) return "FAW Championship";
  }
  if (["premier league","premiership","championship","league one","league two","league cup"].includes(c)) return `${country} — ${fixture.competition.trim()}`;
  return fixture.competition.trim() || `${country} — Other`;
}
function fixtureSort(a: Fixture, b: Fixture) {
  const ar = competitionPriority.indexOf(competitionDisplayName(a)), br = competitionPriority.indexOf(competitionDisplayName(b));
  return (ar < 0 ? 999 : ar) - (br < 0 ? 999 : br) || competitionDisplayName(a).localeCompare(competitionDisplayName(b)) || a.kickoff_at.localeCompare(b.kickoff_at) || a.home_team.localeCompare(b.home_team);
}
const duplicateTeamSuffixes = new Set(["city","town","united","wanderers","rovers","albion","athletic","county"]);
function canonicalFixtureTeam(value:string){
  const parts=normaliseText(value).split(" ").filter(Boolean);
  while(parts.length>1&&duplicateTeamSuffixes.has(parts[parts.length-1]))parts.pop();
  return parts.join(" ");
}
function fixtureIdentityKey(fixture:Fixture){
  const instant=new Date(fixture.kickoff_at).toISOString().slice(0,16);
  return `${instant}|${canonicalFixtureTeam(fixture.home_team)}|${canonicalFixtureTeam(fixture.away_team)}`;
}
function fixtureRichness(fixture:Fixture,preferredIds?:Set<string>){
  return (preferredIds?.has(fixture.id)?1000:0)+(fixture.source==="api-football"?40:0)+(fixture.odds_fractional?12:0)+(fixture.home_score!=null&&fixture.away_score!=null?10:0)+(fixture.status!=="NS"?4:0);
}
function dedupeFixtures(rows:Fixture[],preferredIds?:Set<string>){
  const unique=new Map<string,Fixture>();
  for(const fixture of rows){
    const key=fixtureIdentityKey(fixture);
    const existing=unique.get(key);
    if(!existing||fixtureRichness(fixture,preferredIds)>fixtureRichness(existing,preferredIds))unique.set(key,fixture);
  }
  return Array.from(unique.values());
}
function formatKickoff(value: string) { return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)); }
function fixtureStatusLabel(fixture: Pick<Fixture,"status"|"live_elapsed">) { const live=["1H","2H","ET","P","BT","INT"].includes(fixture.status); return live&&fixture.live_elapsed!=null?`${fixture.live_elapsed}′`:fixture.status; }
function formatAlertTime(value: string) { return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)); }
function sameMoment(a: unknown,b: unknown) { const left=Date.parse(String(a??"")); const right=Date.parse(String(b??"")); return Number.isFinite(left)&&Number.isFinite(right)&&left===right; }
function alertChanges(alert:any) {
  const before=alert?.details?.before, after=alert?.details?.after;
  if(!before||!after)return alert?.message?[String(alert.message)]:[];
  const changes:string[]=[];
  if(!sameMoment(before.kickoff_at,after.kickoff_at)) changes.push(`Kick-off: ${formatKickoff(String(before.kickoff_at))} → ${formatKickoff(String(after.kickoff_at))}`);
  const affecting=new Set(["PST","CANC","ABD","SUSP","INT","TBD"]);
  if(before.status!==after.status&&affecting.has(String(after.status))) changes.push(`Status: ${String(before.status)} → ${String(after.status)}`);
  if(before.home_team!==after.home_team||before.away_team!==after.away_team) changes.push(`Fixture changed: ${String(before.home_team)} v ${String(before.away_team)} → ${String(after.home_team)} v ${String(after.away_team)}`);
  return changes;
}
function isTimezoneOnlyAlert(alert:any) { return alert?.alert_type==="fixture_change_affecting_pick" && Boolean(alert?.details?.before&&alert?.details?.after) && alertChanges(alert).length===0; }
function initials(name: string) { return name.split(/\s+/).map(p => p[0] ?? "").join("").slice(0,2).toUpperCase(); }
function ordinal(value: number) { const mod100 = value % 100; if (mod100 >= 11 && mod100 <= 13) return `${value}th`; const mod10 = value % 10; if (mod10 === 1) return `${value}st`; if (mod10 === 2) return `${value}nd`; if (mod10 === 3) return `${value}rd`; return `${value}th`; }
async function token() { const { data } = await createClient().auth.getSession(); return data.session?.access_token ?? ""; }
function gameweekStatusText(gameweek: Gameweek | null, now: number) {
  if (!gameweek) return "NO GAMEWEEK";
  if (gameweek.status === "complete") return "COMPLETED";
  if (gameweek.status === "locked" || now >= new Date(gameweek.locks_at).getTime()) return `CLOSED · Locked ${formatKickoff(gameweek.locks_at)}`;
  if (gameweek.opens_at && now < new Date(gameweek.opens_at).getTime()) return `OPENS ${formatKickoff(gameweek.opens_at)}`;
  return `OPEN · Locks ${formatKickoff(gameweek.locks_at)}`;
}
function Help({ text }: { text: string }) {
  const [open,setOpen] = useState(false);
  return <span className={styles.helpWrap}><button className={styles.helpButton} type="button" aria-label="Help" aria-expanded={open} onClick={() => setOpen(v=>!v)}>?</button>{open && <div className={styles.helpText}>{text}</div>}</span>;
}

export default function LeagueApp(props: Props) {
  const { initialProfile, initialProfiles, initialGameweek, initialGameweeks, initialFixtures, initialAllFixtures, initialPredictions, initialAdjustments, seasonLabel, entryFee, seasonHistory } = props;
  const [demoPerspective,setDemoPerspective] = useState<"member"|"admin">("member");
  const [emulatedProfileId,setEmulatedProfileId] = useState<string|null>(null);
  const isDemo = initialProfile.role === "guest";
  const profiles = useMemo(() => initialProfiles.filter(p => p.active && p.role !== "guest"), [initialProfiles]);
  const emulatedProfile = emulatedProfileId ? initialProfiles.find(p=>p.active&&p.id===emulatedProfileId) ?? null : null;
  const viewerProfile = isDemo && demoPerspective === "member" ? (profiles.find(p=>p.role==="member") ?? profiles[0] ?? initialProfile) : (emulatedProfile ?? initialProfile);
  const effectiveRole: Role = isDemo ? (demoPerspective === "admin" ? "ultimate_admin" : "member") : viewerProfile.role;
  const isAdmin = effectiveRole === "admin" || effectiveRole === "ultimate_admin";
  const isReadOnly = isDemo || Boolean(emulatedProfileId);
  const [view,setView] = useState<View>("dashboard");
  const [adminView,setAdminView] = useState<AdminView>(effectiveRole === "ultimate_admin" ? "users" : "selections");
  const [gameweekId,setGameweekId] = useState(initialGameweek?.id ?? initialGameweeks[0]?.id ?? "");
  const [fixtures,setFixtures] = useState(initialFixtures);
  const [allFixtures,setAllFixtures] = useState(initialAllFixtures);
  const [predictions,setPredictions] = useState(initialPredictions);
  const [adjustments] = useState(initialAdjustments);
  const [mobileMenu,setMobileMenu] = useState(false);
  const [toast,setToast] = useState("");
  const [now,setNow] = useState(Date.now());
  const [liveRefreshing,setLiveRefreshing] = useState(false);
  const liveRefreshBusyRef=useRef(false);
  const [alertsCount,setAlertsCount] = useState(0);
  const [rouss,setRouss] = useState(false);
  const gameweek = initialGameweeks.find(g => g.id === gameweekId) ?? initialGameweek;
  const currentPredictions = useMemo(() => predictions.filter(p => p.gameweek_id === gameweek?.id), [predictions,gameweek?.id]);
  const selectedFixtureIds = useMemo(() => new Set(currentPredictions.map(p=>p.fixture_id)), [currentPredictions]);
  const currentFixtures = useMemo(() => dedupeFixtures(fixtures.filter(f => f.gameweek_id === gameweek?.id),selectedFixtureIds), [fixtures,gameweek?.id,selectedFixtureIds]);
  const isCurrentPickGameweek = Boolean(initialGameweek && gameweek?.id === initialGameweek.id);
  const isOpen = Boolean(!isReadOnly && isCurrentPickGameweek && gameweek && gameweek.status === "open" && (!gameweek.opens_at || new Date(gameweek.opens_at).getTime() <= now) && new Date(gameweek.locks_at).getTime() > now);
  const selectedPrediction = currentPredictions.find(p => p.member_id === viewerProfile.id);
  const selectedFixture = currentFixtures.find(f => f.id === selectedPrediction?.fixture_id);
  const selectedAdjustment = adjustments.find(a => a.gameweek_id === gameweek?.id && a.member_id === viewerProfile.id);
  const gameweekNoById = useMemo(() => new Map(initialGameweeks.map(g => [g.id,g.number])), [initialGameweeks]);

  function notice(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2500); }

  const standings = useMemo<Standing[]>(() => {
    const rows = new Map<string, Standing>(profiles.map(p => [p.id,{ id:p.id,name:p.display_name,played:0,wins:0,oneSided:0,zeroZeroCount:0,points:0 }] as [string, Standing]));
    for (const p of predictions) {
      if (p.points_awarded == null) continue;
      const row = rows.get(p.member_id); if (!row) continue;
      row.played += 1; row.points += p.points_awarded;
      if (p.points_awarded === 3) row.wins += 1;
      if (p.points_awarded === 1) row.oneSided += 1;
      if (p.points_awarded === -1) row.zeroZeroCount += 1;
    }
    for (const a of adjustments) {
      const row = rows.get(a.member_id); if (!row) continue;
      const scored = predictions.some(p => p.member_id === a.member_id && p.gameweek_id === a.gameweek_id && p.points_awarded != null);
      if (scored && a.reason.trim().toLowerCase() === "missed selection") continue;
      if (!scored) row.played += 1;
      row.points += a.points;
    }
    return Array.from(rows.values()).sort((a,b) => b.points-a.points || a.zeroZeroCount-b.zeroZeroCount || b.wins-a.wins || a.name.localeCompare(b.name));
  },[profiles,predictions,adjustments]);

  async function refreshLiveData(silent = true) {
    if (!gameweek?.id) return;
    try {
      const client = createClient();
      const [fx,preds] = await Promise.all([
        client.from("fixtures").select("*").eq("gameweek_id",gameweek.id),
        client.from("predictions").select("*").eq("gameweek_id",gameweek.id),
      ]);
      if (!fx.error && fx.data) {
        const ids = new Set(fx.data.map((f: Fixture) => f.id));
        setFixtures(old => [...old.filter(f => f.gameweek_id !== gameweek.id), ...(fx.data as Fixture[])]);
        setAllFixtures(old => [...old.filter(f => !ids.has(f.id)), ...(fx.data as Fixture[])]);
      }
      if (!preds.error && preds.data) setPredictions(old => [...old.filter(p => p.gameweek_id !== gameweek.id), ...(preds.data as Prediction[])]);
      if (!silent) notice("Live scores refreshed");
    } catch { if (!silent) notice("Could not refresh live data"); }
  }

  async function fastLiveRefresh(manual=false) {
    if(!gameweek?.id||liveRefreshBusyRef.current)return;
    liveRefreshBusyRef.current=true;setLiveRefreshing(true);
    try{
      const r=await fetch(`/api/live-results?gameweekId=${encodeURIComponent(gameweek.id)}`,{headers:{authorization:`Bearer ${await token()}`},cache:"no-store"});
      const j=await r.json();
      if(!r.ok)throw new Error(j.error??"Could not refresh live scores");
      await refreshLiveData(true);
      if(Array.isArray(j.fixtures)&&j.fixtures.length){
        const liveById=new Map(j.fixtures.map((x:any)=>[String(x.id),x]));
        const applyLive=(rows:Fixture[])=>rows.map(f=>{const x:any=liveById.get(f.id);return x?{...f,status:String(x.status??f.status),home_score:x.homeScore??f.home_score,away_score:x.awayScore??f.away_score,live_elapsed:Number.isInteger(x.elapsed)?x.elapsed:null}:f});
        setFixtures(applyLive);
        setAllFixtures(applyLive);
      }
      if(manual)notice(j.providerFixtures?`Live scores refreshed · ${j.updated??0} updated`:"Live scores checked");
    }catch(e){if(manual)notice(e instanceof Error?e.message:"Could not refresh live scores")}finally{liveRefreshBusyRef.current=false;setLiveRefreshing(false)}
  }

  const livePollActive=useMemo(()=>{
    if(!gameweek?.id||!currentPredictions.length)return false;
    const t=now;
    return currentFixtures.some(f=>{
      if(!selectedFixtureIds.has(f.id)||finishedStatuses.includes(f.status))return false;
      const kickoff=new Date(f.kickoff_at).getTime();
      return kickoff<=t+10*60*1000&&kickoff>=t-4*60*60*1000;
    });
  },[gameweek?.id,currentPredictions.length,currentFixtures,selectedFixtureIds,now]);

  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()),30000); return () => clearInterval(t); },[]);
  useEffect(() => { if (!gameweek?.id) return; const t = window.setInterval(() => refreshLiveData(true),45000); return () => clearInterval(t); },[gameweek?.id]);
  useEffect(() => {
    if(!livePollActive)return;
    void fastLiveRefresh(false);
    const t=window.setInterval(()=>void fastLiveRefresh(false),15000);
    return()=>window.clearInterval(t);
  },[livePollActive,gameweek?.id]);
  useEffect(() => { if (!isAdmin || isDemo || emulatedProfileId) return; (async()=>{ const r=await fetch("/api/admin/alerts",{headers:{authorization:`Bearer ${await token()}`}}); if(r.ok){ const j=await r.json(); setAlertsCount((j.alerts ?? []).filter((a:any)=>!a.resolved).length); } })(); },[isAdmin,isDemo,emulatedProfileId,view]);

  async function selectFixture(fixtureId: string) {
    if (!gameweek || !isOpen) return;
    if (isReadOnly) return notice("Read-only view: changes are disabled.");
    const taken = predictions.find(p => p.gameweek_id === gameweek.id && p.fixture_id === fixtureId && p.member_id !== viewerProfile.id);
    if (taken) return notice("That fixture has already been selected.");
    const client = createClient();
    if (selectedPrediction) {
      const { error } = await client.from("predictions").update({fixture_id:fixtureId,updated_at:new Date().toISOString()}).eq("id",selectedPrediction.id);
      if (error) return notice(error.message);
      setPredictions(rows => rows.map(p => p.id === selectedPrediction.id ? {...p,fixture_id:fixtureId} : p));
    } else {
      const { data,error } = await client.from("predictions").insert({gameweek_id:gameweek.id,member_id:viewerProfile.id,fixture_id:fixtureId}).select().single();
      if (error) return notice(error.message.includes("duplicate") ? "That fixture has just been taken by another player." : error.message);
      if (data) setPredictions(rows => [...rows,data as Prediction]);
    }
    notice("Pick saved ✓");
  }

  async function signOut(){ await createClient().auth.signOut(); window.location.href="/login"; }
  if (!initialProfile.active) return <main className={styles.shell}><div className={styles.panel}><h2>Account inactive</h2><button className={styles.primary} onClick={signOut}>Sign out</button></div></main>;

  return <main className={styles.shell}>
    <button className={styles.mobileMenu} onClick={()=>setMobileMenu(true)}>☰</button>
    <aside className={`${styles.sidebar} ${mobileMenu?styles.open:""}`}>
      <div className={styles.brand}><img src="/assets/st-giles-heart.jpg" alt=""/><div><strong>BOUNCE</strong><span>BTTS LEAGUE</span><small>EST 2024</small></div></div>
      <nav className={styles.nav}>{navItems.filter(n=>!n.adminOnly||isAdmin).map(n=><button key={n.id} className={view===n.id?styles.active:""} onClick={()=>{setView(n.id);setMobileMenu(false)}}><span>{n.icon} </span>{n.label}{n.id==="alerts"&&alertsCount>0?<b className={styles.badge}>{alertsCount>9?"9+":alertsCount}</b>:null}</button>)}</nav>
      <button type="button" className={styles.sidebarEgg} aria-label=" " onClick={()=>{setRouss(true);setMobileMenu(false)}}></button>
      <button className={styles.profile} onClick={signOut}><span>{initials(initialProfile.display_name)}</span><span><strong>{initialProfile.display_name}</strong><small>{isDemo?"Demo Guest":initialProfile.role === "ultimate_admin"?"Ultimate Admin":initialProfile.role === "admin"?"League Admin":initialProfile.username}</small></span><b>↪</b></button>
    </aside>
    {mobileMenu && <button className={styles.scrim} aria-label="Close menu" onClick={()=>setMobileMenu(false)}/>}
    <section className={styles.main}>
      {emulatedProfileId&&<div className={styles.notice} style={{margin:"10px 14px 0",display:"flex",gap:12,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",borderColor:"rgba(240,207,170,.55)",background:"rgba(116,32,52,.92)"}}><span><strong>EMULATION ACTIVE</strong><br/><small>Viewing as {emulatedProfile?.display_name??"another user"} · read-only</small></span><button className={styles.primary} type="button" onClick={()=>{setEmulatedProfileId(null);setView("admin");setAdminView("users");setMobileMenu(false)}}>Exit emulation</button></div>}
      <header className={styles.hero}><div><h1>BOUNCE</h1><h2>— BTTS LEAGUE —</h2><p>EDINBURGH · HEART OF MIDLOTHIAN · EST 2024</p></div><div className={styles.gwCard}><label>Season {seasonLabel}</label><div className={styles.gwRow}><button disabled={initialGameweeks.findIndex(g=>g.id===gameweekId)<=0} onClick={()=>{const i=initialGameweeks.findIndex(g=>g.id===gameweekId);if(i>0)setGameweekId(initialGameweeks[i-1].id)}}>‹</button><select value={gameweek?.id??""} onChange={e=>setGameweekId(e.target.value)}>{initialGameweeks.map(g=><option key={g.id} value={g.id}>GW {g.number}</option>)}</select><button disabled={initialGameweeks.findIndex(g=>g.id===gameweekId)>=initialGameweeks.length-1} onClick={()=>{const i=initialGameweeks.findIndex(g=>g.id===gameweekId);if(i>=0&&i<initialGameweeks.length-1)setGameweekId(initialGameweeks[i+1].id)}}>›</button></div><small>{gameweekStatusText(gameweek??null,now)}</small>{isDemo&&<div className={styles.demoSwitch}><button className={demoPerspective==="member"?styles.active:""} onClick={()=>{setDemoPerspective("member");setView("dashboard")}}>Member View</button><button className={demoPerspective==="admin"?styles.active:""} onClick={()=>{setDemoPerspective("admin");setView("dashboard")}}>Admin View</button></div>}</div></header>
      <div className={styles.content}><div className={styles.page}>
        {view==="dashboard" && <Dashboard gameweek={gameweek??null} gameweeks={initialGameweeks} profiles={profiles} fixtures={currentFixtures} predictions={currentPredictions} allPredictions={predictions} allAdjustments={adjustments} adjustment={selectedAdjustment} myFixture={selectedFixture} standings={standings} entryFee={entryFee} seasonLabel={seasonLabel} isOpen={isOpen} role={effectiveRole} myId={viewerProfile.id} alertsCount={alertsCount} setView={setView} onLiveRefresh={()=>fastLiveRefresh(true)} liveRefreshing={liveRefreshing}/>}
        {view==="pick" && <PickPage gameweek={gameweek??null} fixtures={currentFixtures.filter(f=>f.is_eligible)} predictions={currentPredictions} profiles={profiles} isOpen={isOpen} myId={viewerProfile.id} selectFixture={selectFixture}/>}
        {view==="fixtures" && <FixturesPage fixtures={dedupeFixtures(allFixtures)}/>}
        {view==="table" && <LeagueTable standings={standings} seasonLabel={seasonLabel} gameweek={gameweek??null} entryFee={entryFee} fixtures={fixtures} predictions={predictions} profiles={profiles} gameweeks={initialGameweeks} adjustments={adjustments}/>}
        {view==="results" && <ResultsPage gameweek={gameweek??null} fixtures={currentFixtures} predictions={currentPredictions} profiles={profiles} onRefresh={()=>refreshLiveData(false)}/>}
        {view==="combined" && <CombinedResultsPage gameweek={gameweek??null} fixtures={currentFixtures} predictions={currentPredictions} profiles={profiles} standings={standings} seasonLabel={seasonLabel} entryFee={entryFee}/>}
        {view==="history" && <HistoryPage seasonHistory={seasonHistory}/>}
        {view==="players" && <PlayersPage profiles={profiles} gameweek={gameweek??null} fixtures={currentFixtures} predictions={currentPredictions} adjustments={adjustments}/>}
        {view==="about" && <AboutPage role={effectiveRole} profiles={profiles}/>}
        {view==="alerts" && isAdmin && (isDemo?<DemoReadOnlyPanel title="Alerts" text="Admin alerts are intentionally hidden in Demo Mode because they can contain operational details."/>:<AlertsPage notice={notice} onCount={setAlertsCount}/>)}
        {view==="admin" && isAdmin && <AdminPage active={adminView} setActive={setAdminView} isUltimate={effectiveRole==="ultimate_admin"} readOnly={isReadOnly} demoMode={isDemo} onEmulate={(id)=>{if(id===initialProfile.id)return notice("You are already viewing your own account.");setEmulatedProfileId(id);setView("dashboard")}} gameweek={gameweek??null} nextGameweek={initialGameweeks.find(g=>g.number===(gameweek?.number??0)+1)??null} profiles={profiles} fixtures={currentFixtures} predictions={currentPredictions} adjustments={adjustments} entryFee={entryFee} notice={notice} onChanged={()=>refreshLiveData(false)}/>}
      </div></div><footer className={styles.footer}>♡ MADE BY THE ARTIST, FOR THE BOUNCE · v{RELEASE_VERSION}</footer>
    </section>
    {emulatedProfile&&<button className={styles.stopEmulating} onClick={()=>setEmulatedProfileId(null)}>✕ Stop emulating {emulatedProfile.display_name}</button>}
    {isDemo&&<div className={styles.demoBadge}>DEMO MODE · READ ONLY</div>}
    {rouss && <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Roussetted" onClick={()=>setRouss(false)}><div className={`${styles.overlayCard} ${styles.flash}`} onClick={e=>e.stopPropagation()}><img src="https://londonhearts.com/images/ianc/images/Gilles_Rousset.jpg" alt="Gilles Rousset during his Hearts career"/><h2>You’ve just been Roussetted</h2><button className={styles.primary} onClick={()=>setRouss(false)}>Close</button></div></div>}
    {toast && <div className={styles.toast}>{toast}</div>}
  </main>;
}

function Heading({eyebrow,title,children,actions}:{eyebrow:string;title:string;children?:ReactNode;actions?:ReactNode}){return <div className={styles.heading}><div><span>{eyebrow}</span><h2>{title}</h2>{children}</div>{actions}</div>}

function Dashboard({
  gameweek,gameweeks,profiles,fixtures,predictions,allPredictions,allAdjustments,adjustment,myFixture,standings,entryFee,seasonLabel,isOpen,role,myId,alertsCount,setView,onLiveRefresh,liveRefreshing
}:{
  gameweek:Gameweek|null;
  gameweeks:Gameweek[];
  profiles:Profile[];
  fixtures:Fixture[];
  predictions:Prediction[];
  allPredictions:Prediction[];
  allAdjustments:ScoreAdjustment[];
  adjustment?:ScoreAdjustment;
  myFixture?:Fixture;
  standings:Standing[];
  entryFee:number;
  seasonLabel:string;
  isOpen:boolean;
  role:Role;
  myId:string;
  alertsCount:number;
  setView:(v:View)=>void;
  onLiveRefresh:()=>void;
  liveRefreshing:boolean;
}){
  const isAdmin = role==="admin" || role==="ultimate_admin";
  const picks=profiles.map(profile=>{
    const prediction=predictions.find(p=>p.member_id===profile.id);
    return {profile,prediction,fixture:fixtures.find(f=>f.id===prediction?.fixture_id)};
  });
  const missingPicks=picks.filter(({prediction})=>!prediction).map(({profile})=>profile);
  function remindMissingPicks(){
    if(!gameweek||!missingPicks.length)return;
    const names=missingPicks.map(p=>`• ${p.display_name}`).join("\n");
    const message=`⚽ BOUNCE BTTS LEAGUE — PICK REMINDER\n\nStill to make a pick for GW ${gameweek.number}:\n${names}\n\nMake your BTTS pick here:\nhttps://bounce-btts.vercel.app\n\nDeadline: ${formatKickoff(gameweek.locks_at)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");
  }
  const finished=fixtures.filter(f=>finishedStatuses.includes(f.status));
  const finalResultsReady=Boolean(gameweek)&&!isOpen&&picks.length>0&&picks.every(({profile,prediction,fixture})=>prediction?Boolean(fixture&&finishedStatuses.includes(fixture.status)):allAdjustments.some(a=>a.gameweek_id===gameweek?.id&&a.member_id===profile.id));
  const finalResultRows=picks.map(({profile,prediction,fixture})=>{
    const adjustment=allAdjustments.find(a=>a.gameweek_id===gameweek?.id&&a.member_id===profile.id);
    const outcome=fixture?outcomeLabel(fixture.home_score,fixture.away_score,fixture.status,prediction?.points_awarded??null):null;
    return {player:profile.display_name,homeTeam:fixture?.home_team??null,awayTeam:fixture?.away_team??null,status:fixture?.status??null,homeScore:fixture?.home_score??null,awayScore:fixture?.away_score??null,points:prediction?.points_awarded??outcome?.points??adjustment?.points??null,outcome:outcome?.label??(adjustment?"MISSED PICK":"PENDING")};
  });
  const myStanding=standings.find(s=>s.id===myId);
  const myPosition=Math.max(1,standings.findIndex(s=>s.id===myId)+1);
  const submitted=predictions.length;
  const [formRange,setFormRange]=useState<6|12|18>(6);
  const currentPoints=predictions.reduce((sum,p)=>sum+(p.points_awarded??0),0)+allAdjustments.filter(a=>a.gameweek_id===gameweek?.id && !(a.reason.trim().toLowerCase()==="missed selection"&&predictions.some(p=>p.member_id===a.member_id&&p.gameweek_id===a.gameweek_id&&p.points_awarded!=null))).reduce((sum,a)=>sum+a.points,0);

  const selectedNumber=gameweek?.number??Math.max(0,...gameweeks.map(g=>g.number));
  const formGameweeks=[...gameweeks]
    .filter(g=>g.number<=selectedNumber)
    .sort((a,b)=>b.number-a.number)
    .slice(0,formRange)
    .sort((a,b)=>a.number-b.number);

  function pointsFor(playerId:string,gwId:string){
    const pred=allPredictions.find(p=>p.member_id===playerId&&p.gameweek_id===gwId&&p.points_awarded!=null);
    if(pred?.points_awarded!=null)return pred.points_awarded;
    const adj=allAdjustments.find(a=>a.member_id===playerId&&a.gameweek_id===gwId);
    return adj?.points??null;
  }
  function formClass(points:number|null){
    if(points===3)return styles.formWin;
    if(points===1)return styles.formScoreNil;
    if(points===-1)return styles.formLoss;
    return styles.formEmpty;
  }
  async function shareForm(){
    const scale=2, width=1120, rowH=62, headerH=150, height=headerH+rowH*(standings.length+1)+34;
    const canvas=document.createElement("canvas"); canvas.width=width*scale; canvas.height=height*scale;
    const ctx=canvas.getContext("2d"); if(!ctx)return;
    ctx.scale(scale,scale); ctx.fillStyle="#130f13"; ctx.fillRect(0,0,width,height);
    ctx.fillStyle="#661b35"; ctx.fillRect(0,0,width,108);
    ctx.fillStyle="#f4e5d6"; ctx.font="bold 34px Georgia"; ctx.fillText("BOUNCE BTTS LEAGUE",32,48);
    ctx.font="18px Arial"; ctx.fillText(`Season ${seasonLabel} · ${formRange}-week form · through GW ${gameweek?.number??"—"}`,32,82);
    const nameW=250, totalW=90, availableW=width-64-nameW-totalW, cellW=availableW/Math.max(formGameweeks.length,1), y0=130;
    ctx.font="bold 15px Arial"; ctx.fillStyle="#d8c1ad"; ctx.fillText("PLAYER",32,y0+30);
    formGameweeks.forEach((g,i)=>ctx.fillText(`GW ${g.number}`,32+nameW+i*cellW,y0+30)); ctx.fillText("TOTAL",width-32-totalW,y0+30);
    standings.forEach((player,r)=>{const y=y0+rowH*(r+1); if(r%2===0){ctx.fillStyle="#1a171c";ctx.fillRect(24,y-8,width-48,rowH)} ctx.fillStyle="#f0e4da";ctx.font="bold 16px Arial";ctx.fillText(player.name,32,y+28);const values=formGameweeks.map(g=>pointsFor(player.id,g.id));values.forEach((pt,i)=>{ctx.fillStyle=pt===3?"#75d7a1":pt===1?"#e9c56e":pt===-1?"#ee8993":"#8e878a";ctx.font="bold 16px Arial";ctx.fillText(pt==null?"—":pt>0?`+${pt}`:`${pt}`,32+nameW+i*cellW,y+28)});const total=values.reduce<number>((sum,pt)=>sum+(pt??0),0);ctx.fillStyle="#f0e4da";ctx.fillText(total>0?`+${total}`:`${total}`,width-32-totalW,y+28)});
    const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",0.94)); if(!blob)return;
    const file=new File([blob],`bounce-form-${formRange}w.jpg`,{type:"image/jpeg"});
    try{if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:`Bounce ${formRange}-week form`});return}}catch{}
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  const statusText = !gameweek ? "No gameweek selected" :
    gameweek.status==="complete" ? "Gameweek complete" :
    isOpen ? "Selections open" : "Selections closed";

  return <section className={`${styles.dashboard} compactDashboard ${isAdmin?"adminDashboard":""}`}>
    <div className={`${styles.dashboardIntro} adminDashboardIntro`}>
      <div>
        <span className={styles.eyebrow}>SEASON {seasonLabel} · {gameweek?`GAMEWEEK ${gameweek.number}`:"OVERVIEW"}</span>
        <h2>{isAdmin?"League Control Centre":"Your League Dashboard"}</h2>
        <p>{isAdmin?"Live league position, selections, results and admin status in one place.":"Your pick, current standing, weekly results and recent form in one place."}</p>
      </div>
      <div className={styles.dashboardArt} aria-hidden="true">
        <img src="/assets/st-giles-heart.jpg" alt=""/>
        <img src="/assets/bounce-cup.png" alt=""/>
      </div>
    </div>

    <div className="mobileDashboardActions" aria-label="Dashboard shortcuts">
      <button onClick={()=>setView("pick")}><span>⚑</span><strong>{isOpen?"Make My Pick":"View My Pick"}</strong></button>
      <button onClick={()=>setView("table")}><span>☷</span><strong>League Table</strong></button>
      <button onClick={()=>document.getElementById("current-form")?.scrollIntoView({behavior:"smooth",block:"start"})}><span>↗</span><strong>Current Form</strong></button>
      <button onClick={()=>document.getElementById("weekly-picks")?.scrollIntoView({behavior:"smooth",block:"start"})}><span>◉</span><strong>All Picks</strong></button>
    </div>

    <div className={`${styles.dashboardStats} adminDashboardStats`}>
      <article className={styles.statCard}>
        <span>YOUR POSITION</span><strong>{myStanding?`${myPosition}${myPosition===1?"st":myPosition===2?"nd":myPosition===3?"rd":"th"}`:"—"}</strong>
        <small>{myStanding?`${myStanding.points} pts · ${myStanding.wins} BTTS wins`:"No scored picks yet"}</small>
      </article>
      <article className={styles.statCard}>
        <span>GAMEWEEK</span><strong>{gameweek?`GW ${gameweek.number}`:"—"}</strong>
        <small>{statusText}</small>
      </article>
      <article className={styles.statCard}>
        <span>SELECTIONS</span><strong>{submitted}/{profiles.length}</strong>
        <small>{finished.length} selected fixtures finished</small>
      </article>
      <article className={styles.statCard}>
        <span>PRIZE POT</span><strong>£{(profiles.length*entryFee).toFixed(0)}</strong>
        <small>{isAdmin?`${currentPoints>=0?"+":""}${currentPoints} net GW points awarded`:"Current season pot"}</small>
      </article>
      {isAdmin&&<article className={styles.statCard}>
        <span>ADMIN ALERTS</span><strong>{alertsCount}</strong>
        <small>{alertsCount?`${alertsCount} need attention`:"Nothing outstanding"}</small>
      </article>}
    </div>

    <div className={`${styles.dashboardMain} mobileDashboardMain`}>
      <div className={`${styles.dashboardPrimary} mobileDashboardPrimary`}>
        <article className={`${styles.panel} ${styles.pickPanel} mobilePickPanel`}>
          <div className={styles.panelHeading}>
            <div><div className={styles.title}>YOUR PICK</div><h3>{gameweek?`Gameweek ${gameweek.number}`:"Current gameweek"}</h3></div>
            <button className={styles.linkButton} onClick={()=>setView("pick")}>{isOpen?"Change / make pick":"View picks"} →</button>
          </div>
          {myFixture?<div className={styles.pickHeroLarge}>
            <div><span>HOME</span><strong>{myFixture.home_team}</strong></div>
            <div className={styles.pickScore}>
              <b>{myFixture.home_score!=null?`${myFixture.home_score} — ${myFixture.away_score}`:"V"}</b>
              <small>{fixtureStatusLabel(myFixture)}</small>
            </div>
            <div><span>AWAY</span><strong>{myFixture.away_team}</strong></div>
            <footer>{formatKickoff(myFixture.kickoff_at)} · BTTS {myFixture.odds_fractional??"Odds unavailable"}</footer>
          </div>:adjustment?<div className={styles.missedPick}><strong>MISSED DEADLINE</strong><span>{adjustment.points} point(s)</span><small>{adjustment.reason}</small></div>:<div className={styles.emptyPick}><p>No selection has been saved for this gameweek.</p><button className={styles.primary} disabled={!isOpen} onClick={()=>setView("pick")}>{isOpen?"Make your BTTS pick":"Selections are currently closed"}</button></div>}
        </article>

        <article id="weekly-picks" className={`${styles.panel} weeklyPicksPanel`}>
          <div className={styles.panelHeading}>
            <div><div className={styles.title}>GAMEWEEK PICKS & LIVE RESULTS</div><h3>Everyone at a glance</h3></div>
            <div className="dashboardActionGrid">
              <button type="button" className="dashboardGoldAction" onClick={onLiveRefresh} disabled={liveRefreshing}>{liveRefreshing?"Refreshing…":"Fixture refresh"}</button>
              <button type="button" className="dashboardGoldAction" onClick={()=>setView("combined")}>Combined results</button>
              <WeeklyPicksShareButton disabled={!gameweek} gameweekNumber={gameweek?.number??0} seasonLabel={seasonLabel} picks={picks.filter(p=>p.fixture).map(p=>({player:p.profile.display_name,homeTeam:p.fixture!.home_team,awayTeam:p.fixture!.away_team,competition:competitionDisplayName(p.fixture!),kickoffAt:p.fixture!.kickoff_at,odds:p.fixture!.odds_fractional,status:p.fixture!.status,homeScore:p.fixture!.home_score,awayScore:p.fixture!.away_score,elapsed:p.fixture!.live_elapsed??null}))}/>
              <CombinedShareButton disabled={!gameweek} gameweekNumber={gameweek?.number??0} seasonLabel={seasonLabel} picks={picks.filter(p=>p.fixture).map(p=>({player:p.profile.display_name,homeTeam:p.fixture!.home_team,awayTeam:p.fixture!.away_team,competition:competitionDisplayName(p.fixture!),kickoffAt:p.fixture!.kickoff_at,odds:p.fixture!.odds_fractional,status:p.fixture!.status,homeScore:p.fixture!.home_score,awayScore:p.fixture!.away_score,elapsed:p.fixture!.live_elapsed??null}))} standings={standings}/>
              {isAdmin&&<button type="button" className="dashboardGoldAction" onClick={remindMissingPicks} disabled={!isOpen||!missingPicks.length} aria-label={missingPicks.length?`Remind ${missingPicks.length} missing picks via WhatsApp`:"All picks are in"}>{missingPicks.length?"Remind Picks":"All Picks In ✓"}</button>}
            </div>
          </div>
          <div className={styles.pickList}>
            {picks.map(({profile,prediction,fixture})=>{
              const outcome=fixture?outcomeLabel(fixture.home_score,fixture.away_score,fixture.status,prediction?.points_awarded??null):null;
              return <div className={`${styles.pickListRow} ${isAdmin&&!prediction?"adminMissingPickRow":""}`} key={profile.id}>
                <div className={styles.playerCell}><span className={styles.avatar}>{initials(profile.display_name)}</span><strong>{profile.display_name}</strong></div>
                <div className={styles.fixtureCell}>{fixture?<><strong>{fixture.home_team} v {fixture.away_team}</strong><small>{competitionDisplayName(fixture)} · {fixture.odds_fractional??"—"}</small></>:<span>Awaiting selection</span>}</div>
                <div className={styles.liveCell}>{fixture?.home_score!=null?<strong>{fixture.home_score}-{fixture.away_score}</strong>:<strong>—</strong>}<small>{fixture?fixtureStatusLabel(fixture):"PENDING"}</small></div>
                <div className={outcome?.tone==="good"?styles.statusGood:outcome?.tone==="warn"?styles.statusWarn:outcome?.tone==="bad"?styles.statusBad:styles.statusNeutral}>{outcome?`${outcome.label}${outcome.points!=null?` · ${outcome.points>0?"+":""}${outcome.points}`:""}`:"PENDING"}</div>
              </div>
            })}
          </div>
        </article>
      </div>

      <aside className={`${styles.dashboardSide} mobileDashboardSide`}>
        <article className={`${styles.panel} ${styles.tablePreview} mobileLeaguePreview`}>
          <div className={styles.tableArtwork} aria-hidden="true"><img src="/assets/bounce-cup.png" alt=""/></div>
          <div className={styles.panelHeading}>
            <div><div className={styles.title}>LEAGUE TABLE</div><h3>Season standings</h3></div>
            <div className="shareHeaderActions"><button className={styles.linkButton} onClick={()=>setView("table")}>Full table →</button><ShareTableButton compact rows={standings} seasonLabel={seasonLabel} gameweekNumber={gameweek?.number??null} prizePot={profiles.length*entryFee}/></div>
          </div>
          <div className={styles.miniTable}>
            {standings.slice(0,8).map((r,i)=><div className={`${styles.miniTableRow} ${r.id===myId?styles.myRow:""} ${i===0?styles.firstRow:""}`} key={r.id}>
              <span className={styles.position}>{i+1}</span>
              <span className={styles.tableName}>{i===0&&<span className={styles.trophy}>🏆</span>}<strong>{r.name}</strong></span>
              <span>{r.played}</span><span>{r.wins}W</span><b>{r.points}</b>
            </div>)}
          </div>
          
        </article>

        <article className={`${styles.panel} mobileRedundantLinks`}>
          <div className={styles.title}>{isAdmin?"ADMIN SHORTCUTS":"QUICK LINKS"}</div>
          <div className={styles.quickLinks}>
            <button onClick={()=>setView("table")}>☷ <span><strong>League Table</strong><small>Full standings & tie-break detail</small></span></button>
            <button onClick={()=>setView("results")}>✦ <span><strong>Results</strong><small>Selected matches & all fixtures</small></span></button>
            <button onClick={()=>setView("players")}>◉ <span><strong>Players</strong><small>Who has picked this week</small></span></button>
            {isAdmin&&<button onClick={()=>setView("admin")}>⚙ <span><strong>Admin</strong><small>Selections, results & fixture controls</small></span></button>}
          </div>
        </article>
      </aside>
    </div>

    <article id="current-form" className={`${styles.panel} ${styles.formPanel}`}>
      <div className={styles.panelHeading}>
        <div><div className={styles.title}>{formRange}-WEEK FORM</div><h3>Recent league form</h3></div>
        <div className="shareHeaderActions"><select aria-label="Form range" value={formRange} onChange={e=>setFormRange(Number(e.target.value) as 6|12|18)}><option value={6}>6 weeks</option><option value={12}>12 weeks</option><option value={18}>18 weeks</option></select><button className="shareCompactWhatsApp" onClick={shareForm}>Share to WhatsApp</button></div>
      </div>
      <div className={styles.formLegend}><span className={styles.formWin}>+3</span><small>BTTS</small><span className={styles.formScoreNil}>+1</span><small>Score–nil</small><span className={styles.formLoss}>-1</span><small>0–0 / missed</small></div>
      <div className={styles.formTableWrap}>
        <div className={styles.formTable} style={{gridTemplateColumns:`minmax(150px,1.5fr) repeat(${Math.max(formGameweeks.length,1)},minmax(54px,1fr)) 72px`}}>
          <div className={`${styles.formCell} ${styles.formHeader}`}>PLAYER</div>
          {formGameweeks.map(g=><div className={`${styles.formCell} ${styles.formHeader}`} key={g.id}>GW {g.number}</div>)}
          {!formGameweeks.length&&<div className={`${styles.formCell} ${styles.formHeader}`}>FORM</div>}
          <div className={`${styles.formCell} ${styles.formHeader}`}>TOTAL</div>
          {standings.map(player=>{
            const values=formGameweeks.map(g=>pointsFor(player.id,g.id));
            const total=values.reduce<number>((sum,p)=>sum+(p??0),0);
            return <div className={styles.formRow} style={{gridColumn:"1/-1",display:"grid",gridTemplateColumns:`minmax(150px,1.5fr) repeat(${Math.max(formGameweeks.length,1)},minmax(54px,1fr)) 72px`}} key={player.id}>
              <div className={`${styles.formCell} ${styles.formName}`}>{player.name}</div>
              {values.map((p,i)=><div className={styles.formCell} key={`${player.id}-${formGameweeks[i].id}`}><span className={`${styles.formPill} ${formClass(p)}`}>{p==null?"—":p>0?`+${p}`:p}</span></div>)}
              {!values.length&&<div className={styles.formCell}><span className={`${styles.formPill} ${styles.formEmpty}`}>—</span></div>}
              <div className={`${styles.formCell} ${styles.formTotal}`}>{total>0?`+${total}`:total}</div>
            </div>
          })}
        </div>
      </div>
    </article>
  </section>
}

function PickPage({gameweek,fixtures,predictions,profiles,isOpen,myId,selectFixture}:{gameweek:Gameweek|null;fixtures:Fixture[];predictions:Prediction[];profiles:Profile[];isOpen:boolean;myId:string;selectFixture:(id:string)=>void}){
  const [search,setSearch]=useState(""); const q=search.toLowerCase().trim();
  const filtered=[...fixtures].filter(f=>!q||`${f.home_team} ${f.away_team} ${f.competition} ${f.country} ${competitionDisplayName(f)}`.toLowerCase().includes(q)).sort(fixtureSort);
  const countries=Array.from(new Set(filtered.map(f=>normaliseCountry(f.country))));
  return <section><Heading eyebrow={gameweek?`GAMEWEEK ${gameweek.number}`:"NO GAMEWEEK"} title="Make My Pick"><p>Choose one unique eligible fixture. <Help text="Search by team, country or competition, or browse the collapsible fixture groups."/></p></Heading><div className={styles.panel}><input className={styles.search} type="search" placeholder="Search team, country or competition…" value={search} onChange={e=>setSearch(e.target.value)}/>{countries.map(country=><details className={styles.fixtureDetailsNested} key={country} open={Boolean(q)}><summary>{country}</summary>{Array.from(new Set(filtered.filter(f=>normaliseCountry(f.country)===country).map(competitionDisplayName))).map(group=><details className={styles.fixtureDetailsLeague} key={group} open={Boolean(q)}><summary>{group}</summary>{filtered.filter(f=>normaliseCountry(f.country)===country&&competitionDisplayName(f)===group).map(f=>{const pred=predictions.find(p=>p.fixture_id===f.id&&p.gameweek_id===gameweek?.id);const owner=profiles.find(p=>p.id===pred?.member_id);return <div className={styles.row} key={f.id}><span>{formatKickoff(f.kickoff_at)}</span><strong>{f.home_team} v {f.away_team}</strong><span>{f.odds_fractional??"—"}</span><button className={styles.button} disabled={!isOpen||!!(owner&&owner.id!==myId)} onClick={()=>selectFixture(f.id)}>{owner?.id===myId?"Picked ✓":owner?`Taken by ${owner.display_name}`:isOpen?"Select":"Closed"}</button></div>})}</details>)}</details>)}</div></section>
}
function FixturesPage({fixtures}:{fixtures:Fixture[]}){
  const [search,setSearch]=useState(""); const q=search.toLowerCase().trim();
  const filtered=[...fixtures].filter(f=>!q||`${f.home_team} ${f.away_team} ${f.country} ${competitionDisplayName(f)}`.toLowerCase().includes(q)).sort((a,b)=>a.kickoff_at.localeCompare(b.kickoff_at)||fixtureSort(a,b));
  const dayKey=(f:Fixture)=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(f.kickoff_at));
  const days=Array.from(new Set(filtered.map(dayKey)));
  return <section><Heading eyebrow="TWO-WEEK FIXTURE LIST" title="Fixtures"><p>Search or browse by day, country and competition.</p></Heading><div className={styles.panel}><input className={styles.search} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search fixtures…"/>{days.map((day,dayIndex)=>{const dayFixtures=filtered.filter(f=>dayKey(f)===day);const countries=Array.from(new Set(dayFixtures.map(f=>normaliseCountry(f.country))));return <details className={styles.fixtureDetails} key={day} open={Boolean(q)||dayIndex===0}><summary>{new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",weekday:"long",day:"numeric",month:"long"}).format(new Date(`${day}T12:00:00Z`))}<span>{dayFixtures.length} fixtures</span></summary>{countries.map(country=><details className={styles.fixtureDetailsNested} key={country} open={Boolean(q)}><summary>{country}</summary>{Array.from(new Set(dayFixtures.filter(f=>normaliseCountry(f.country)===country).map(competitionDisplayName))).map(comp=><details className={styles.fixtureDetailsLeague} key={comp} open={Boolean(q)}><summary>{comp}</summary>{dayFixtures.filter(f=>normaliseCountry(f.country)===country&&competitionDisplayName(f)===comp).map(f=><div className={styles.row} key={f.id}><span>{formatKickoff(f.kickoff_at)}</span><span><strong>{f.home_team} v {f.away_team}</strong></span><strong>{f.odds_fractional??"—"}</strong><span>{fixtureStatusLabel(f)}</span></div>)}</details>)}</details>)}</details>})}</div></section>
}
function SeasonPositionTimeline({profiles,gameweeks,predictions,adjustments}:{profiles:Profile[];gameweeks:Gameweek[];predictions:Prediction[];adjustments:ScoreAdjustment[]}){
  const activeWeeks=useMemo(()=>[...gameweeks].filter(g=>predictions.some(p=>p.gameweek_id===g.id&&p.points_awarded!=null)||adjustments.some(a=>a.gameweek_id===g.id)).sort((a,b)=>a.number-b.number),[gameweeks,predictions,adjustments]);
  const timeline=useMemo(()=>activeWeeks.map((gw,weekIndex)=>{
    const included=new Set(activeWeeks.slice(0,weekIndex+1).map(g=>g.id));
    const rows=profiles.map(profile=>{
      let points=0,wins=0,zeroZeroCount=0;
      for(const pred of predictions){if(pred.member_id!==profile.id||!included.has(pred.gameweek_id)||pred.points_awarded==null)continue;points+=pred.points_awarded;if(pred.points_awarded===3)wins+=1;if(pred.points_awarded===-1)zeroZeroCount+=1;}
      for(const adj of adjustments){if(adj.member_id!==profile.id||!included.has(adj.gameweek_id))continue;const scored=predictions.some(p=>p.member_id===adj.member_id&&p.gameweek_id===adj.gameweek_id&&p.points_awarded!=null);if(adj.reason.trim().toLowerCase()==="missed selection"&&scored)continue;points+=adj.points;}
      return {id:profile.id,name:profile.display_name,points,wins,zeroZeroCount};
    }).sort((a,b)=>b.points-a.points||a.zeroZeroCount-b.zeroZeroCount||b.wins-a.wins||a.name.localeCompare(b.name));
    return {number:gw.number,rows:rows.map((row,index)=>({...row,position:index+1}))};
  }),[activeWeeks,profiles,predictions,adjustments]);
  const [step,setStep]=useState(0);
  const [playing,setPlaying]=useState(true);
  const [speed,setSpeed]=useState<1|2>(1);
  const [focus,setFocus]=useState<string|null>(null);
  useEffect(()=>{setStep(0);setPlaying(timeline.length>1)},[timeline.length]);
  useEffect(()=>{if(!playing||step>=timeline.length-1)return;const t=window.setTimeout(()=>setStep(v=>Math.min(v+1,timeline.length-1)),1800/speed);return()=>window.clearTimeout(t)},[playing,step,timeline.length,speed]);
  useEffect(()=>{if(step>=timeline.length-1)setPlaying(false)},[step,timeline.length]);
  if(!timeline.length)return <div className={styles.seasonTimeline}><div className={styles.timelineHeading}><div><span>SEASON POSITION TIMELINE</span><h3>The race through the season</h3></div></div><div className={styles.timelineEmpty}>Position history will appear as soon as the first gameweek is scored.</div></div>;
  const width=920,height=Math.max(350,profiles.length*48+90),left=48,right=150,top=34,bottom=48,plotW=width-left-right,plotH=height-top-bottom;
  const x=(i:number)=>left+(timeline.length===1?0:(i*plotW)/(timeline.length-1));
  const y=(pos:number)=>top+(profiles.length<=1?0:((pos-1)*plotH)/(profiles.length-1));
  const colours=['#f6cf79','#f08ba2','#8ed0ff','#9be29b','#c3a0ff','#ffb36b','#7fe0d0','#e9e9e9','#d2a679','#ff8fcf','#8fb3ff','#b7e36f'];
  const shown=timeline.slice(0,step+1);
  const current=timeline[step];
  return <div className={styles.seasonTimeline}>
    <div className={styles.timelineHeading}><div><span>SEASON POSITION TIMELINE</span><h3>The race through the season</h3><p>Animated gameweek-by-gameweek using the same league-table tie-break rules.</p></div><div className={styles.timelineNow}><span>VIEWING</span><strong>GW {current.number}</strong></div></div>
    <div className={styles.timelineControls}><button onClick={()=>setPlaying(v=>!v)} disabled={timeline.length<2}>{playing?'Pause':'Play'}</button><button onClick={()=>{setStep(0);setPlaying(timeline.length>1)}}>Restart</button><button onClick={()=>setSpeed(v=>v===1?2:1)} aria-pressed={speed===2}>{speed===1?"×2 Speed":"Normal"}</button><input aria-label="Timeline gameweek" type="range" min={0} max={timeline.length-1} value={step} onChange={e=>{setStep(Number(e.target.value));setPlaying(false)}}/><span>GW {current.number}</span></div>
    <div className={styles.timelineChartWrap}><svg className={styles.timelineChart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`League positions through gameweek ${current.number}`}>
      {profiles.map((_,i)=><g key={`grid-${i}`}><line x1={left} x2={width-right+8} y1={y(i+1)} y2={y(i+1)} className={styles.timelineGrid}/><text x={left-14} y={y(i+1)+5} textAnchor="end" className={styles.timelinePositionLabel}>{i+1}</text></g>)}
      {shown.map((week,i)=><g key={`gw-${week.number}`}><line x1={x(i)} x2={x(i)} y1={top} y2={height-bottom} className={styles.timelineVertical}/><text x={x(i)} y={height-15} textAnchor="middle" className={styles.timelineGwLabel}>GW {week.number}</text></g>)}
      {profiles.map((profile,playerIndex)=>{const points=shown.map((week,i)=>{const row=week.rows.find(r=>r.id===profile.id);return `${x(i)},${y(row?.position??profiles.length)}`}).join(' ');const currentRow=current.rows.find(r=>r.id===profile.id);const dim=focus&&focus!==profile.id;const colour=colours[playerIndex%colours.length];return <g key={profile.id} className={dim?styles.timelineDim:styles.timelineSeries} onClick={()=>setFocus(v=>v===profile.id?null:profile.id)} style={{cursor:'pointer'}}><polyline points={points} fill="none" stroke={colour} strokeWidth={focus===profile.id?6:4} strokeLinejoin="round" strokeLinecap="round"/><circle cx={x(step)} cy={y(currentRow?.position??profiles.length)} r={focus===profile.id?7:5} fill={colour}/><text x={x(step)+12} y={y(currentRow?.position??profiles.length)+4} className={styles.timelinePlayerLabel} fill={colour}>{profile.display_name}</text></g>})}
    </svg></div>
    <div className={styles.timelineFooter}><span>1st is always at the top</span><strong>{focus?'Tap the highlighted player again to show everyone':'Tap a player line or name to highlight them'}</strong></div>
  </div>
}

function LeagueTable({standings,seasonLabel,gameweek,entryFee,fixtures,predictions,profiles,gameweeks,adjustments}:{standings:Standing[];seasonLabel:string;gameweek:Gameweek|null;entryFee:number;fixtures:Fixture[];predictions:Prediction[];profiles:Profile[];gameweeks:Gameweek[];adjustments:ScoreAdjustment[]}){
  const prizePot=standings.length*entryFee;
  const fixtureById=new Map(fixtures.map(f=>[f.id,f]));
  const completed=predictions.map(prediction=>({prediction,fixture:fixtureById.get(prediction.fixture_id)})).filter((x):x is {prediction:Prediction;fixture:Fixture}=>Boolean(x.fixture&&x.fixture.home_score!=null&&x.fixture.away_score!=null&&finishedStatuses.includes(x.fixture.status)));
  const selected=predictions.map(prediction=>({prediction,fixture:fixtureById.get(prediction.fixture_id)})).filter((x):x is {prediction:Prediction;fixture:Fixture}=>Boolean(x.fixture));
  const insights=standings.map(row=>{const done=completed.filter(x=>x.prediction.member_id===row.id);const picks=selected.filter(x=>x.prediction.member_id===row.id);const goals=done.reduce((sum,x)=>sum+Number(x.fixture.home_score??0)+Number(x.fixture.away_score??0),0);const home=done.filter(x=>(x.fixture.home_score??0)>(x.fixture.away_score??0)).length;const away=done.filter(x=>(x.fixture.away_score??0)>(x.fixture.home_score??0)).length;const draws=done.filter(x=>(x.fixture.home_score??0)===(x.fixture.away_score??0)).length;const comps=new Map<string,number>();picks.forEach(x=>{const c=competitionDisplayName(x.fixture);comps.set(c,(comps.get(c)??0)+1)});const favourite=[...comps.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]??"—";return {...row,goals,average:done.length?goals/done.length:0,home,away,draws,favourite}});
  const goalKing=[...insights].sort((a,b)=>b.goals-a.goals||b.wins-a.wins)[0];const homeHunter=[...insights].sort((a,b)=>b.home-a.home)[0];const awayHunter=[...insights].sort((a,b)=>b.away-a.away)[0];const drawMagnet=[...insights].sort((a,b)=>b.draws-a.draws)[0];const bttsKing=[...insights].sort((a,b)=>b.wins-a.wins||b.points-a.points)[0];const leagueGoals=completed.reduce((sum,x)=>sum+Number(x.fixture.home_score??0)+Number(x.fixture.away_score??0),0);
  const facts=[{label:"GOAL MAGNET",value:goalKing?.goals?goalKing.name:"—",detail:goalKing?.goals?`${goalKing.goals} goals in finished picks`:"Waiting for finished picks"},{label:"BTTS KING",value:bttsKing?.wins?bttsKing.name:"—",detail:bttsKing?.wins?`${bttsKing.wins} BTTS wins`:"No BTTS wins yet"},{label:"HOME-WIN HUNTER",value:homeHunter?.home?homeHunter.name:"—",detail:homeHunter?.home?`${homeHunter.home} selected matches ended home wins`:"No trend yet"},{label:"AWAY-WIN HUNTER",value:awayHunter?.away?awayHunter.name:"—",detail:awayHunter?.away?`${awayHunter.away} selected matches ended away wins`:"No trend yet"},{label:"DRAW MAGNET",value:drawMagnet?.draws?drawMagnet.name:"—",detail:drawMagnet?.draws?`${drawMagnet.draws} selected matches ended level`:"No trend yet"}];
  return <section className={styles.leaguePage}><Heading eyebrow={`SEASON ${seasonLabel} · ${gameweek?`GAMEWEEK ${gameweek.number}`:""} · EST 2024`} title="League Table" actions={<span className={styles.shareInline}><ShareTableButton rows={standings} seasonLabel={seasonLabel} gameweekNumber={gameweek?.number??null} prizePot={prizePot}/></span>}><p>S-N = score–nil +1. Ties: fewest 0–0 results, most BTTS wins, then alphabetical.</p></Heading><div className={`${styles.panel} ${styles.table} ${styles.fullLeagueTable} ${styles.enhancedTableShell} ${styles.leagueTableFirst}`}><div className={`${styles.tableRow} ${styles.header}`}><span>POS</span><span>PLAYER</span><span>P</span><span>W</span><span>S-N</span><span>0-0</span><span>PTS</span></div>{standings.map((r,i)=><div key={r.id} className={`${styles.tableRow} ${i===0?styles.leader:""} ${i<3?styles.tableRowTopThree:""}`}><span className={styles.positionCell}>{i===0?"🏆":i+1}</span><strong>{r.name}</strong><span>{r.played}</span><span>{r.wins}</span><span>{r.oneSided}</span><span>{r.zeroZeroCount}</span><b>{r.points}</b></div>)}</div><SeasonPositionTimeline profiles={profiles} gameweeks={gameweeks} predictions={predictions} adjustments={adjustments}/><div className={styles.leagueStatsBand}><article><span>LEAGUE LEADER</span><strong>{standings[0]?.name??"—"}</strong><small>{standings[0]?`${standings[0].points} pts`:"No scores yet"}</small></article><article><span>SEASON POT</span><strong>£{prizePot.toFixed(0)}</strong><small>{standings.length} active players</small></article><article><span>GOALS IN PICKS</span><strong>{leagueGoals}</strong><small>Finished selected fixtures</small></article><article><span>FINISHED PICKS</span><strong>{completed.length}</strong><small>{predictions.length} selections recorded</small></article></div><div className={styles.seasonFacts}>{facts.map(f=><article key={f.label}><span>{f.label}</span><strong>{f.value}</strong><small>{f.detail}</small></article>)}</div><div className={`${styles.panel} ${styles.playerInsightPanel}`}><div className={styles.panelHeading}><div><div className={styles.title}>PLAYER TENDENCIES</div><h3>Season selection stats</h3></div></div><div className={styles.playerInsightGrid}>{insights.map(r=><article key={r.id} className={styles.playerInsightCard}><header><strong>{r.name}</strong><span>{r.points} pts</span></header><div><span>TOTAL GOALS</span><b>{r.goals}</b></div><div><span>AVG GOALS / PICK</span><b>{r.average?r.average.toFixed(1):"—"}</b></div><div><span>RESULT SPLIT</span><b>{r.home}H · {r.draws}D · {r.away}A</b></div><footer><span>Most picked competition</span><strong>{r.favourite}</strong></footer></article>)}</div></div></section>
}
function CombinedResultsPage({gameweek,fixtures,predictions,profiles,standings,seasonLabel,entryFee}:{gameweek:Gameweek|null;fixtures:Fixture[];predictions:Prediction[];profiles:Profile[];standings:Standing[];seasonLabel:string;entryFee:number}){
  const selected=predictions.map(p=>({prediction:p,fixture:fixtures.find(f=>f.id===p.fixture_id),profile:profiles.find(pr=>pr.id===p.member_id)})).filter((x):x is {prediction:Prediction;fixture:Fixture;profile:Profile}=>Boolean(x.fixture&&x.profile));
  return <section className="combinedResultsPage"><Heading eyebrow={gameweek?`GAMEWEEK ${gameweek.number}`:"RESULTS"} title="Combined Results"><p>Selected fixtures and the current league table together.</p></Heading><div className={`${styles.panel} combinedResultsFixtures`}><div className={styles.title}>SELECTED FIXTURES</div>{selected.map(({prediction,fixture,profile})=>{const outcome=outcomeLabel(fixture.home_score,fixture.away_score,fixture.status,prediction.points_awarded);return <div className={styles.resultRow} key={prediction.id}><strong>{profile.display_name}</strong><span>{fixture.home_team} v {fixture.away_team}</span><b className={styles.score}>{fixture.home_score==null?"—":`${fixture.home_score}-${fixture.away_score}`}</b><span>{fixtureStatusLabel(fixture)}</span><span className={outcome.tone==="good"?styles.statusGood:outcome.tone==="warn"?styles.statusWarn:outcome.tone==="bad"?styles.statusBad:styles.statusNeutral}>{outcome.label} {outcome.points!=null?`(${outcome.points>0?"+":""}${outcome.points})`:""}</span></div>})}{!selected.length&&<div className={styles.notice}>No selected fixtures yet.</div>}</div><div className={`${styles.panel} ${styles.table} ${styles.fullLeagueTable} ${styles.enhancedTableShell} combinedResultsTable`}><div className={`${styles.tableRow} ${styles.header}`}><span>POS</span><span>PLAYER</span><span>P</span><span>W</span><span>S-N</span><span>0-0</span><span>PTS</span></div>{standings.map((r,i)=><div key={r.id} className={`${styles.tableRow} ${i===0?styles.leader:""} ${i<3?styles.tableRowTopThree:""}`}><span className={styles.positionCell}>{i===0?"🏆":i+1}</span><strong>{r.name}</strong><span>{r.played}</span><span>{r.wins}</span><span>{r.oneSided}</span><span>{r.zeroZeroCount}</span><b>{r.points}</b></div>)}</div><div className="combinedResultsMeta">Season {seasonLabel} · Prize pot £{(standings.length*entryFee).toFixed(0)}</div></section>
}

function ResultsPage({gameweek,fixtures,predictions,profiles,onRefresh}:{gameweek:Gameweek|null;fixtures:Fixture[];predictions:Prediction[];profiles:Profile[];onRefresh:()=>void}){
  const selected=predictions.map(p=>({prediction:p,fixture:fixtures.find(f=>f.id===p.fixture_id),profile:profiles.find(pr=>pr.id===p.member_id)})).filter((x):x is {prediction:Prediction;fixture:Fixture;profile:Profile}=>Boolean(x.fixture&&x.profile));
  const resultDayKey=(f:Fixture)=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(f.kickoff_at));
  const ordered=[...fixtures].sort((a,b)=>a.kickoff_at.localeCompare(b.kickoff_at)||fixtureSort(a,b));
  const days=Array.from(new Set(ordered.map(resultDayKey)));
  return <section>
    <Heading eyebrow={gameweek?`GAMEWEEK ${gameweek.number}`:"RESULTS"} title="Results" actions={<div className={styles.headingActions}><DataShareButton title={`Gameweek ${gameweek?.number??"—"} Results`} subtitle="Selected Bounce BTTS fixtures and current outcomes" columns={["PLAYER","FIXTURE","SCORE","STATUS","PTS"]} rows={selected.map(({prediction,fixture,profile})=>[profile.display_name,`${fixture.home_team} v ${fixture.away_team}`,fixture.home_score==null?"—":`${fixture.home_score}-${fixture.away_score}`,fixture.status,prediction.points_awarded==null?"—":prediction.points_awarded])} fileName={`bounce-btts-gw${gameweek?.number??"results"}-results.jpg`} label="Share results" compact/><button className={styles.button} onClick={onRefresh}>Refresh displayed data</button></div>}>
      <p>Selected matches first, followed by every fixture in collapsible day, country and competition groups.</p>
    </Heading>
    <div className={styles.panel}>
      <details className={styles.fixtureDetails} open>
        <summary>Selected Matches<span>{selected.length} pick{selected.length===1?"":"s"}</span></summary>
        {selected.map(({prediction,fixture,profile})=>{const outcome=outcomeLabel(fixture.home_score,fixture.away_score,fixture.status,prediction.points_awarded);return <div className={styles.resultRow} key={prediction.id}><strong>{profile.display_name}</strong><span>{fixture.home_team} v {fixture.away_team}</span><b className={styles.score}>{fixture.home_score==null?"—":`${fixture.home_score}-${fixture.away_score}`}</b><span>{fixture.status}</span><span className={outcome.tone==="good"?styles.statusGood:outcome.tone==="warn"?styles.statusWarn:outcome.tone==="bad"?styles.statusBad:styles.statusNeutral}>{outcome.label} {outcome.points!=null?`(${outcome.points>0?"+":""}${outcome.points})`:""}</span></div>})}
        {!selected.length&&<div className={styles.notice}>No selected matches yet.</div>}
      </details>
    </div>
    <div className={styles.panel}>
      <div className={styles.title}>ALL RESULTS / FIXTURES</div>
      {days.map((day,dayIndex)=>{const dayFixtures=ordered.filter(f=>resultDayKey(f)===day);const countries=Array.from(new Set(dayFixtures.map(f=>normaliseCountry(f.country))));return <details className={styles.fixtureDetails} key={day} open={dayIndex===0}>
        <summary>{new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",weekday:"long",day:"numeric",month:"long"}).format(new Date(`${day}T12:00:00Z`))}<span>{dayFixtures.length} fixture{dayFixtures.length===1?"":"s"}</span></summary>
        {countries.map(country=><details className={styles.fixtureDetailsNested} key={country}><summary>{country}</summary>
          {Array.from(new Set(dayFixtures.filter(f=>normaliseCountry(f.country)===country).map(competitionDisplayName))).map(competition=><details className={styles.fixtureDetailsLeague} key={competition}><summary>{competition}</summary>
            {dayFixtures.filter(f=>normaliseCountry(f.country)===country&&competitionDisplayName(f)===competition).sort(fixtureSort).map(f=><div className={styles.resultRow} key={f.id}><span>{formatKickoff(f.kickoff_at)}</span><span>{f.home_team} v {f.away_team}</span><b className={styles.score}>{f.home_score==null?"—":`${f.home_score}-${f.away_score}`}</b><span>{f.status}</span><span>{predictions.some(p=>p.fixture_id===f.id)?"Selected":""}</span></div>)}
          </details>)}
        </details>)}
      </details>})}
      {!days.length&&<div className={styles.notice}>No fixtures are loaded for this gameweek.</div>}
    </div>
  </section>
}


function HistoryPage({seasonHistory}:{seasonHistory:SeasonHistory[]}){
  const legacy: SeasonHistory[] = Array.from(historicalSeasons).map((season)=>({
    id:`historic-${season.season}`,
    label:season.season,
    isCurrent:false,
    gameweeks:season.weeks,
    completedPicks:season.finalTable.reduce((total,row)=>total+row.played,0),
    standings:season.finalTable.map((row,index)=>({
      id:`${season.season}-${index}`,
      name:row.name,
      played:row.played,
      wins:row.wins,
      oneSided:Math.max(0,row.points-(3*row.wins)+row.losses),
      zeroZeroCount:row.losses,
      points:row.points
    }))
  }));
  const archivedDynamic = seasonHistory.filter((season)=>!season.isCurrent&&!legacy.some((item)=>item.label===season.label));
  const seasons: SeasonHistory[] = [...legacy,...archivedDynamic].sort((a,b)=>b.label.localeCompare(a.label));
  const reigningChampion = rollOfHonour[rollOfHonour.length-1];
  const honourRows = [...rollOfHonour].reverse();
  const [id,setId]=useState(seasons[0]?.id??"");
  const selected: SeasonHistory | undefined = seasons.find((season)=>season.id===id)??seasons[0];
  const selectedWinner = selected?.standings[0];

  return <section className={styles.historyPage}>
    <Heading eyebrow="EST 2024 · SEASON ARCHIVE" title="League History" actions={selected?<DataShareButton title={`${selected.label} Final Table`} subtitle={`Bounce BTTS League archive · ${selected.gameweeks} gameweeks`} columns={["POS","PLAYER","P","W","S-N","0-0","PTS"]} rows={selected.standings.map((row,index)=>[index+1,row.name,row.played,row.wins,row.oneSided??Math.max(0,row.points-(3*row.wins)+row.zeroZeroCount),row.zeroZeroCount,row.points])} fileName={`bounce-btts-${selected.label.replace("/","-")}-archive.jpg`} label="Share archive table" compact/>:undefined}>
      <p>Previous winners, archived tables and the story of the Bounce.</p>
    </Heading>
    <div className={styles.historyHero}>
      <div>
        <span>ROLL OF HONOUR · ARCHIVE</span>
        <h3>Bounce Legacy</h3>
        <p>{seasons.length} season{seasons.length===1?"":"s"} stored · {rollOfHonour.length} champions crowned</p>
      </div>
      <img src="/assets/bounce-cup.png" alt="" aria-hidden="true"/>
    </div>
    <div className={styles.historyStatsBand}>
      <article><span>REIGNING CHAMPION</span><strong>{reigningChampion?.winner ?? "—"}</strong></article>
      <article><span>SELECTED SEASON</span><strong>{selected?.label ?? "—"}</strong></article>
      <article><span>ARCHIVED GAMEWEEKS</span><strong>{selected?.gameweeks ?? 0}</strong></article>
    </div>
    <div className={`${styles.panel} ${styles.honourPanel}`}>
      <div className={styles.panelHeading}>
        <div><span className={styles.eyebrow}>CHAMPIONS</span><h3>Roll of Honour</h3></div>
      </div>
      <div className={styles.honourGrid}>
        {honourRows.map((row,index)=><article className={`${styles.honourCard} ${index===0?styles.honourCardLeader:""}`} key={row.season}>
          <span>{row.season}</span>
          <strong>{row.winner}</strong>
          <small>{index===0?"Reigning champion":"Bounce champion"}</small>
        </article>)}
      </div>
    </div>
    <div className={styles.archiveControls}>
      {seasons.map((season)=><button className={season.id===selected?.id?styles.archiveButtonActive:styles.archiveButton} key={season.id} onClick={()=>setId(season.id)}>{season.label}</button>)}
    </div>
    {selected&&<div className={styles.historySpotlight}>
      <article className={styles.historySpotlightCard}>
        <span>SEASON WINNER</span>
        <strong>{selectedWinner?.name ?? "—"}</strong>
        <small>{selectedWinner ? `${selectedWinner.points} pts · ${selectedWinner.wins} BTTS wins` : "No table data available"}</small>
      </article>
      <article className={styles.historySpotlightCard}>
        <span>GAMEWEEKS</span>
        <strong>{selected.gameweeks}</strong>
        <small>{selected.completedPicks} completed picks logged</small>
      </article>
      <article className={styles.historySpotlightCard}>
        <span>TOP THREE</span>
        <strong>{selected.standings.slice(0,3).map((row)=>row.name).join(" · ") || "—"}</strong>
        <small>Final podium for {selected.label}</small>
      </article>
    </div>}
    {selected&&<div className={`${styles.panel} ${styles.table} ${styles.fullLeagueTable} ${styles.historyTableShell}`}>
      <div className={`${styles.tableRow} ${styles.header}`} style={{gridTemplateColumns:"55px minmax(180px,1fr) repeat(5,70px)"}}>
        <span>POS</span><span>PLAYER</span><span>P</span><span>W</span><span>S-N</span><span>0-0</span><span>PTS</span>
      </div>
      {selected.standings.map((row,index)=><div className={`${styles.tableRow} ${index===0?styles.leader:""} ${index<3?styles.tableRowTopThree:""}`} style={{gridTemplateColumns:"55px minmax(180px,1fr) repeat(5,70px)"}} key={row.id}>
        <span className={styles.positionCell}>{index===0?"🏆":index===1?"🥈":index===2?"🥉":index+1}</span><strong>{row.name}</strong><span>{row.played}</span><span>{row.wins}</span><span>{row.oneSided??Math.max(0,row.points-(3*row.wins)+row.zeroZeroCount)}</span><span>{row.zeroZeroCount}</span><b>{row.points}</b>
      </div>)}
    </div>}
  </section>
}

function PlayersPage({profiles,gameweek,fixtures,predictions,adjustments}:{profiles:Profile[];gameweek:Gameweek|null;fixtures:Fixture[];predictions:Prediction[];adjustments:ScoreAdjustment[]}){return <section><Heading eyebrow="LEAGUE MEMBERS" title="Players"><p>{predictions.filter(p=>p.gameweek_id===gameweek?.id).length} of {profiles.length} have submitted.</p></Heading><div className={styles.panel}>{profiles.map(p=>{const pred=predictions.find(x=>x.member_id===p.id&&x.gameweek_id===gameweek?.id);const fx=fixtures.find(f=>f.id===pred?.fixture_id);const adj=adjustments.find(a=>a.member_id===p.id&&a.gameweek_id===gameweek?.id);return <div className={styles.row} key={p.id}><strong>{p.display_name}</strong><span>{fx?`${fx.home_team} v ${fx.away_team}`:adj?adj.reason:"Awaiting selection"}</span><span>{fx?.odds_fractional??"—"}</span><b>{fx?"PICKED ✓":adj?`${adj.points} pts`:"PENDING"}</b></div>})}</div></section>}

function AboutPage({ role, profiles }: { role: Role; profiles: Profile[] }) {
  const [tab, setTab] = useState<"about" | "rules" | "instructions" | "members" | "releases">("about");
  const tabs: Array<["about" | "rules" | "instructions" | "members" | "releases", string]> = [
    ["about", "About"], ["rules", "Rules"], ["instructions", "Instructions"], ["members", "Members / Admins"], ["releases", "Release History"],
  ];
  return <section>
    <Heading eyebrow="BOUNCE BTTS LEAGUE · EST 2024" title="About"><p>League information, rules and role-specific help.</p></Heading>
    <div className={styles.aboutTabs}>{tabs.map(([id,label]) => <button key={id} className={tab===id?styles.active:""} onClick={()=>setTab(id)}>{label}</button>)}</div>
    <div className={`${styles.panel} ${styles.aboutSection}`}>
      {tab === "about" && <><h3>What is Bounce BTTS?</h3><p>The app runs the private Bounce Both Teams To Score league: one unique BTTS pick per player per gameweek, automatic standings and a shareable public table.</p><p>Established 2024. Current season management, historical tables and weekly sharing are all kept in one place.</p></>}
      {tab === "rules" && <><h3>Rules</h3><ul><li>Choose one eligible fixture to finish BTTS: Yes.</li><li>No two players may choose the same fixture in the same gameweek.</li><li>BTTS = <strong>+3</strong>; score–nil = <strong>+1</strong>; 0–0 = <strong>−1</strong>.</li><li>A missed deadline receives the configured missed-selection adjustment (normally −1).</li><li>Normal deadline is Friday 17:00 UK time unless the admin changes it.</li><li>Ties: fewest 0–0 results, then most BTTS wins, then alphabetical.</li></ul></>}
      {tab === "instructions" && <Instructions role={role}/>}
      {tab === "releases" && <ReleaseHistory/>}
      {tab === "members" && <><h3>Members / Admins</h3>{profiles.map(p => <div className={styles.row} style={{gridTemplateColumns:"1fr 1fr"}} key={p.id}><strong>{p.display_name}</strong><span>{p.role === "ultimate_admin" ? "Ultimate Admin" : p.role === "admin" ? "League Admin" : p.role === "guest" ? "Demo Guest" : "Member"}</span></div>)}{(role === "member" || role === "guest") && <p className={styles.small}>Member view intentionally hides account/security administration details.</p>}</>}
    </div>
  </section>;
}
function DemoReadOnlyPanel({title,text}:{title:string;text:string}){return <section><Heading eyebrow="DEMO MODE" title={title}><p>{text}</p></Heading><div className={styles.panel}><div className={styles.demoNotice}>This section is intentionally read-only in Demo Mode.</div></div></section>}
function DemoUsersAdmin({profiles}:{profiles:Profile[]}){return <div><p className={styles.notice}><strong>Credentials are protected in Demo Mode.</strong> The real username, password and authentication values are not requested or sent to this screen.</p>{profiles.map(p=><div className={styles.demoUserRow} key={p.id}><strong>{p.display_name}</strong><span>Username: ••••••••</span><span>Password: ••••••••</span><span>{p.role==="ultimate_admin"?"Ultimate Admin":p.role==="admin"?"League Admin":"Member"}</span><button className={styles.button} disabled>Unavailable in Demo Mode</button></div>)}</div>}
function ReleaseHistory(){
  const releases=[
    {version:"2.0.0",date:"16 Aug 2026",summary:"Season Position Timeline and v2 league-table experience",changes:["Added an animated Season Position Timeline beneath the main League Table, advancing gameweek by gameweek through the season","Historical positions use the same standings rules as the live league: points, fewest 0-0 results, most BTTS wins, then alphabetical order","Added Play, Pause, Restart and a gameweek scrubber so the season race can be replayed or inspected manually","Players can be tapped to highlight their line while fading the rest, with current-position labels moving through the animation","The chart is fully responsive and designed to fit the mobile card width without horizontal scrolling","Refreshed the League Table presentation with subtle Heart of Midlothian pavement-mosaic texture while retaining the maroon and gold Bounce identity","All existing scoring, selections, live results, sharing, admin controls and mobile Dashboard functionality are preserved"]},
    {version:"1.4.9.11",date:"16 Aug 2026",summary:"Pre-v2 repository and build cleanup",changes:["Baked the complete v1.4.9.10 application state into the real source files so releases no longer depend on historical patch scripts at build time","Simplified the production build back to the standard Next.js build command","Removed obsolete v1.4.x release patch folders and legacy build workflows from the active codebase while retaining their full history in Git","Removed only byte-for-byte duplicate root files where a canonical copy already exists in app, lib, public or supabase","No league behaviour, scoring rules, live results, selections or user-facing functionality was intentionally changed"]},
    {version:"1.4.9.10",date:"15 Aug 2026",summary:"Kept mobile Recent Form names safely inside the card",changes:["Added a consistent left inset to every mobile Recent Form player row so names no longer touch or cross the card edge","Kept the larger player-name styling while ensuring long names remain contained inside the available left column","Preserved the compact right-aligned six-result block and the 6/12/18-week wrapping behaviour","Desktop Recent Form remains unchanged"]},
    {version:"1.4.9.9",date:"15 Aug 2026",summary:"Refined mobile Recent Form alignment",changes:["Moved the compact six-result form block to the right side of each mobile player row so the layout uses the available card width more naturally","Increased mobile player-name size and weight and aligned every name consistently in a flexible left column","6-week results remain on one row while 12-week and 18-week views continue wrapping into rows of six without horizontal scrolling","Desktop Recent Form remains unchanged"]},
    {version:"1.4.9.8",date:"15 Aug 2026",summary:"Tighter mobile form rows with six-result wrapping",changes:["Recent Form result markers now sit tightly beside each player name instead of stretching across the full mobile card width","The 6-week view stays on one compact row","The 12-week view wraps into two compact rows of six results per player","The 18-week view wraps into three compact rows of six results per player","No horizontal scrolling is required and the desktop form layout is unchanged"]},
    {version:"1.4.9.7",date:"15 Aug 2026",summary:"Mobile Recent Form now fits without horizontal scrolling",changes:["Fixed the Recent league form table on iPhone/mobile so the selected form range fits inside the Dashboard card without horizontal scrolling","Player names use a compact fixed column and gameweek results use tightly packed coloured circular indicators","Desktop retains the richer labelled form table while mobile removes the oversized spreadsheet-style columns and total column"]},
    {version:"1.4.9.6",date:"15 Aug 2026",summary:"Missed-selection scoring guard corrected",changes:["League totals now suppress any Missed selection adjustment whenever that player already has a valid scored prediction for the same gameweek, regardless of how the adjustment source was labelled","The invalid GW2 Missed selection adjustment affecting DTB was removed from the live data","Dashboard standings, full league tables, season history and shared table totals now use the same corrected rule","Manual score adjustments for other reasons remain fully additive"]},
    {version:"1.4.9.5",date:"15 Aug 2026",summary:"Dashboard gameweek default and stale penalty scoring corrected",changes:["Opening the app now defaults to the latest gameweek whose opening time has actually been reached","A future gameweek no longer becomes the Dashboard default simply because the previous gameweek has locked","Automatic missed-pick penalties are now ignored if that player has a scored prediction for the same gameweek, preventing a valid later result from being double-counted with an old -1 penalty","Manual/admin score adjustments remain additive and are not suppressed","League standings, season-history totals and Dashboard gameweek points now use the corrected adjustment logic"]},
    {version:"1.4.9.4",date:"15 Aug 2026",summary:"Dashboard action grid and unified fixture sharing",changes:["The Weekly Picks action area now uses equal gold controls for Fixture refresh, Combined results, Share fixtures and Share combined table / fixtures","Admin Remind Picks / All Picks In remains available as the same-size gold control in the action grid","Combined results opens a single view containing the selected fixtures with current live/final outcomes plus the current league table","Share fixtures and Share combined table / fixtures use the exact same fixture renderer, so scores, elapsed status and BTTS outcome colours are identical in both images","Green indicates BTTS winning/won, amber score-nil, red 0-0 and grey pending","The previous mixed Results / Share final results / All Picks In / Refresh styling has been removed"]},
    {version:"1.4.9.3",date:"15 Aug 2026",summary:"Outcome-highlighted shares plus Dashboard final-result and table sharing",changes:["Shared Weekly Picks images now colour-code each BTTS selection state: green when BTTS is winning/won, amber for score-nil, red for 0-0 and grey while pending","Finished picks show their scoring outcome directly in the shared image, including WON +3, SCORE-NIL +1 and 0-0 -1","The Dashboard now includes a Share final results action for all users; it unlocks automatically once every player has a settled fixture result or missed-pick adjustment","The existing Dashboard league-table snapshot control is now labelled clearly as Share league table","Final Results sharing uses the same settled scores, outcome labels and points already used by the league"]},
    {version:"1.4.9.2",date:"15 Aug 2026",summary:"Shared weekly picks now reflect live scoring",changes:["Share Weekly Picks now uses the same current live score, match status and elapsed-minute data visible on the Dashboard","Live matches are shown in the shared image with score and minute, for example 1–1 · 67′","Half-time and finished fixtures display HT / FT states cleanly in the shared image","The share image reflects the latest in-app live refresh rather than only static fixture and odds information"]},
    {version:"1.4.9.1",date:"15 Aug 2026",summary:"Live match minutes shown alongside scores",changes:["Live fixtures now show the provider elapsed match minute neatly alongside each score/status, for example 1–1 · 67′","Elapsed minutes are returned by the fast batched live-score endpoint and applied immediately to Dashboard, Fixtures and Results displays","Half-time and full-time states remain shown as HT and FT rather than a misleading minute value","The elapsed-minute display is visible to all users wherever live fixture scores are shown"]},
    {version:"1.4.9",date:"15 Aug 2026",summary:"Near-live score refresh and batched provider updates",changes:["Current-gameweek selected fixtures now use a dedicated batched API-Football refresh path instead of one provider request per fixture","During live match windows the app automatically checks selected fixtures every 15 seconds, with API responses centrally cached for 15 seconds to reduce duplicate provider usage","The admin Dashboard Weekly Picks action cluster now includes an immediate Refresh control for live scores","Admin → Fixtures Quick results refresh now uses the same fast batched live-score path; the heavier Full fixture & odds refresh remains separate","Finished matches still persist final scores and award points through the existing scoring rules, while the scheduled sync remains as a safety net"]},
    {version:"1.4.8.4",date:"15 Aug 2026",summary:"Consistent Dashboard structure across all roles",changes:["Reviewed Dashboard rendering for Ultimate Admin, Admin, Member and Guest roles","The compact mobile Dashboard hierarchy now applies consistently to every role","All roles use the same compact header, four-shortcut row, status strip, Weekly Picks, League Table and Current Form structure","Admin-only reminder controls, Admin Alerts and administrative actions remain visible only to authorised admin roles","Member and guest views no longer fall back to the older mobile Dashboard ordering or spacing"]},
    {version:"1.4.8.3",date:"15 Aug 2026",summary:"Denser mobile shortcuts, status strip and form view",changes:["The four primary Dashboard shortcuts now fit in one compact horizontal row on mobile with no horizontal scrolling","The compact position/gameweek/selections/prize/admin status strip now sits directly below the shortcuts and fits in one row","Weekly Picks and the current League Table remain immediately below the compact top controls","Current Form no longer uses a horizontally scrolling spreadsheet layout on mobile","Mobile form rows now show each player with tightly packed coloured result icons, removing oversized gameweek spacing while retaining the richer desktop table"]},
    {version:"1.4.8.2",date:"15 Aug 2026",summary:"True compact admin mobile hierarchy",changes:["Admin mobile header is reduced to a slim identity strip rather than a prominent hero card","The five admin summary cards are converted into a small low-priority horizontal status strip","Weekly Picks now genuinely follows the four primary shortcuts, with the current League Table immediately after it","Your Pick, Current Form and compact status information move below the two most useful live league sections","Corrected the mobile hierarchy selectors so the intended compact layout now applies to CSS-module dashboard elements"]},
    {version:"1.4.8.1",date:"15 Aug 2026",summary:"Condensed admin mobile dashboard and persistent reminder action",changes:["Admin Dashboard reminder now sits directly beside the Weekly Picks Share to WhatsApp control","The reminder stays visible for admins at all times and fades into a disabled All Picks In state when no reminder is required or the gameweek is closed","Weekly Picks share and reminder controls are reduced and aligned together on mobile","Mobile admin Dashboard intro and summary area are substantially condensed","Weekly Picks and the current League Table now appear immediately after the four primary mobile shortcuts, ahead of lower-priority dashboard detail"]},
    {version:"1.4.8",date:"15 Aug 2026",summary:"Admin pick reminders and mobile member cleanup",changes:["Admins can send a WhatsApp pick reminder directly from the Dashboard weekly-picks section; only members still missing a current-gameweek pick are listed and the message includes the Bounce link and deadline","Mobile Dashboard now prioritises Make My Pick, League Table, Current Form and All Picks while retaining every existing feature through the menu","Mobile stats, pick rows, results and collapsible fixture groups have cleaner spacing and touch targets, with duplicate shortcut clutter reduced","Maroon/gold and Heart of Midlothian pavement-mosaic styling is reinforced across the mobile experience","Fixed the old emulation fallback typo and cleaned the remaining public-table flex alignment warning","Automated outbound WhatsApp reminders remain deliberately shelved"]},
    {version:"1.4.7.9",date:"15 Aug 2026",summary:"Future-gameweek member pick lock",changes:["Dashboard and Make My Pick now only accept normal picks for the actual current gameweek","Admins follow the same normal gameweek open/lock rules as members outside Admin > Selections","Future-week picks remain deliberately available through Admin > Selections only, preventing accidental early selections"]},
    {version:"1.4.7.8",date:"14 Aug 2026",summary:"English League One / League Two share order corrected",changes:["Weekly picks share now places English League One above English League Two when kickoff times match","English competition hierarchy is now Premier League, Championship, League One, League Two","No scoring, odds calculation or fixture data behaviour changed"]},
    {version:"1.4.7.7",date:"14 Aug 2026",summary:"Compact gold sharing controls and dashboard alignment",changes:["Dashboard share controls now use the same gold treatment across league table, current form and weekly picks","Share controls are reduced in size and aligned in the immediate top-right action area of their section","Visible share wording is standardised to Share to WhatsApp while retaining formatted-image generation and native share behaviour"]},
    {version:"1.4.7.6",date:"14 Aug 2026",summary:"Weekly share competition grouping corrected",changes:["Weekly picks share now keeps English and Scottish league blocks separate when kickoff times match","Competition matching now uses explicit English/Scottish league names so Scottish League Two can no longer be mistaken for English League Two","The same corrected order is used on mobile and browser share images"]},
    {version:"1.4.7.5",date:"14 Aug 2026",summary:"Weekly picks share ordering",changes:["Weekly picks share images are sorted into betting-page order rather than player/slot order","Ordering uses kickoff time, competition priority and fixture order","Combined odds use the same sorted set of selections"]},
    {version:"1.4.7.4",date:"14 Aug 2026",summary:"WhatsApp credentials sharing and richer public view",changes:["Ultimate Admin Users page gained one-tap WhatsApp login sharing with player name, username, saved password and Bounce web link","Non-member view gained branded season statistics, current-form table and player tendencies","Public view remains read-only and does not expose upcoming private selections"]},
    {version:"1.4.7.3",date:"14 Aug 2026",summary:"League-table-first layout, season insights and payment tracking",changes:["Full League now prioritises the league table rather than separate first/second/third cards","Added richer season insight statistics including goals and selection tendencies","Share actions were made more prominent in gold","Admin Users gained current-season Paid/Unpaid entry-fee tracking with received and outstanding totals"]},
    {version:"1.4.7.2",date:"14 Aug 2026",summary:"Prominent sharing across data pages",changes:["League Table sharing became a prominent maroon/gold action","Current Form, Results and League History archive data gained formatted-image sharing","Weekly Picks sharing was retained"]},
    {version:"1.4.7.1",date:"13 Aug 2026",summary:"Ultimate Admin emulation exit hotfix",changes:["Ultimate Admin emulation now has a persistent Exit emulation control","Demo Guest profiles resolve correctly during emulation","Emulation remains read-only"]},
    {version:"1.4.7",date:"13 Aug 2026",summary:"Visual and admin layout refresh",changes:["Admin Users and Results were made more compact on browser","Maroon/gold Bounce hierarchy was strengthened","Heart of Midlothian pavement mosaic and subtle Edinburgh artwork restored","No cathedral imagery used","Mobile dashboard priority layout improved while retaining all member features"]},
    {version:"1.4.6",date:"13 Aug 2026",summary:"Fixture duplication, admin draft and accumulator fixes",changes:["Duplicate fixtures collapse using provider ID first with kickoff/team fallback matching","Admin Selection drafts survive the 45-second live refresh","Combined accumulator odds show bookmaker-style whole fractional x/1 odds rounded down","Mobile dashboard priority styling and Edinburgh/Heart visual treatment added"]},
    {version:"1.4.5",date:"Aug 2026",summary:"Stable pre-refresh baseline",changes:["Collapsible fixture/results grouping retained across browser, iPhone and Android","Searchable Admin Selections picker, Release History, Demo Mode and user emulation retained","Live auto-refresh retained"]},
    {version:"1.4.4",date:"Aug 2026",summary:"BST/UTC alert correction",changes:["BST/UTC-equivalent kickoffs no longer generate false fixture-change alerts","Alert readability improved for mobile"]},
    {version:"1.3.x",date:"10 Aug 2026",summary:"Dashboard restoration and scoring repair",changes:["Restored richer Bounce/Hearts dashboard presentation","Repaired Gameweek 1 scoring flow and result update validation","Restored six-week form table and richer league presentation"]}
  ];
  return <div><h3>Release History</h3><p className={styles.small}>Every production update is listed here. The newest release opens automatically; older releases stay collapsed until selected.</p>{releases.map((r,i)=><details className={styles.releaseItem} key={r.version} open={i===0}><summary><span><strong>v{r.version}</strong> · {r.date}</span><small>{r.summary}</small></summary><ul>{r.changes.map(c=><li key={c}>{c}</li>)}</ul></details>)}</div>
}

function Instructions({role}:{role:Role}){return <><h3>Instructions — {role==="ultimate_admin"?"Ultimate Admin":role==="admin"?"League Admin":role==="guest"?"Demo Guest":"Member"}</h3><ul><li><strong>Making a pick:</strong> open Make My Pick, search, choose a fixture and press Select.</li><li><strong>Viewing picks:</strong> Dashboard shows submitted and pending players plus live/provisional outcomes.</li><li><strong>Sharing:</strong> use Share weekly picks or Share table snapshot.</li>{role!=="member"&&<><li><strong>Admin selections:</strong> Admin → Selections lets you enter or replace multiple player picks before one Save all.</li><li><strong>Fixtures:</strong> use Quick results refresh during match time; use Full fixture & odds refresh for the complete catalogue.</li><li><strong>Results/scoring:</strong> Save FT writes the result and triggers scoring; Recalculate Gameweek Points repairs finished selections.</li></>}{role==="ultimate_admin"&&<li><strong>Users:</strong> Ultimate Admin can manage usernames, passwords, roles and active slots.</li>}</ul></>}

function AdminPage({active,setActive,isUltimate,readOnly,demoMode,onEmulate,gameweek,nextGameweek,profiles,fixtures,predictions,adjustments,entryFee,notice,onChanged}:{active:AdminView;setActive:(v:AdminView)=>void;isUltimate:boolean;readOnly:boolean;demoMode:boolean;onEmulate:(id:string)=>void;gameweek:Gameweek|null;nextGameweek:Gameweek|null;profiles:Profile[];fixtures:Fixture[];predictions:Prediction[];adjustments:ScoreAdjustment[];entryFee:number;notice:(m:string)=>void;onChanged:()=>void}){const wrap=(node:ReactNode)=><fieldset disabled={readOnly} className={readOnly?styles.readOnlyControls:""} style={{border:0,padding:0,margin:0,minWidth:0}}>{node}</fieldset>;return <section className={styles.adminPage}><Heading eyebrow="ADMIN CONTROL" title="League Management"><p>{isUltimate?"Full league, user and security administration.":"Manage selections, fixtures, results and gameweek status."}</p></Heading><div className={styles.adminTabs}>{(["users","selections","fixtures","results","gameweek","seasons"] as AdminView[]).filter(v=>v!=="users"||isUltimate).map(v=><button key={v} className={active===v?styles.active:""} onClick={()=>setActive(v)}>{v[0].toUpperCase()+v.slice(1)}</button>)}</div><div className={`${styles.panel} ${styles.adminPanel}`}>{readOnly&&<div className={styles.demoNotice}>Read-only view — controls are disabled.</div>}{active==="users"&&isUltimate&&(demoMode?<DemoUsersAdmin profiles={profiles}/>:wrap(<><PaymentTracker profiles={profiles} entryFee={entryFee} notice={notice}/><UsersAdmin notice={notice} onEmulate={onEmulate}/></>))}{active==="selections"&&wrap(<SelectionsAdmin gameweek={gameweek} profiles={profiles} fixtures={fixtures} predictions={predictions} adjustments={adjustments} notice={notice} onChanged={onChanged}/>) }{active==="fixtures"&&wrap(<FixturesAdmin gameweek={gameweek} nextGameweek={nextGameweek} notice={notice} onChanged={onChanged}/>) }{active==="results"&&wrap(<ResultsAdmin gameweek={gameweek} fixtures={fixtures} predictions={predictions} notice={notice} onChanged={onChanged}/>) }{active==="gameweek"&&wrap(<GameweekAdmin gameweek={gameweek} notice={notice} onChanged={onChanged}/>) }{active==="seasons"&&wrap(<SeasonsAdmin notice={notice} onChanged={onChanged}/>)}</div></section>}

function PaymentTracker({profiles,entryFee,notice}:{profiles:Profile[];entryFee:number;notice:(m:string)=>void}){const [seasonId,setSeasonId]=useState("");const [paid,setPaid]=useState<Record<string,boolean>>({});const [loading,setLoading]=useState(true);async function load(){const client=createClient();const season=await client.from("seasons").select("id").eq("is_current",true).maybeSingle();const id=season.data?.id??"";setSeasonId(id);if(id){const rows=await client.from("season_memberships").select("profile_id,paid").eq("season_id",id);setPaid(Object.fromEntries((rows.data??[]).map((r:any)=>[r.profile_id,Boolean(r.paid)])))}setLoading(false)}useEffect(()=>{load()},[]);async function toggle(id:string){if(!seasonId)return;const next=!paid[id];const client=createClient();const r=await client.from("season_memberships").update({paid:next,paid_at:next?new Date().toISOString():null}).eq("season_id",seasonId).eq("profile_id",id);if(r.error)return notice(r.error.message);setPaid(v=>({...v,[id]:next}));notice(next?"Entry fee marked paid":"Entry fee marked unpaid")}const active=profiles.filter(p=>p.active&&p.role!=="guest");const count=active.filter(p=>paid[p.id]).length;return <div className={styles.paymentTracker}><div className={styles.adminPaymentSummary}><article><span>ENTRY FEE</span><strong>£{entryFee.toFixed(0)}</strong><small>per member</small></article><article><span>PAID</span><strong>{count}/{active.length}</strong><small>£{(count*entryFee).toFixed(0)} received</small></article><article><span>OUTSTANDING</span><strong>£{((active.length-count)*entryFee).toFixed(0)}</strong><small>{active.length-count} member{active.length-count===1?"":"s"}</small></article></div>{loading?<div className={styles.notice}>Loading payment status…</div>:<div className={styles.paymentGrid}>{active.map(p=><button type="button" key={p.id} onClick={()=>toggle(p.id)} className={`${styles.paymentMember} ${paid[p.id]?styles.paymentPaid:styles.paymentUnpaid}`}><strong>{p.display_name}</strong><span>{paid[p.id]?"Paid ✓":`£${entryFee.toFixed(0)} unpaid`}</span></button>)}</div>}</div>}

function UsersAdmin({notice,onEmulate}:{notice:(m:string)=>void;onEmulate:(id:string)=>void}){
  const [users,setUsers]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  async function load(){const r=await fetch("/api/admin/users",{headers:{authorization:`Bearer ${await token()}`}});const j=await r.json();if(r.ok)setUsers(j.users??[]);else notice(j.error);setLoading(false)}
  useEffect(()=>{load()},[]);
  async function save(u:any){const r=await fetch("/api/admin/users",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({id:u.id,username:u.username,displayName:u.display_name,role:u.role,active:u.active,password:u.password})});const j=await r.json();notice(r.ok?`${u.username} saved`:j.error)}
  function shareLogin(u:any){
    if(!u.password)return notice("Generate or save a password before sharing this login.");
    const text=["Bounce BTTS League",`Player: ${u.display_name}`,`Username: ${u.username}`,`Password: ${u.password}`,"Login: https://bounce-btts.vercel.app","","Keep these login details private."].join("\n");
    const url=`https://wa.me/?text=${encodeURIComponent(text)}`;
    const opened=window.open(url,"_blank","noopener,noreferrer");
    if(!opened)window.location.href=url;
  }
  if(loading)return <div>Loading users…</div>;
  return <div className={styles.adminUsers}><p className={styles.notice}>Passwords and access controls remain Ultimate Admin only. <Help text="Use Generate to make a replacement password, Save to apply it, then WhatsApp to send the player's name, username, password and Bounce login link privately."/></p>{users.map((u:any)=><div className={`${styles.row} ${styles.adminUserRow}`} key={u.id}><input value={u.display_name} disabled={u.slot_number===1} onChange={e=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,display_name:e.target.value}:x))}/><input value={u.password} onChange={e=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,password:e.target.value}:x))}/><select value={u.role} disabled={u.slot_number===1} onChange={e=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,role:e.target.value}:x))}><option value="member">Member</option><option value="admin">League Admin</option><option value="guest">Demo Guest</option>{u.slot_number===1&&<option value="ultimate_admin">Ultimate Admin</option>}</select><div className={styles.buttonRow}><button className={styles.button} disabled={u.slot_number===1} aria-pressed={u.active} onClick={()=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,active:!x.active}:x))}>{u.active?"Active ✓":"Inactive"}</button><button className={styles.button} onClick={()=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,password:`bounce${u.slot_number}${Math.floor(10+Math.random()*90)}`}:x))}>Generate</button><button className={styles.button} onClick={()=>navigator.clipboard.writeText(`${u.display_name}\nUsername: ${u.username}\nPassword: ${u.password}\nLogin: https://bounce-btts.vercel.app`).then(()=>notice("Login details copied"))}>Copy</button><button className={styles.shareGold} disabled={!u.password} onClick={()=>shareLogin(u)}><span aria-hidden="true">↗</span><strong>WhatsApp login</strong><small>Share credentials</small></button><button className={styles.button} onClick={()=>onEmulate(u.id)}>Emulate</button><button className={styles.primary} onClick={()=>save(u)}>Save</button></div></div>)}</div>
}

function SearchableFixturePicker({value,fixtures,disabled,takenBy,onChange}:{value:string;fixtures:Fixture[];disabled:boolean;takenBy:(fixtureId:string)=>string|null;onChange:(fixtureId:string)=>void}){
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  const selected=fixtures.find(f=>f.id===value);
  const normalised=query.trim().toLowerCase();
  const filtered=useMemo(()=>fixtures.filter(f=>{
    if(!normalised)return true;
    return `${f.home_team} ${f.away_team} ${normaliseCountry(f.country)} ${competitionDisplayName(f)} ${f.odds_fractional??""}`.toLowerCase().includes(normalised);
  }).sort(fixtureSort),[fixtures,normalised]);
  function choose(fixtureId:string){onChange(fixtureId);setOpen(false);setQuery("");}
  return <div className={`${styles.fixturePicker} ${open?styles.fixturePickerOpen:""}`}>
    <button type="button" className={styles.fixturePickerTrigger} disabled={disabled} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
      <span>{selected?<><strong>{selected.home_team} v {selected.away_team}</strong><small>{competitionDisplayName(selected)}{selected.odds_fractional?` · ${selected.odds_fractional}`:""}</small></>:<><strong>Search & select a fixture</strong><small>Team, competition or country</small></>}</span>
      <b aria-hidden="true">⌄</b>
    </button>
    {open&&<div className={styles.fixturePickerMenu}>
      <div className={styles.fixturePickerSearchWrap}>
        <span aria-hidden="true">⌕</span>
        <input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search team, competition or country…" aria-label="Search fixtures"/>
        {query&&<button type="button" onClick={()=>setQuery("")} aria-label="Clear fixture search">×</button>}
      </div>
      <div className={styles.fixturePickerResults}>
        <button type="button" className={`${styles.fixturePickerOption} ${!value?styles.fixturePickerOptionSelected:""}`} onClick={()=>choose("")}>
          <span><strong>No selection</strong><small>Clear this player's fixture</small></span>
        </button>
        {filtered.map(f=>{const owner=takenBy(f.id);const isSelected=f.id===value;return <button type="button" key={f.id} disabled={Boolean(owner)} className={`${styles.fixturePickerOption} ${isSelected?styles.fixturePickerOptionSelected:""}`} onClick={()=>choose(f.id)}>
          <span className={styles.fixturePickerTeams}><strong>{f.home_team} v {f.away_team}</strong><small>{normaliseCountry(f.country)} · {competitionDisplayName(f)}{f.odds_fractional?` · ${f.odds_fractional}`:""}</small></span>
          <span className={owner?styles.fixtureTaken:styles.fixtureAvailable}>{owner?`Taken · ${owner}`:isSelected?"Selected":"Available"}</span>
        </button>})}
        {!filtered.length&&<div className={styles.fixturePickerEmpty}>No fixtures match “{query}”.</div>}
      </div>
    </div>}
  </div>
}

function SelectionsAdmin({gameweek,profiles,fixtures,predictions,adjustments,notice,onChanged}:{gameweek:Gameweek|null;profiles:Profile[];fixtures:Fixture[];predictions:Prediction[];adjustments:ScoreAdjustment[];notice:(m:string)=>void;onChanged:()=>void}){
  const active=useMemo(()=>profiles.filter(p=>p.active).sort((a,b)=>(a.slot_number??99)-(b.slot_number??99)),[profiles]);
  const current=useMemo(()=>predictions.filter(p=>p.gameweek_id===gameweek?.id),[predictions,gameweek?.id]);
  const orderedFixtures=useMemo(()=>[...fixtures].sort(fixtureSort),[fixtures]);
  const [draft,setDraft]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState(false);
  const draftGameweekRef=useRef<string|null>(null);
  useEffect(()=>{
    const gwId=gameweek?.id??null;
    if(draftGameweekRef.current===gwId)return;
    draftGameweekRef.current=gwId;
    setDraft(Object.fromEntries(active.map(p=>[p.id,current.find(x=>x.member_id===p.id)?.fixture_id??""])));
  },[gameweek?.id,active,current]);
  const changed=active.filter(p=>(draft[p.id]??"")!==(current.find(x=>x.member_id===p.id)?.fixture_id??""));
  function takenBy(fixtureId:string,memberId:string){const owner=active.find(other=>other.id!==memberId&&draft[other.id]===fixtureId);return owner?.display_name??null;}
  async function saveAll(){
    if(!gameweek||!changed.length)return;
    const owners=new Map<string,string>();
    for(const [memberId,fixtureId] of Object.entries(draft) as Array<[string,string]>){
      if(!fixtureId)continue;
      const owner=owners.get(fixtureId);
      if(owner&&owner!==memberId){const f=fixtures.find(x=>x.id===fixtureId);return notice(`${f?`${f.home_team} v ${f.away_team}`:"A fixture"} has been selected for more than one player.`)}
      owners.set(fixtureId,memberId);
    }
    setBusy(true);
    try{
      for(const p of changed){
        const old=current.find(x=>x.member_id===p.id);
        if(old){
          const d=await fetch("/api/admin/predictions",{method:"DELETE",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({gameweekId:gameweek.id,memberId:p.id})});
          if(!d.ok)throw new Error((await d.json()).error??"Could not remove selection");
        }
        const fixtureId=draft[p.id];
        if(fixtureId){
          const r=await fetch("/api/admin/predictions",{method:"PUT",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({gameweekId:gameweek.id,memberId:p.id,fixtureId})});
          if(!r.ok)throw new Error((await r.json()).error??"Could not save selection");
        }
      }
      notice(`${changed.length} selection change${changed.length===1?"":"s"} saved`);
      onChanged();
    }catch(e){notice(e instanceof Error?e.message:"Could not save selections")}finally{setBusy(false)}
  }
  if(!gameweek)return <div>Create a gameweek first.</div>;
  return <div>
    <p className={styles.notice}>Enter multiple selections, then press Save all once. Each game field now has its own searchable fixture picker on browser, iPhone and Android. <Help text="Open a player's game field and search by either team, competition or country. A fixture can belong to only one player; taken fixtures are shown but cannot be selected."/></p>
    {active.map(p=><div className={`${styles.row} ${styles.selectionRow}`} key={p.id}>
      <strong>{p.slot_number}. {p.display_name}</strong>
      <SearchableFixturePicker value={draft[p.id]??""} fixtures={orderedFixtures} disabled={busy} takenBy={(fixtureId)=>takenBy(fixtureId,p.id)} onChange={(fixtureId)=>setDraft(d=>({...d,[p.id]:fixtureId}))}/>
      <span className={changed.some(x=>x.id===p.id)?styles.unsavedSelection:styles.savedSelection}>{changed.some(x=>x.id===p.id)?"Unsaved":"Saved"}</span>
      <span/>
    </div>)}
    <div className={styles.buttonRow}><button className={styles.button} disabled={busy||!changed.length} onClick={()=>setDraft(Object.fromEntries(active.map(p=>[p.id,current.find(x=>x.member_id===p.id)?.fixture_id??""])))}>Discard changes</button><button className={styles.primary} disabled={busy||!changed.length} onClick={saveAll}>{busy?"Saving…":`Save all selections (${changed.length})`}</button></div>
    <PointsAdjustment gameweek={gameweek} profiles={active} adjustments={adjustments} notice={notice} onChanged={onChanged}/>
  </div>
}

function PointsAdjustment({gameweek,profiles,adjustments,notice,onChanged}:{gameweek:Gameweek;profiles:Profile[];adjustments:ScoreAdjustment[];notice:(m:string)=>void;onChanged:()=>void}){const [memberId,setMemberId]=useState(profiles[0]?.id??"");const existing=adjustments.find(a=>a.gameweek_id===gameweek.id&&a.member_id===memberId);const [points,setPoints]=useState("-1");const [reason,setReason]=useState("Missed selection");useEffect(()=>{setPoints(String(existing?.points??-1));setReason(existing?.reason??"Missed selection")},[existing?.id]);async function save(){const r=await fetch("/api/admin/adjustments",{method:"PUT",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({gameweekId:gameweek.id,memberId,points:Number(points),reason})});const j=await r.json();notice(r.ok?"Points adjustment saved":j.error);if(r.ok)onChanged()}return <div style={{marginTop:20}}><h3>Missed-selection / manual points <Help text="Use only for a missed deadline or a deliberate manual correction. Normal match scoring comes from the saved fixture result."/></h3><div className={styles.formGrid}><label className={styles.field}>Player<select value={memberId} onChange={e=>setMemberId(e.target.value)}>{profiles.map(p=><option value={p.id} key={p.id}>{p.display_name}</option>)}</select></label><label className={styles.field}>Points<input type="number" step="1" value={points} onChange={e=>setPoints(e.target.value)}/></label><label className={styles.field}>Reason<input value={reason} onChange={e=>setReason(e.target.value)}/></label></div><button className={styles.primary} onClick={save}>Save adjustment</button></div>}

function FixturesAdmin({gameweek,nextGameweek,notice,onChanged}:{gameweek:Gameweek|null;nextGameweek:Gameweek|null;notice:(m:string)=>void;onChanged:()=>void}){const [busy,setBusy]=useState("");const [form,setForm]=useState({competition:"Scottish Premiership",country:"Scotland",homeTeam:"",awayTeam:"",kickoffLocal:"",oddsFractional:""});async function sync(gw:Gameweek|null,mode:"results"|"full"){if(!gw)return;setBusy(mode);const auth={authorization:`Bearer ${await token()}`};const r=mode==="results"?await fetch(`/api/live-results?gameweekId=${encodeURIComponent(gw.id)}`,{headers:auth,cache:"no-store"}):await fetch("/api/admin/provider-sync",{method:"POST",headers:{"content-type":"application/json",...auth},body:JSON.stringify({gameweekIds:[gw.id],mode})});const j=await r.json();notice(r.ok?(mode==="results"?`Live refresh complete · ${j.updated??0} updated`:`Full refresh complete · ${j.fixturesAdded??0} added, ${j.fixturesUpdated??0} updated, ${j.oddsUpdated??0} odds`):j.error);setBusy("");if(r.ok)onChanged()}async function add(e:FormEvent){e.preventDefault();if(!gameweek)return;const r=await fetch("/api/admin/fixtures",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({...form,kickoffAt:new Date(form.kickoffLocal).toISOString(),gameweekId:gameweek.id})});const j=await r.json();notice(r.ok?"Fixture added":j.error);if(r.ok)onChanged()}return <div><div className={styles.notice}><strong>Update controls</strong><br/>Quick live refresh uses the same batched live-score path as the Dashboard, while Full fixture & odds refresh performs the heavier catalogue update. The request is backward-compatible with the existing live route. <Help text="Use Quick Live during match time. It refreshes only selected fixtures in batches. Use Full when you need new fixtures, kickoff changes or refreshed BTTS odds."/></div><div className={styles.buttonRow} style={{margin:"12px 0"}}><button className={styles.primary} disabled={!gameweek||!!busy} onClick={()=>sync(gameweek,"results")}>{busy==="results"?"Refreshing live scores…":"Quick live refresh"}</button><button className={styles.button} disabled={!gameweek||!!busy} onClick={()=>sync(gameweek,"full")}>{busy==="full"?"Refreshing fixtures & odds…":"Full fixture & odds refresh"}</button>{nextGameweek&&<button className={styles.button} disabled={!!busy} onClick={()=>sync(nextGameweek,"full")}>Full refresh next GW {nextGameweek.number}</button>}</div><form onSubmit={add}><h3>Manual fixture entry</h3><div className={styles.formGrid}><label className={styles.field}>Competition<input value={form.competition} onChange={e=>setForm({...form,competition:e.target.value})}/></label><label className={styles.field}>Country<input value={form.country} onChange={e=>setForm({...form,country:e.target.value})}/></label><label className={styles.field}>Home team<input required value={form.homeTeam} onChange={e=>setForm({...form,homeTeam:e.target.value})}/></label><label className={styles.field}>Away team<input required value={form.awayTeam} onChange={e=>setForm({...form,awayTeam:e.target.value})}/></label><label className={styles.field}>Kickoff <Help text="Local UK date/time for this fixture."/><input type="datetime-local" required value={form.kickoffLocal} onChange={e=>setForm({...form,kickoffLocal:e.target.value})}/></label><label className={styles.field}>BTTS fractional odds <Help text="Optional manual odds such as 8/11. The full provider refresh can replace this when provider odds exist."/><input value={form.oddsFractional} onChange={e=>setForm({...form,oddsFractional:e.target.value})}/></label></div><button className={styles.primary}>Add fixture manually</button></form></div>}

function ResultsAdmin({gameweek,fixtures,predictions,notice,onChanged}:{gameweek:Gameweek|null;fixtures:Fixture[];predictions:Prediction[];notice:(m:string)=>void;onChanged:()=>void}){const [scores,setScores]=useState<Record<string,{home:string;away:string}>>(()=>Object.fromEntries(fixtures.map(f=>[f.id,{home:f.home_score?.toString()??"",away:f.away_score?.toString()??""}])));useEffect(()=>{setScores(Object.fromEntries(fixtures.map(f=>[f.id,{home:f.home_score?.toString()??"",away:f.away_score?.toString()??""}])))},[fixtures]);const [busy,setBusy]=useState(false);async function save(f:Fixture,silent=false){const row=scores[f.id];if(!row||row.home===""||row.away==="")return false;const r=await fetch("/api/admin/results",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({fixtureId:f.id,homeScore:Number(row.home),awayScore:Number(row.away)})});const j=await r.json();if(!silent)notice(r.ok?"Result and points saved":j.error);return r.ok}async function recalc(){const selectedFinished=fixtures.filter(f=>predictions.some(p=>p.fixture_id===f.id)&&finishedStatuses.includes(f.status)&&f.home_score!=null&&f.away_score!=null);if(!selectedFinished.length)return notice("No finished selected fixtures to recalculate.");if(!window.confirm(`Recalculate points for ${selectedFinished.length} finished selected match${selectedFinished.length===1?"":"es"}?`))return;setBusy(true);let ok=0;for(const f of selectedFinished){if(await save(f,true))ok++}setBusy(false);notice(`Recalculated ${ok}/${selectedFinished.length} finished selected matches`);onChanged()}return <div className={styles.adminResults}><div className={styles.buttonRow}><button className={styles.primary} disabled={busy} onClick={recalc}>{busy?"Recalculating…":"Recalculate Gameweek Points"}</button><Help text="Repairs scoring by re-saving each finished selected fixture through the same live result endpoint used by manual FT entry."/></div>{fixtures.sort(fixtureSort).map(f=>{const pred=predictions.find(p=>p.fixture_id===f.id);const warning=finishedStatuses.includes(f.status)&&pred&&pred.points_awarded==null;return <div className={`${styles.row} ${styles.adminResultRow}`} key={f.id}><span><small>{competitionDisplayName(f)}</small><br/><strong>{f.home_team} v {f.away_team}</strong>{warning&&<><br/><small className={styles.error}>Finished selected fixture has no awarded points</small></>}</span><input type="number" min="0" value={scores[f.id]?.home??""} onChange={e=>setScores(s=>({...s,[f.id]:{...s[f.id],home:e.target.value}}))}/><input type="number" min="0" value={scores[f.id]?.away??""} onChange={e=>setScores(s=>({...s,[f.id]:{...s[f.id],away:e.target.value}}))}/><button className={styles.button} onClick={async()=>{if(await save(f)){onChanged()}}}>Save FT</button></div>})}</div>}

function GameweekAdmin({gameweek,notice,onChanged}:{gameweek:Gameweek|null;notice:(m:string)=>void;onChanged:()=>void}){const [status,setStatus]=useState(gameweek?.status??"open");const [deadline,setDeadline]=useState(gameweek?new Date(gameweek.locks_at).toISOString().slice(0,16):"");useEffect(()=>{setStatus(gameweek?.status??"open");setDeadline(gameweek?new Date(gameweek.locks_at).toISOString().slice(0,16):"")},[gameweek?.id]);async function save(){if(!gameweek)return;const r=await fetch("/api/admin/gameweek",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({id:gameweek.id,status,locksAt:new Date(deadline).toISOString()})});const j=await r.json();notice(r.ok?"Gameweek updated":j.error);if(r.ok)onChanged()}return <div><div className={styles.formGrid}><label className={styles.field}>Status <Help text="Open accepts normal member picks; Locked closes them; Complete marks the gameweek finished."/><select value={status} onChange={e=>setStatus(e.target.value as any)}><option value="open">Open</option><option value="locked">Locked</option><option value="complete">Complete</option></select></label><label className={styles.field}>Deadline <Help text="Normal league deadline is Friday at 17:00 UK time unless you deliberately change it."/><input type="datetime-local" value={deadline} onChange={e=>setDeadline(e.target.value)}/></label></div><button className={styles.primary} onClick={save}>Save current gameweek</button></div>}
function SeasonsAdmin({notice,onChanged}:{notice:(m:string)=>void;onChanged:()=>void}){const [label,setLabel]=useState("");const [gameweeks,setGameweeks]=useState("38");async function create(){if(!label.trim())return;const r=await fetch("/api/admin/seasons",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({label:label.trim(),gameweeks:Number(gameweeks)})});const j=await r.json();notice(r.ok?`Season ${label} created`:j.error);if(r.ok)onChanged()}return <div><div className={styles.formGrid}><label className={styles.field}>Season name <Help text="Use the season label, for example 2027/28. The app header and archive use this value."/><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="2027/28"/></label><label className={styles.field}>Planned gameweeks<input type="number" min="1" max="60" value={gameweeks} onChange={e=>setGameweeks(e.target.value)}/></label></div><button className={styles.primary} onClick={create}>Create New Season</button></div>}

function AlertsPage({notice,onCount}:{notice:(m:string)=>void;onCount:(n:number)=>void}){
  const [alerts,setAlerts]=useState<any[]>([]);
  const [runs,setRuns]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [showResolved,setShowResolved]=useState(false);
  async function load(){
    setLoading(true);
    const auth=await token();
    const [a,r]=await Promise.all([fetch("/api/admin/alerts",{headers:{authorization:`Bearer ${auth}`}}),fetch("/api/admin/provider-sync",{headers:{authorization:`Bearer ${auth}`}})]);
    const aj=await a.json(); const rj=await r.json();
    if(a.ok){const cleaned=(aj.alerts??[]).filter((item:any)=>!isTimezoneOnlyAlert(item));setAlerts(cleaned);onCount(cleaned.filter((item:any)=>!item.resolved).length)}else notice(aj.error);
    if(r.ok)setRuns(rj.runs??[]);
    setLoading(false);
  }
  useEffect(()=>{load()},[]);
  async function resolve(id:string,resolved=true){const r=await fetch("/api/admin/alerts",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({id,resolved})});if(!r.ok)notice((await r.json()).error);return r.ok}
  async function bulk(rows:any[],label:string){if(!rows.length)return;if(!window.confirm(`${label}? This will affect ${rows.length} alert${rows.length===1?"":"s"}.`))return;let ok=0;for(const a of rows){if(await resolve(a.id,true))ok++}notice(`${ok} alert${ok===1?"":"s"} cleared`);load()}
  const unresolved=alerts.filter(a=>!a.resolved);
  const resolved=alerts.filter(a=>a.resolved);
  const visible=showResolved?resolved:unresolved;
  const run=runs[0];
  return <section className={styles.alertsPage}>
    <Heading eyebrow="ADMIN NOTIFICATIONS" title="Alerts"><p>Only meaningful fixture changes that may need league-admin attention.</p></Heading>
    {run&&<div className={styles.providerStatusCard}>
      <div><span>LAST PROVIDER CHECK</span><strong>{String(run.status).toUpperCase()}</strong></div>
      <div><span>RUN TIME</span><strong>{formatAlertTime(run.started_at)}</strong></div>
      <div><span>API REQUESTS</span><strong>{run.requests_used ?? 0}</strong></div>
    </div>}
    <div className={styles.alertToolbar}>
      <div className={styles.alertTabs}>
        <button className={!showResolved?styles.alertTabActive:styles.alertTab} onClick={()=>setShowResolved(false)}>Needs attention <b>{unresolved.length}</b></button>
        <button className={showResolved?styles.alertTabActive:styles.alertTab} onClick={()=>setShowResolved(true)}>Resolved <b>{resolved.length}</b></button>
      </div>
      {!showResolved&&unresolved.length>0&&<button className={styles.button} onClick={()=>bulk(unresolved,"Clear all current alerts")}>Clear all</button>}
    </div>
    <div className={styles.alertList}>
      {loading?<div className={styles.notice}>Loading alerts…</div>:visible.length?visible.map(a=>{
        const changes=alertChanges(a);
        const fixtureName=String(a.title??"").replace(/^Pick affected:\s*/i,"") || `${a.fixtures?.home_team??"Fixture"} v ${a.fixtures?.away_team??""}`;
        const member=a.profiles?.display_name;
        const severity=String(a.severity??"warning").toLowerCase();
        return <article className={`${styles.alertCard} ${a.resolved?styles.alertCardResolved:""}`} key={a.id}>
          <header className={styles.alertCardHeader}>
            <span className={`${styles.alertSeverity} ${severity==="critical"?styles.alertCritical:styles.alertWarning}`}>{severity==="critical"?"ACTION NEEDED":"CHECK CHANGE"}</span>
            <time>{formatAlertTime(a.created_at)}</time>
          </header>
          <div className={styles.alertCardBody}>
            <h3>{fixtureName}</h3>
            {member&&<p className={styles.alertMember}>Pick belongs to <strong>{member}</strong></p>}
            <div className={styles.alertChangeList}>{changes.map((change:string,index:number)=><div key={`${a.id}-${index}`}>{change}</div>)}</div>
          </div>
          <footer className={styles.alertCardActions}>
            <button className={styles.button} onClick={async()=>{if(await resolve(a.id,!a.resolved))load()}}>{a.resolved?"Reopen alert":"Mark resolved"}</button>
            {!a.resolved&&<button className={styles.button} onClick={()=>bulk(unresolved.filter(x=>x.title===a.title),`Clear all alerts for ${fixtureName}`)}>Clear same fixture</button>}
          </footer>
        </article>
      }):<div className={styles.alertEmpty}><strong>{showResolved?"No resolved alerts to show":"All clear"}</strong><span>{showResolved?"Resolved items will appear here.":"There are no fixture changes needing attention."}</span></div>}
    </div>
  </section>
}

