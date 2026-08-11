"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ShareTableButton from "./ShareTableButton";
import WeeklyPicksShareButton from "./WeeklyPicksShareButton";
import { historicalSeasons, rollOfHonour } from "@/lib/history-data";
import { outcomeLabel } from "@/lib/scoring";
import styles from "./release.module.css";

type View = "dashboard" | "pick" | "fixtures" | "table" | "results" | "history" | "players" | "about" | "alerts" | "admin";
type AdminView = "users" | "selections" | "fixtures" | "results" | "gameweek" | "seasons";
type Role = "ultimate_admin" | "admin" | "member" | "guest";

type Profile = { id: string; username: string; display_name: string; role: Role; active: boolean; slot_number: number | null };
type Gameweek = { id: string; number: number; status: "open" | "locked" | "complete"; opens_at: string | null; locks_at: string; season_id: string | null };
type Fixture = { id: string; gameweek_id: string | null; competition: string; country: string; home_team: string; away_team: string; kickoff_at: string; status: string; home_score: number | null; away_score: number | null; odds_fractional: string | null; odds_checked_at: string | null; source: string; is_eligible: boolean };
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
const RELEASE_VERSION = "1.4.4";
const RELEASE_DATE = "11 Aug 2026";
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
function formatKickoff(value: string) { return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)); }
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
  const emulatedProfile = emulatedProfileId ? profiles.find(p=>p.id===emulatedProfileId) ?? null : null;
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
  const [alertsCount,setAlertsCount] = useState(0);
  const [rouss,setRouss] = useState(false);
  const gameweek = initialGameweeks.find(g => g.id === gameweekId) ?? initialGameweek;
  const currentFixtures = useMemo(() => fixtures.filter(f => f.gameweek_id === gameweek?.id), [fixtures,gameweek?.id]);
  const currentPredictions = useMemo(() => predictions.filter(p => p.gameweek_id === gameweek?.id), [predictions,gameweek?.id]);
  const isOpen = Boolean(!isReadOnly && gameweek && (isAdmin || (gameweek.status === "open" && (!gameweek.opens_at || new Date(gameweek.opens_at).getTime() <= now) && new Date(gameweek.locks_at).getTime() > now)));
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

  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()),30000); return () => clearInterval(t); },[]);
  useEffect(() => { if (!gameweek?.id) return; const t = window.setInterval(() => refreshLiveData(true),45000); return () => clearInterval(t); },[gameweek?.id]);
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
      <div className={styles.brand}><img src="/assets/hearts-crest.png" alt=""/><div><strong>BOUNCE</strong><span>BTTS LEAGUE</span><small>EST 2024</small></div></div>
      <nav className={styles.nav}>{navItems.filter(n=>!n.adminOnly||isAdmin).map(n=><button key={n.id} className={view===n.id?styles.active:""} onClick={()=>{setView(n.id);setMobileMenu(false)}}><span>{n.icon} </span>{n.label}{n.id==="alerts"&&alertsCount>0?<b className={styles.badge}>{alertsCount>9?"9+":alertsCount}</b>:null}</button>)}</nav>
      <button type="button" className={styles.sidebarEgg} aria-label=" " onClick={()=>{setRouss(true);setMobileMenu(false)}}></button>
      <button className={styles.profile} onClick={signOut}><span>{initials(initialProfile.display_name)}</span><span><strong>{initialProfile.display_name}</strong><small>{isDemo?"Demo Guest":initialProfile.role === "ultimate_admin"?"Ultimate Admin":initialProfile.role === "admin"?"League Admin":initialProfile.username}</small></span><b>↪</b></button>
    </aside>
    {mobileMenu && <button className={styles.scrim} aria-label="Close menu" onClick={()=>setMobileMenu(false)}/>}
    <section className={styles.main}>
      <header className={styles.hero}><div><h1>BOUNCE</h1><h2>— BTTS LEAGUE —</h2><p>EDINBURGH · HEART OF MIDLOTHIAN · EST 2024</p></div><div className={styles.gwCard}><label>Season {seasonLabel}</label><div className={styles.gwRow}><button disabled={initialGameweeks.findIndex(g=>g.id===gameweekId)<=0} onClick={()=>{const i=initialGameweeks.findIndex(g=>g.id===gameweekId);if(i>0)setGameweekId(initialGameweeks[i-1].id)}}>‹</button><select value={gameweek?.id??""} onChange={e=>setGameweekId(e.target.value)}>{initialGameweeks.map(g=><option key={g.id} value={g.id}>GW {g.number}</option>)}</select><button disabled={initialGameweeks.findIndex(g=>g.id===gameweekId)>=initialGameweeks.length-1} onClick={()=>{const i=initialGameweeks.findIndex(g=>g.id===gameweekId);if(i>=0&&i<initialGameweeks.length-1)setGameweekId(initialGameweeks[i+1].id)}}>›</button></div><small>{gameweekStatusText(gameweek??null,now)}</small>{isDemo&&<div className={styles.demoSwitch}><button className={demoPerspective==="member"?styles.active:""} onClick={()=>{setDemoPerspective("member");setView("dashboard")}}>Member View</button><button className={demoPerspective==="admin"?styles.active:""} onClick={()=>{setDemoPerspective("admin");setView("dashboard")}}>Admin View</button></div>}</div></header>
      <div className={styles.content}><div className={styles.page}>
        {view==="dashboard" && <Dashboard gameweek={gameweek??null} gameweeks={initialGameweeks} profiles={profiles} fixtures={currentFixtures} predictions={currentPredictions} allPredictions={predictions} allAdjustments={adjustments} adjustment={selectedAdjustment} myFixture={selectedFixture} standings={standings} entryFee={entryFee} seasonLabel={seasonLabel} isOpen={isOpen} role={effectiveRole} myId={viewerProfile.id} alertsCount={alertsCount} setView={setView}/>}
        {view==="pick" && <PickPage gameweek={gameweek??null} fixtures={currentFixtures.filter(f=>f.is_eligible)} predictions={currentPredictions} profiles={profiles} isOpen={isOpen} myId={viewerProfile.id} selectFixture={selectFixture}/>}
        {view==="fixtures" && <FixturesPage fixtures={allFixtures}/>}
        {view==="table" && <LeagueTable standings={standings} seasonLabel={seasonLabel} gameweek={gameweek??null} entryFee={entryFee}/>}
        {view==="results" && <ResultsPage gameweek={gameweek??null} fixtures={currentFixtures} predictions={currentPredictions} profiles={profiles} onRefresh={()=>refreshLiveData(false)}/>}
        {view==="history" && <HistoryPage seasonHistory={seasonHistory}/>}
        {view==="players" && <PlayersPage profiles={profiles} gameweek={gameweek??null} fixtures={currentFixtures} predictions={currentPredictions} adjustments={adjustments}/>}
        {view==="about" && <AboutPage role={effectiveRole} profiles={profiles}/>}
        {view==="alerts" && isAdmin && (isDemo?<DemoReadOnlyPanel title="Alerts" text="Admin alerts are intentionally hidden in Demo Mode because they can contain operational details."/>:<AlertsPage notice={notice} onCount={setAlertsCount}/>)}
        {view==="admin" && isAdmin && <AdminPage active={adminView} setActive={setAdminView} isUltimate={effectiveRole==="ultimate_admin"} readOnly={isReadOnly} demoMode={isDemo} onEmulate={(id)=>{if(id===initialProfile.id)return notice("You are already viewing your own account.");setEmulatedProfileId(id);setView("dashboard")}} gameweek={gameweek??null} nextGameweek={initialGameweeks.find(g=>g.number===(gameweek?.number??0)+1)??null} profiles={profiles} fixtures={currentFixtures} predictions={currentPredictions} adjustments={adjustments} notice={notice} onChanged={()=>refreshLiveData(false)}/>}
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
  gameweek,gameweeks,profiles,fixtures,predictions,allPredictions,allAdjustments,adjustment,myFixture,standings,entryFee,seasonLabel,isOpen,role,myId,alertsCount,setView
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
}){
  const isAdmin = role==="admin" || role==="ultimate_admin";
  const picks=profiles.map(profile=>{
    const prediction=predictions.find(p=>p.member_id===profile.id);
    return {profile,prediction,fixture:fixtures.find(f=>f.id===prediction?.fixture_id)};
  });
  const finished=fixtures.filter(f=>finishedStatuses.includes(f.status));
  const myStanding=standings.find(s=>s.id===myId);
  const myPosition=Math.max(1,standings.findIndex(s=>s.id===myId)+1);
  const submitted=predictions.length;
  const [formRange,setFormRange]=useState<6|12|18>(6);
  const currentPoints=predictions.reduce((sum,p)=>sum+(p.points_awarded??0),0)+allAdjustments.filter(a=>a.gameweek_id===gameweek?.id).reduce((sum,a)=>sum+a.points,0);

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

  return <section className={styles.dashboard}>
    <div className={styles.dashboardIntro}>
      <div>
        <span className={styles.eyebrow}>SEASON {seasonLabel} · {gameweek?`GAMEWEEK ${gameweek.number}`:"OVERVIEW"}</span>
        <h2>{isAdmin?"League Control Centre":"Your League Dashboard"}</h2>
        <p>{isAdmin?"Live league position, selections, results and admin status in one place.":"Your pick, current standing, weekly results and recent form in one place."}</p>
      </div>
      <div className={styles.dashboardArt} aria-hidden="true">
        <img src="/assets/hearts-crest.png" alt=""/>
        <img src="/assets/bounce-cup.png" alt=""/>
      </div>
    </div>

    <div className={styles.dashboardStats}>
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

    <div className={styles.dashboardMain}>
      <div className={styles.dashboardPrimary}>
        <article className={`${styles.panel} ${styles.pickPanel}`}>
          <div className={styles.panelHeading}>
            <div><div className={styles.title}>YOUR PICK</div><h3>{gameweek?`Gameweek ${gameweek.number}`:"Current gameweek"}</h3></div>
            <button className={styles.linkButton} onClick={()=>setView("pick")}>{isOpen?"Change / make pick":"View picks"} →</button>
          </div>
          {myFixture?<div className={styles.pickHeroLarge}>
            <div><span>HOME</span><strong>{myFixture.home_team}</strong></div>
            <div className={styles.pickScore}>
              <b>{myFixture.home_score!=null?`${myFixture.home_score} — ${myFixture.away_score}`:"V"}</b>
              <small>{myFixture.status}</small>
            </div>
            <div><span>AWAY</span><strong>{myFixture.away_team}</strong></div>
            <footer>{formatKickoff(myFixture.kickoff_at)} · BTTS {myFixture.odds_fractional??"Odds unavailable"}</footer>
          </div>:adjustment?<div className={styles.missedPick}><strong>MISSED DEADLINE</strong><span>{adjustment.points} point(s)</span><small>{adjustment.reason}</small></div>:<div className={styles.emptyPick}><p>No selection has been saved for this gameweek.</p><button className={styles.primary} disabled={!isOpen} onClick={()=>setView("pick")}>{isOpen?"Make your BTTS pick":"Selections are currently closed"}</button></div>}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeading}>
            <div><div className={styles.title}>GAMEWEEK PICKS & LIVE RESULTS</div><h3>Everyone at a glance</h3></div>
            <div className={styles.buttonRow}>
              <button className={styles.button} onClick={()=>setView("results")}>Results →</button>
              <WeeklyPicksShareButton disabled={!gameweek} gameweekNumber={gameweek?.number??0} seasonLabel={seasonLabel} picks={picks.filter(p=>p.fixture).map(p=>({player:p.profile.display_name,homeTeam:p.fixture!.home_team,awayTeam:p.fixture!.away_team,competition:competitionDisplayName(p.fixture!),kickoffAt:p.fixture!.kickoff_at,odds:p.fixture!.odds_fractional}))}/>
            </div>
          </div>
          <div className={styles.pickList}>
            {picks.map(({profile,prediction,fixture})=>{
              const outcome=fixture?outcomeLabel(fixture.home_score,fixture.away_score,fixture.status,prediction?.points_awarded??null):null;
              return <div className={styles.pickListRow} key={profile.id}>
                <div className={styles.playerCell}><span className={styles.avatar}>{initials(profile.display_name)}</span><strong>{profile.display_name}</strong></div>
                <div className={styles.fixtureCell}>{fixture?<><strong>{fixture.home_team} v {fixture.away_team}</strong><small>{competitionDisplayName(fixture)} · {fixture.odds_fractional??"—"}</small></>:<span>Awaiting selection</span>}</div>
                <div className={styles.liveCell}>{fixture?.home_score!=null?<strong>{fixture.home_score}-{fixture.away_score}</strong>:<strong>—</strong>}<small>{fixture?.status??"PENDING"}</small></div>
                <div className={outcome?.tone==="good"?styles.statusGood:outcome?.tone==="warn"?styles.statusWarn:outcome?.tone==="bad"?styles.statusBad:styles.statusNeutral}>{outcome?`${outcome.label}${outcome.points!=null?` · ${outcome.points>0?"+":""}${outcome.points}`:""}`:"PENDING"}</div>
              </div>
            })}
          </div>
        </article>
      </div>

      <aside className={styles.dashboardSide}>
        <article className={`${styles.panel} ${styles.tablePreview}`}>
          <div className={styles.tableArtwork} aria-hidden="true"><img src="/assets/bounce-cup.png" alt=""/></div>
          <div className={styles.panelHeading}>
            <div><div className={styles.title}>LEAGUE TABLE</div><h3>Season standings</h3></div>
            <button className={styles.linkButton} onClick={()=>setView("table")}>Full table →</button>
          </div>
          <div className={styles.miniTable}>
            {standings.slice(0,8).map((r,i)=><div className={`${styles.miniTableRow} ${r.id===myId?styles.myRow:""} ${i===0?styles.firstRow:""}`} key={r.id}>
              <span className={styles.position}>{i+1}</span>
              <span className={styles.tableName}>{i===0&&<span className={styles.trophy}>🏆</span>}<strong>{r.name}</strong></span>
              <span>{r.played}</span><span>{r.wins}W</span><b>{r.points}</b>
            </div>)}
          </div>
          <div className={styles.tableActions}><ShareTableButton compact rows={standings} seasonLabel={seasonLabel} gameweekNumber={gameweek?.number??null} prizePot={profiles.length*entryFee}/></div>
        </article>

        <article className={styles.panel}>
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

    <article className={`${styles.panel} ${styles.formPanel}`}>
      <div className={styles.panelHeading}>
        <div><div className={styles.title}>{formRange}-WEEK FORM</div><h3>Recent league form</h3></div>
        <div className={styles.formControls}><select aria-label="Form range" value={formRange} onChange={e=>setFormRange(Number(e.target.value) as 6|12|18)}><option value={6}>6 weeks</option><option value={12}>12 weeks</option><option value={18}>18 weeks</option></select><button className={styles.button} onClick={shareForm}>Share form</button><div className={styles.formLegend}><span className={styles.formWin}>+3</span><small>BTTS</small><span className={styles.formScoreNil}>+1</span><small>Score–nil</small><span className={styles.formLoss}>-1</span><small>0–0 / missed</small></div></div>
      </div>
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
  return <section><Heading eyebrow="TWO-WEEK FIXTURE LIST" title="Fixtures"><p>Search or browse by day, country and competition.</p></Heading><div className={styles.panel}><input className={styles.search} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search fixtures…"/>{days.map((day,dayIndex)=>{const dayFixtures=filtered.filter(f=>dayKey(f)===day);const countries=Array.from(new Set(dayFixtures.map(f=>normaliseCountry(f.country))));return <details className={styles.fixtureDetails} key={day} open={Boolean(q)||dayIndex===0}><summary>{new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",weekday:"long",day:"numeric",month:"long"}).format(new Date(`${day}T12:00:00Z`))}<span>{dayFixtures.length} fixtures</span></summary>{countries.map(country=><details className={styles.fixtureDetailsNested} key={country} open={Boolean(q)}><summary>{country}</summary>{Array.from(new Set(dayFixtures.filter(f=>normaliseCountry(f.country)===country).map(competitionDisplayName))).map(comp=><details className={styles.fixtureDetailsLeague} key={comp} open={Boolean(q)}><summary>{comp}</summary>{dayFixtures.filter(f=>normaliseCountry(f.country)===country&&competitionDisplayName(f)===comp).map(f=><div className={styles.row} key={f.id}><span>{formatKickoff(f.kickoff_at)}</span><span><strong>{f.home_team} v {f.away_team}</strong></span><strong>{f.odds_fractional??"—"}</strong><span>{f.status}</span></div>)}</details>)}</details>)}</details>})}</div></section>
}
function LeagueTable({standings,seasonLabel,gameweek,entryFee}:{standings:Standing[];seasonLabel:string;gameweek:Gameweek|null;entryFee:number}){
  const topThree = standings.slice(0,3);
  const prizePot = standings.length * entryFee;

  return <section className={styles.leaguePage}>
    <Heading eyebrow={`SEASON ${seasonLabel} · ${gameweek?`GAMEWEEK ${gameweek.number}`:""} · EST 2024`} title="League Table" actions={<span className={styles.shareInline}><ShareTableButton rows={standings} seasonLabel={seasonLabel} gameweekNumber={gameweek?.number??null} prizePot={prizePot}/></span>}>
      <p>S-N = score–nil +1. Ties: fewest 0–0 results, most BTTS wins, then alphabetical.</p>
    </Heading>
    <div className={styles.leagueHero}>
      <div><span>BOUNCE BTTS LEAGUE</span><h3>Season Standings</h3><p>{standings.length} players · £{prizePot.toFixed(0)} prize pot</p></div>
      <img src="/assets/bounce-cup.png" alt="" aria-hidden="true"/>
    </div>
    {!!topThree.length && <div className={styles.leaderboardShowcase}>
      {topThree.map((row,index)=><article key={row.id} className={`${styles.positionSpotlight} ${index===0?styles.positionSpotlightLeader:""}`}>
        <span>{index===0?"CURRENT LEADER":"CHASING PACK"}</span>
        <strong>{ordinal(index+1)} · {row.name}</strong>
        <div className={styles.positionSpotlightMeta}>
          <b>{row.points} pts</b>
          <small>{row.wins} BTTS wins</small>
          <small>{row.zeroZeroCount} × 0–0</small>
        </div>
      </article>)}
    </div>}
    <div className={styles.leagueStatsBand}>
      <article><span>LEAGUE LEADER</span><strong>{standings[0]?.name ?? "—"}</strong></article>
      <article><span>WINNING SCORE</span><strong>{standings[0]?.points ?? 0} pts</strong></article>
      <article><span>SEASON POT</span><strong>£{prizePot.toFixed(0)}</strong></article>
    </div>
    <div className={`${styles.panel} ${styles.table} ${styles.fullLeagueTable} ${styles.enhancedTableShell}`}>
      <div className={`${styles.tableRow} ${styles.header}`}><span>POS</span><span>PLAYER</span><span>P</span><span>W</span><span>S-N</span><span>0-0</span><span>PTS</span></div>
      {standings.map((r,i)=><div key={r.id} className={`${styles.tableRow} ${i===0?styles.leader:""} ${i<3?styles.tableRowTopThree:""}`}>
        <span className={styles.positionCell}>{i===0?"🏆":i===1?"🥈":i===2?"🥉":i+1}</span>
        <strong>{r.name}</strong><span>{r.played}</span><span>{r.wins}</span><span>{r.oneSided}</span><span>{r.zeroZeroCount}</span><b>{r.points}</b>
      </div>)}
    </div>
  </section>
}
function ResultsPage({gameweek,fixtures,predictions,profiles,onRefresh}:{gameweek:Gameweek|null;fixtures:Fixture[];predictions:Prediction[];profiles:Profile[];onRefresh:()=>void}){const selected=predictions.map(p=>({prediction:p,fixture:fixtures.find(f=>f.id===p.fixture_id),profile:profiles.find(pr=>pr.id===p.member_id)})).filter(x=>x.fixture&&x.profile);const groups=Array.from(new Set(fixtures.map(f=>`${normaliseCountry(f.country)}|${competitionDisplayName(f)}`))).sort();return <section><Heading eyebrow={gameweek?`GAMEWEEK ${gameweek.number}`:"RESULTS"} title="Results" actions={<button className={styles.button} onClick={onRefresh}>Refresh displayed data</button>}><p>Selected matches first, followed by every fixture in the gameweek.</p></Heading><div className={styles.panel}><div className={styles.title}>SELECTED MATCHES</div>{selected.map(({prediction,fixture,profile})=>{const outcome=outcomeLabel(fixture!.home_score,fixture!.away_score,fixture!.status,prediction.points_awarded);return <div className={styles.resultRow} key={prediction.id}><strong>{profile!.display_name}</strong><span>{fixture!.home_team} v {fixture!.away_team}</span><b className={styles.score}>{fixture!.home_score==null?"—":`${fixture!.home_score}-${fixture!.away_score}`}</b><span>{fixture!.status}</span><span className={outcome.tone==="good"?styles.statusGood:outcome.tone==="warn"?styles.statusWarn:outcome.tone==="bad"?styles.statusBad:styles.statusNeutral}>{outcome.label} {outcome.points!=null?`(${outcome.points>0?"+":""}${outcome.points})`:""}</span></div>})}{!selected.length&&<div className={styles.notice}>No selected matches yet.</div>}</div><div className={styles.panel}><div className={styles.title}>ALL RESULTS / FIXTURES</div>{groups.map(key=>{const [country,competition]=key.split("|");return <div key={key}><h3 className={styles.groupTitle}>{country} · {competition}</h3>{fixtures.filter(f=>normaliseCountry(f.country)===country&&competitionDisplayName(f)===competition).sort(fixtureSort).map(f=><div className={styles.resultRow} key={f.id}><span>{formatKickoff(f.kickoff_at)}</span><span>{f.home_team} v {f.away_team}</span><b className={styles.score}>{f.home_score==null?"—":`${f.home_score}-${f.away_score}`}</b><span>{f.status}</span><span>{predictions.some(p=>p.fixture_id===f.id)?"Selected":""}</span></div>)}</div>})}</div></section>}

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
    <Heading eyebrow="EST 2024 · SEASON ARCHIVE" title="League History">
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
function ReleaseHistory(){const releases=[{version:RELEASE_VERSION,date:RELEASE_DATE,summary:"Alert accuracy, mobile alert redesign and history correction",changes:["BST/UTC-equivalent kickoffs no longer create false alerts","Normal live/finished status progression no longer creates critical pick alerts","Alerts redesigned into readable mobile-first cards with unresolved/resolved views","Ryan correctly shown as reigning 2025/26 champion","History archive now opens on the latest completed season","Admin Selections now uses the same searchable fixture picker in browser, iPhone and Android","League History redesigned with archive hero, trophy artwork and richer roll of honour cards","League Table upgraded with leader spotlight cards and stronger table styling","Mobile and desktop polish for archive/table presentation","Mobile Dashboard and league/history table cleanup","League tables retain P, W, S-N, 0-0 and PTS","Form range controls for 6, 12 or 18 gameweeks and shareable form snapshot","Collapsible fixture days, countries and competitions","Search filtering retained across fixture views","Ultimate Admin read-only user emulation","Read-only Demo Mode with Member/Admin views and masked credentials","Release History added to About","Demo Guest backend compatibility and league-isolation safeguards"]},{version:"1.3.x",date:"10 Aug 2026",summary:"Dashboard restoration and scoring repair",changes:["Restored richer Bounce/Hearts dashboard presentation","Repaired Gameweek 1 scoring flow and result update validation","Restored six-week form table and richer league presentation"]}];return <div><h3>Release History</h3>{releases.map((r,i)=><details className={styles.releaseItem} key={r.version} open={i===0}><summary><span><strong>v{r.version}</strong> · {r.date}</span><small>{r.summary}</small></summary><ul>{r.changes.map(c=><li key={c}>{c}</li>)}</ul></details>)}</div>}

function Instructions({role}:{role:Role}){return <><h3>Instructions — {role==="ultimate_admin"?"Ultimate Admin":role==="admin"?"League Admin":role==="guest"?"Demo Guest":"Member"}</h3><ul><li><strong>Making a pick:</strong> open Make My Pick, search, choose a fixture and press Select.</li><li><strong>Viewing picks:</strong> Dashboard shows submitted and pending players plus live/provisional outcomes.</li><li><strong>Sharing:</strong> use Share weekly picks or Share table snapshot.</li>{role!=="member"&&<><li><strong>Admin selections:</strong> Admin → Selections lets you enter or replace multiple player picks before one Save all.</li><li><strong>Fixtures:</strong> use Quick results refresh during match time; use Full fixture & odds refresh for the complete catalogue.</li><li><strong>Results/scoring:</strong> Save FT writes the result and triggers scoring; Recalculate Gameweek Points repairs finished selections.</li></>}{role==="ultimate_admin"&&<li><strong>Users:</strong> Ultimate Admin can manage usernames, passwords, roles and active slots.</li>}</ul></>}

function AdminPage({active,setActive,isUltimate,readOnly,demoMode,onEmulate,gameweek,nextGameweek,profiles,fixtures,predictions,adjustments,notice,onChanged}:{active:AdminView;setActive:(v:AdminView)=>void;isUltimate:boolean;readOnly:boolean;demoMode:boolean;onEmulate:(id:string)=>void;gameweek:Gameweek|null;nextGameweek:Gameweek|null;profiles:Profile[];fixtures:Fixture[];predictions:Prediction[];adjustments:ScoreAdjustment[];notice:(m:string)=>void;onChanged:()=>void}){
  const wrap=(node:ReactNode)=><fieldset disabled={readOnly} className={readOnly?styles.readOnlyControls:""} style={{border:0,padding:0,margin:0,minWidth:0}}>{node}</fieldset>;
  return <section><Heading eyebrow="ADMIN CONTROL" title="League Management"><p>{isUltimate?"Full league, user and security administration.":"Manage selections, fixtures, results and gameweek status."}</p></Heading><div className={styles.adminTabs}>{(["users","selections","fixtures","results","gameweek","seasons"] as AdminView[]).filter(v=>v!=="users"||isUltimate).map(v=><button key={v} className={active===v?styles.active:""} onClick={()=>setActive(v)}>{v[0].toUpperCase()+v.slice(1)}</button>)}</div><div className={styles.panel}>{readOnly&&<div className={styles.demoNotice}>Read-only view — controls are disabled.</div>}{active==="users"&&isUltimate&&(demoMode?<DemoUsersAdmin profiles={profiles}/>:wrap(<UsersAdmin notice={notice} onEmulate={onEmulate}/>))}{active==="selections"&&wrap(<SelectionsAdmin gameweek={gameweek} profiles={profiles} fixtures={fixtures} predictions={predictions} adjustments={adjustments} notice={notice} onChanged={onChanged}/>) }{active==="fixtures"&&wrap(<FixturesAdmin gameweek={gameweek} nextGameweek={nextGameweek} notice={notice} onChanged={onChanged}/>) }{active==="results"&&wrap(<ResultsAdmin gameweek={gameweek} fixtures={fixtures} predictions={predictions} notice={notice} onChanged={onChanged}/>) }{active==="gameweek"&&wrap(<GameweekAdmin gameweek={gameweek} notice={notice} onChanged={onChanged}/>) }{active==="seasons"&&wrap(<SeasonsAdmin notice={notice} onChanged={onChanged}/>)}</div></section>;
}

function UsersAdmin({notice,onEmulate}:{notice:(m:string)=>void;onEmulate:(id:string)=>void}){const [users,setUsers]=useState<any[]>([]);const [loading,setLoading]=useState(true);async function load(){const r=await fetch("/api/admin/users",{headers:{authorization:`Bearer ${await token()}`}});const j=await r.json();if(r.ok)setUsers(j.users??[]);else notice(j.error);setLoading(false)}useEffect(()=>{load()},[]);async function save(u:any){const r=await fetch("/api/admin/users",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({id:u.id,username:u.username,displayName:u.display_name,role:u.role,active:u.active,password:u.password})});const j=await r.json();notice(r.ok?`${u.username} saved`:j.error)}if(loading)return <div>Loading users…</div>;return <div><p className={styles.notice}>Passwords and access controls remain Ultimate Admin only. <Help text="Use Generate to make a simple replacement password, Save to apply it, and Copy to send the login privately."/></p>{users.map((u:any)=><div className={styles.row} key={u.id}><input value={u.display_name} disabled={u.slot_number===1} onChange={e=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,display_name:e.target.value}:x))}/><input value={u.password} onChange={e=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,password:e.target.value}:x))}/><select value={u.role} disabled={u.slot_number===1} onChange={e=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,role:e.target.value}:x))}><option value="member">Member</option><option value="admin">League Admin</option><option value="guest">Demo Guest</option>{u.slot_number===1&&<option value="ultimate_admin">Ultimate Admin</option>}</select><div className={styles.buttonRow}><button className={styles.button} disabled={u.slot_number===1} aria-pressed={u.active} onClick={()=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,active:!x.active}:x))}>{u.active?"Active ✓":"Inactive"}</button><button className={styles.button} onClick={()=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,password:`bounce${u.slot_number}${Math.floor(10+Math.random()*90)}`}:x))}>Generate</button><button className={styles.button} onClick={()=>navigator.clipboard.writeText(`${u.display_name}\nUsername: ${u.username}\nPassword: ${u.password}`).then(()=>notice("Login details copied"))}>Copy</button><button className={styles.button} onClick={()=>onEmulate(u.id)}>Emulate</button><button className={styles.primary} onClick={()=>save(u)}>Save</button></div></div>)}</div>}

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
  useEffect(()=>{setDraft(Object.fromEntries(active.map(p=>[p.id,current.find(x=>x.member_id===p.id)?.fixture_id??""])))},[active,current]);
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

function FixturesAdmin({gameweek,nextGameweek,notice,onChanged}:{gameweek:Gameweek|null;nextGameweek:Gameweek|null;notice:(m:string)=>void;onChanged:()=>void}){const [busy,setBusy]=useState("");const [form,setForm]=useState({competition:"Scottish Premiership",country:"Scotland",homeTeam:"",awayTeam:"",kickoffLocal:"",oddsFractional:""});async function sync(gw:Gameweek|null,mode:"results"|"full"){if(!gw)return;setBusy(mode);const r=await fetch("/api/admin/provider-sync",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({gameweekIds:[gw.id],mode})});const j=await r.json();notice(r.ok?(mode==="results"?`Results refresh complete · ${j.fixturesUpdated??0} updated`:`Full refresh complete · ${j.fixturesAdded??0} added, ${j.fixturesUpdated??0} updated, ${j.oddsUpdated??0} odds`):j.error);setBusy("");if(r.ok)onChanged()}async function add(e:FormEvent){e.preventDefault();if(!gameweek)return;const r=await fetch("/api/admin/fixtures",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({...form,kickoffAt:new Date(form.kickoffLocal).toISOString(),gameweekId:gameweek.id})});const j=await r.json();notice(r.ok?"Fixture added":j.error);if(r.ok)onChanged()}return <div><div className={styles.notice}><strong>Update controls</strong><br/>Quick results refresh asks the live provider-sync route for results mode, while Full fixture & odds refresh performs the full catalogue update. The request is backward-compatible with the existing live route. <Help text="Use Quick during match time. Use Full when you need new fixtures, kickoff changes or refreshed BTTS odds."/></div><div className={styles.buttonRow} style={{margin:"12px 0"}}><button className={styles.primary} disabled={!gameweek||!!busy} onClick={()=>sync(gameweek,"results")}>{busy==="results"?"Refreshing results…":"Quick results refresh"}</button><button className={styles.button} disabled={!gameweek||!!busy} onClick={()=>sync(gameweek,"full")}>{busy==="full"?"Refreshing fixtures & odds…":"Full fixture & odds refresh"}</button>{nextGameweek&&<button className={styles.button} disabled={!!busy} onClick={()=>sync(nextGameweek,"full")}>Full refresh next GW {nextGameweek.number}</button>}</div><form onSubmit={add}><h3>Manual fixture entry</h3><div className={styles.formGrid}><label className={styles.field}>Competition<input value={form.competition} onChange={e=>setForm({...form,competition:e.target.value})}/></label><label className={styles.field}>Country<input value={form.country} onChange={e=>setForm({...form,country:e.target.value})}/></label><label className={styles.field}>Home team<input required value={form.homeTeam} onChange={e=>setForm({...form,homeTeam:e.target.value})}/></label><label className={styles.field}>Away team<input required value={form.awayTeam} onChange={e=>setForm({...form,awayTeam:e.target.value})}/></label><label className={styles.field}>Kickoff <Help text="Local UK date/time for this fixture."/><input type="datetime-local" required value={form.kickoffLocal} onChange={e=>setForm({...form,kickoffLocal:e.target.value})}/></label><label className={styles.field}>BTTS fractional odds <Help text="Optional manual odds such as 8/11. The full provider refresh can replace this when provider odds exist."/><input value={form.oddsFractional} onChange={e=>setForm({...form,oddsFractional:e.target.value})}/></label></div><button className={styles.primary}>Add fixture manually</button></form></div>}

function ResultsAdmin({gameweek,fixtures,predictions,notice,onChanged}:{gameweek:Gameweek|null;fixtures:Fixture[];predictions:Prediction[];notice:(m:string)=>void;onChanged:()=>void}){const [scores,setScores]=useState<Record<string,{home:string;away:string}>>(()=>Object.fromEntries(fixtures.map(f=>[f.id,{home:f.home_score?.toString()??"",away:f.away_score?.toString()??""}])));useEffect(()=>{setScores(Object.fromEntries(fixtures.map(f=>[f.id,{home:f.home_score?.toString()??"",away:f.away_score?.toString()??""}])))},[fixtures]);const [busy,setBusy]=useState(false);async function save(f:Fixture,silent=false){const row=scores[f.id];if(!row||row.home===""||row.away==="")return false;const r=await fetch("/api/admin/results",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({fixtureId:f.id,homeScore:Number(row.home),awayScore:Number(row.away)})});const j=await r.json();if(!silent)notice(r.ok?"Result and points saved":j.error);return r.ok}async function recalc(){const selectedFinished=fixtures.filter(f=>predictions.some(p=>p.fixture_id===f.id)&&finishedStatuses.includes(f.status)&&f.home_score!=null&&f.away_score!=null);if(!selectedFinished.length)return notice("No finished selected fixtures to recalculate.");if(!window.confirm(`Recalculate points for ${selectedFinished.length} finished selected match${selectedFinished.length===1?"":"es"}?`))return;setBusy(true);let ok=0;for(const f of selectedFinished){if(await save(f,true))ok++}setBusy(false);notice(`Recalculated ${ok}/${selectedFinished.length} finished selected matches`);onChanged()}return <div><div className={styles.buttonRow}><button className={styles.primary} disabled={busy} onClick={recalc}>{busy?"Recalculating…":"Recalculate Gameweek Points"}</button><Help text="Repairs scoring by re-saving each finished selected fixture through the same live result endpoint used by manual FT entry."/></div>{fixtures.sort(fixtureSort).map(f=>{const pred=predictions.find(p=>p.fixture_id===f.id);const warning=finishedStatuses.includes(f.status)&&pred&&pred.points_awarded==null;return <div className={styles.row} key={f.id}><span><small>{competitionDisplayName(f)}</small><br/><strong>{f.home_team} v {f.away_team}</strong>{warning&&<><br/><small className={styles.error}>Finished selected fixture has no awarded points</small></>}</span><input type="number" min="0" value={scores[f.id]?.home??""} onChange={e=>setScores(s=>({...s,[f.id]:{...s[f.id],home:e.target.value}}))}/><input type="number" min="0" value={scores[f.id]?.away??""} onChange={e=>setScores(s=>({...s,[f.id]:{...s[f.id],away:e.target.value}}))}/><button className={styles.button} onClick={async()=>{if(await save(f)){onChanged()}}}>Save FT</button></div>})}</div>}

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

