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
type Role = "ultimate_admin" | "admin" | "member";

type Profile = { id: string; username: string; display_name: string; role: Role; active: boolean; slot_number: number | null };
type Gameweek = { id: string; number: number; status: "open" | "locked" | "complete"; opens_at: string | null; locks_at: string; season_id: string | null };
type Fixture = { id: string; gameweek_id: string | null; competition: string; country: string; home_team: string; away_team: string; kickoff_at: string; status: string; home_score: number | null; away_score: number | null; odds_fractional: string | null; odds_checked_at: string | null; source: string; is_eligible: boolean };
type Prediction = { id: string; gameweek_id: string; member_id: string; fixture_id: string; points_awarded: number | null; created_at: string; updated_at: string };
type ScoreAdjustment = { id: string; gameweek_id: string; member_id: string; points: number; reason: string; source: "automatic" | "admin"; created_at: string; updated_at: string };
type SeasonHistory = { id: string; label: string; isCurrent: boolean; gameweeks: number; completedPicks: number; standings: Array<{ id: string; name: string; played: number; wins: number; zeroZeroCount: number; points: number }> };
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
function initials(name: string) { return name.split(/\s+/).map(p => p[0] ?? "").join("").slice(0,2).toUpperCase(); }
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
  const isAdmin = initialProfile.role === "admin" || initialProfile.role === "ultimate_admin";
  const profiles = useMemo(() => initialProfiles.filter(p => p.active), [initialProfiles]);
  const [view,setView] = useState<View>("dashboard");
  const [adminView,setAdminView] = useState<AdminView>(initialProfile.role === "ultimate_admin" ? "users" : "selections");
  const [gameweekId,setGameweekId] = useState(initialGameweek?.id ?? initialGameweeks[0]?.id ?? "");
  const [fixtures,setFixtures] = useState(initialFixtures);
  const [allFixtures,setAllFixtures] = useState(initialAllFixtures);
  const [predictions,setPredictions] = useState(initialPredictions);
  const [adjustments] = useState(initialAdjustments);
  const [mobileMenu,setMobileMenu] = useState(false);
  const [toast,setToast] = useState("");
  const [now,setNow] = useState(Date.now());
  const [alertsCount,setAlertsCount] = useState(0);
  const gameweek = initialGameweeks.find(g => g.id === gameweekId) ?? initialGameweek;
  const currentFixtures = useMemo(() => fixtures.filter(f => f.gameweek_id === gameweek?.id), [fixtures,gameweek?.id]);
  const currentPredictions = useMemo(() => predictions.filter(p => p.gameweek_id === gameweek?.id), [predictions,gameweek?.id]);
  const isOpen = Boolean(gameweek && (isAdmin || (gameweek.status === "open" && (!gameweek.opens_at || new Date(gameweek.opens_at).getTime() <= now) && new Date(gameweek.locks_at).getTime() > now)));
  const selectedPrediction = currentPredictions.find(p => p.member_id === initialProfile.id);
  const selectedFixture = currentFixtures.find(f => f.id === selectedPrediction?.fixture_id);
  const selectedAdjustment = adjustments.find(a => a.gameweek_id === gameweek?.id && a.member_id === initialProfile.id);
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
  useEffect(() => { if (!isAdmin) return; (async()=>{ const r=await fetch("/api/admin/alerts",{headers:{authorization:`Bearer ${await token()}`}}); if(r.ok){ const j=await r.json(); setAlertsCount((j.alerts ?? []).filter((a:any)=>!a.resolved).length); } })(); },[isAdmin,view]);

  async function selectFixture(fixtureId: string) {
    if (!gameweek || !isOpen) return;
    const taken = predictions.find(p => p.gameweek_id === gameweek.id && p.fixture_id === fixtureId && p.member_id !== initialProfile.id);
    if (taken) return notice("That fixture has already been selected.");
    const client = createClient();
    if (selectedPrediction) {
      const { error } = await client.from("predictions").update({fixture_id:fixtureId,updated_at:new Date().toISOString()}).eq("id",selectedPrediction.id);
      if (error) return notice(error.message);
      setPredictions(rows => rows.map(p => p.id === selectedPrediction.id ? {...p,fixture_id:fixtureId} : p));
    } else {
      const { data,error } = await client.from("predictions").insert({gameweek_id:gameweek.id,member_id:initialProfile.id,fixture_id:fixtureId}).select().single();
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
      <button className={styles.profile} onClick={signOut}><span>{initials(initialProfile.display_name)}</span><span><strong>{initialProfile.display_name}</strong><small>{initialProfile.role === "ultimate_admin"?"Ultimate Admin":initialProfile.role === "admin"?"League Admin":initialProfile.username}</small></span><b>↪</b></button>
    </aside>
    {mobileMenu && <button className={styles.scrim} aria-label="Close menu" onClick={()=>setMobileMenu(false)}/>} 
    <section className={styles.main}>
      <header className={styles.hero}><div><h1>BOUNCE</h1><h2>— BTTS LEAGUE —</h2><p>EDINBURGH · HEART OF MIDLOTHIAN · EST 2024</p></div><div className={styles.gwCard}><label>Season {seasonLabel}</label><div className={styles.gwRow}><button disabled={initialGameweeks.findIndex(g=>g.id===gameweekId)<=0} onClick={()=>{const i=initialGameweeks.findIndex(g=>g.id===gameweekId);if(i>0)setGameweekId(initialGameweeks[i-1].id)}}>‹</button><select value={gameweek?.id??""} onChange={e=>setGameweekId(e.target.value)}>{initialGameweeks.map(g=><option key={g.id} value={g.id}>GW {g.number}</option>)}</select><button disabled={initialGameweeks.findIndex(g=>g.id===gameweekId)>=initialGameweeks.length-1} onClick={()=>{const i=initialGameweeks.findIndex(g=>g.id===gameweekId);if(i>=0&&i<initialGameweeks.length-1)setGameweekId(initialGameweeks[i+1].id)}}>›</button></div><small>{gameweekStatusText(gameweek??null,now)}</small></div></header>
      <div className={styles.content}><div className={styles.page}>
        {view==="dashboard" && <Dashboard gameweek={gameweek??null} profiles={profiles} fixtures={currentFixtures} predictions={currentPredictions} adjustment={selectedAdjustment} myFixture={selectedFixture} standings={standings} entryFee={entryFee} seasonLabel={seasonLabel} isOpen={isOpen} setView={setView}/>} 
        {view==="pick" && <PickPage gameweek={gameweek??null} fixtures={currentFixtures.filter(f=>f.is_eligible)} predictions={currentPredictions} profiles={profiles} isOpen={isOpen} myId={initialProfile.id} selectFixture={selectFixture}/>} 
        {view==="fixtures" && <FixturesPage fixtures={allFixtures}/>} 
        {view==="table" && <LeagueTable standings={standings} seasonLabel={seasonLabel} gameweek={gameweek??null} entryFee={entryFee}/>} 
        {view==="results" && <ResultsPage gameweek={gameweek??null} fixtures={currentFixtures} predictions={currentPredictions} profiles={profiles} onRefresh={()=>refreshLiveData(false)}/>} 
        {view==="history" && <HistoryPage seasonHistory={seasonHistory}/>} 
        {view==="players" && <PlayersPage profiles={profiles} gameweek={gameweek??null} fixtures={currentFixtures} predictions={currentPredictions} adjustments={adjustments}/>} 
        {view==="about" && <AboutPage role={initialProfile.role} profiles={profiles}/>} 
        {view==="alerts" && isAdmin && <AlertsPage notice={notice} onCount={setAlertsCount}/>} 
        {view==="admin" && isAdmin && <AdminPage active={adminView} setActive={setAdminView} isUltimate={initialProfile.role==="ultimate_admin"} gameweek={gameweek??null} nextGameweek={initialGameweeks.find(g=>g.number===(gameweek?.number??0)+1)??null} profiles={profiles} fixtures={currentFixtures} predictions={currentPredictions} adjustments={adjustments} notice={notice} onChanged={()=>refreshLiveData(false)}/>} 
      </div></div><footer className={styles.footer}>♡ MADE BY THE ARTIST, FOR THE BOUNCE</footer>
    </section>
    {toast && <div className={styles.toast}>{toast}</div>}
  </main>;
}

function Heading({eyebrow,title,children,actions}:{eyebrow:string;title:string;children?:ReactNode;actions?:ReactNode}){return <div className={styles.heading}><div><span>{eyebrow}</span><h2>{title}</h2>{children}</div>{actions}</div>}

function Dashboard({gameweek,profiles,fixtures,predictions,adjustment,myFixture,standings,entryFee,seasonLabel,isOpen,setView}:{gameweek:Gameweek|null;profiles:Profile[];fixtures:Fixture[];predictions:Prediction[];adjustment?:ScoreAdjustment;myFixture?:Fixture;standings:Standing[];entryFee:number;seasonLabel:string;isOpen:boolean;setView:(v:View)=>void}){
  const picks=profiles.map(profile=>{const prediction=predictions.find(p=>p.member_id===profile.id);return {profile,prediction,fixture:fixtures.find(f=>f.id===prediction?.fixture_id)}});
  const finished=fixtures.filter(f=>finishedStatuses.includes(f.status));
  return <div className={styles.grid2}><section>
    <article className={styles.panel}><div className={styles.title}>YOUR PICK — {gameweek?`GAMEWEEK ${gameweek.number}`:"NO ACTIVE GAMEWEEK"}</div>{myFixture?<div className={styles.pickHero}><strong>{myFixture.home_team}</strong><span className={styles.versus}>{myFixture.home_score!=null?`${myFixture.home_score} — ${myFixture.away_score}`:"V"}</span><strong>{myFixture.away_team}</strong><small className={styles.subtle} style={{gridColumn:"1/-1"}}>{formatKickoff(myFixture.kickoff_at)} · BTTS {myFixture.odds_fractional??"Odds unavailable"}</small></div>:adjustment?<div><strong>MISSED DEADLINE</strong><p>{adjustment.points} point(s) · {adjustment.reason}</p></div>:<button className={styles.primary} onClick={()=>setView("pick")}>{isOpen?"Make your BTTS pick":"Selections are currently closed"}</button>}</article>
    <article className={styles.panel}><div className={styles.title}>EVERYONE'S PICKS SO FAR</div>{picks.map(({profile,prediction,fixture})=>{const outcome=fixture?outcomeLabel(fixture.home_score,fixture.away_score,fixture.status,prediction?.points_awarded??null):null;return <div className={styles.row} key={profile.id}><strong>{profile.display_name}</strong><span>{fixture?`${fixture.home_team} v ${fixture.away_team}`:"Awaiting selection"}</span><span>{fixture?.odds_fractional??"—"}</span><span className={outcome?.tone==="good"?styles.statusGood:outcome?.tone==="warn"?styles.statusWarn:outcome?.tone==="bad"?styles.statusBad:styles.statusNeutral}>{outcome?`${outcome.label}${outcome.points!=null?` · ${outcome.points>0?"+":""}${outcome.points}`:""}`:"PENDING"}</span></div>})}<div className={styles.buttonRow}><WeeklyPicksShareButton disabled={!gameweek} gameweekNumber={gameweek?.number??0} seasonLabel={seasonLabel} picks={picks.filter(p=>p.fixture).map(p=>({player:p.profile.display_name,homeTeam:p.fixture!.home_team,awayTeam:p.fixture!.away_team,competition:competitionDisplayName(p.fixture!),kickoffAt:p.fixture!.kickoff_at,odds:p.fixture!.odds_fractional}))}/></div></article>
  </section><aside><article className={styles.panel}><div className={styles.title}>GAMEWEEK STATUS</div><div className={styles.miniCards}><div className={styles.miniCard}><strong>{predictions.length}</strong><span>of {profiles.length} picks</span></div><div className={styles.miniCard}><strong>£{(profiles.length*entryFee).toFixed(0)}</strong><span>Prize pot</span></div><div className={styles.miniCard}><strong>{finished.length}</strong><span>Finished</span></div></div></article><article className={styles.panel}><div className={styles.title}>LEAGUE TABLE</div>{standings.slice(0,8).map((r,i)=><div className={styles.row} style={{gridTemplateColumns:"40px 1fr 70px 70px"}} key={r.id}><span>{i+1}</span><strong>{r.name}</strong><span>{r.wins} W</span><b>{r.points}</b></div>)}<div className={styles.buttonRow}><button className={styles.button} onClick={()=>setView("table")}>View full table →</button><span className={styles.shareInline}><ShareTableButton compact rows={standings} seasonLabel={seasonLabel} gameweekNumber={gameweek?.number??null} prizePot={profiles.length*entryFee}/></span></div></article></aside></div>
}

function PickPage({gameweek,fixtures,predictions,profiles,isOpen,myId,selectFixture}:{gameweek:Gameweek|null;fixtures:Fixture[];predictions:Prediction[];profiles:Profile[];isOpen:boolean;myId:string;selectFixture:(id:string)=>void}){
  const [search,setSearch]=useState(""); const q=search.toLowerCase().trim();
  const filtered=[...fixtures].filter(f=>!q||`${f.home_team} ${f.away_team} ${f.competition} ${f.country} ${competitionDisplayName(f)}`.toLowerCase().includes(q)).sort(fixtureSort);
  const groups=Array.from(new Set(filtered.map(competitionDisplayName)));
  return <section><Heading eyebrow={gameweek?`GAMEWEEK ${gameweek.number}`:"NO GAMEWEEK"} title="Make My Pick"><p>Choose one unique eligible fixture. <Help text="Search by team or competition, then choose your BTTS: Yes selection. You can change it until the deadline."/></p></Heading><div className={styles.panel}><input className={styles.search} type="search" placeholder="Search team or competition…" value={search} onChange={e=>setSearch(e.target.value)}/>{groups.map(group=><div key={group}><h3 className={styles.groupTitle}>{group}</h3>{filtered.filter(f=>competitionDisplayName(f)===group).map(f=>{const pred=predictions.find(p=>p.fixture_id===f.id&&p.gameweek_id===gameweek?.id);const owner=profiles.find(p=>p.id===pred?.member_id);return <div className={styles.row} key={f.id}><span>{formatKickoff(f.kickoff_at)}</span><strong>{f.home_team} v {f.away_team}</strong><span>{f.odds_fractional??"—"}</span><button className={styles.button} disabled={!isOpen||!!(owner&&owner.id!==myId)} onClick={()=>selectFixture(f.id)}>{owner?.id===myId?"Picked ✓":owner?`Taken by ${owner.display_name}`:isOpen?"Select":"Closed"}</button></div>})}</div>)}</div></section>
}

function FixturesPage({fixtures}:{fixtures:Fixture[]}){const [search,setSearch]=useState("");const q=search.toLowerCase().trim();const filtered=[...fixtures].filter(f=>!q||`${f.home_team} ${f.away_team} ${f.country} ${competitionDisplayName(f)}`.toLowerCase().includes(q)).sort((a,b)=>a.kickoff_at.localeCompare(b.kickoff_at)||fixtureSort(a,b));const days=Array.from(new Set(filtered.map(f=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(f.kickoff_at)))));return <section><Heading eyebrow="TWO-WEEK FIXTURE LIST" title="Fixtures"><p>All stored fixtures, searchable by team, country or competition.</p></Heading><div className={styles.panel}><input className={styles.search} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search fixtures…"/>{days.map(day=><div key={day}><h3 className={styles.groupTitle}>{new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",weekday:"long",day:"numeric",month:"long"}).format(new Date(`${day}T12:00:00Z`))}</h3>{filtered.filter(f=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(f.kickoff_at))===day).map(f=><div className={styles.row} key={f.id}><span>{formatKickoff(f.kickoff_at)}</span><span><strong>{f.home_team} v {f.away_team}</strong><br/><small>{competitionDisplayName(f)}</small></span><strong>{f.odds_fractional??"—"}</strong><span>{f.status}</span></div>)}</div>)}</div></section>}

function LeagueTable({standings,seasonLabel,gameweek,entryFee}:{standings:Standing[];seasonLabel:string;gameweek:Gameweek|null;entryFee:number}){return <section><Heading eyebrow={`SEASON ${seasonLabel} · ${gameweek?`GAMEWEEK ${gameweek.number}`:""} · EST 2024`} title="League Table" actions={<span className={styles.shareInline}><ShareTableButton rows={standings} seasonLabel={seasonLabel} gameweekNumber={gameweek?.number??null} prizePot={standings.length*entryFee}/></span>}><p>S-N = score–nil +1. Ties: fewest 0–0 results, most BTTS wins, then alphabetical.</p></Heading><div className={`${styles.panel} ${styles.table}`}><div className={`${styles.tableRow} ${styles.header}`}><span>POS</span><span>PLAYER</span><span>P</span><span>W</span><span>S-N</span><span>0-0</span><span>PTS</span></div>{standings.map((r,i)=><div key={r.id} className={`${styles.tableRow} ${i===0?styles.leader:""}`}><span>{i+1}</span><strong>{r.name}</strong><span>{r.played}</span><span>{r.wins}</span><span>{r.oneSided}</span><span>{r.zeroZeroCount}</span><b>{r.points}</b></div>)}</div></section>}

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
      zeroZeroCount:row.losses,
      points:row.points
    }))
  }));
  const seasons: SeasonHistory[] = [
    ...legacy,
    ...seasonHistory.filter((season)=>!legacy.some((item)=>item.label===season.label))
  ];
  const [id,setId]=useState(seasons[0]?.id??"");
  const selected: SeasonHistory | undefined = seasons.find((season)=>season.id===id)??seasons[0];

  return <section>
    <Heading eyebrow="EST 2024 · SEASON ARCHIVE" title="League History">
      <p>Previous winners and final tables.</p>
    </Heading>
    <div className={styles.panel}>
      <div className={styles.title}>ROLL OF HONOUR</div>
      <div className={styles.buttonRow}>
        {rollOfHonour.map((row)=><div className={styles.miniCard} key={row.season}><strong>{row.season}</strong><span>{row.winner}</span></div>)}
      </div>
    </div>
    <div className={styles.buttonRow}>
      {seasons.map((season)=><button className={season.id===selected?.id?styles.primary:styles.button} key={season.id} onClick={()=>setId(season.id)}>{season.label}</button>)}
    </div>
    {selected&&<div className={`${styles.panel} ${styles.table}`}>
      <div className={`${styles.tableRow} ${styles.header}`} style={{gridTemplateColumns:"55px minmax(180px,1fr) repeat(4,80px)"}}>
        <span>POS</span><span>PLAYER</span><span>P</span><span>W</span><span>0-0</span><span>PTS</span>
      </div>
      {selected.standings.map((row,index)=><div className={styles.tableRow} style={{gridTemplateColumns:"55px minmax(180px,1fr) repeat(4,80px)"}} key={row.id}>
        <span>{index+1}</span><strong>{row.name}</strong><span>{row.played}</span><span>{row.wins}</span><span>{row.zeroZeroCount}</span><b>{row.points}</b>
      </div>)}
    </div>}
  </section>
}

function PlayersPage({profiles,gameweek,fixtures,predictions,adjustments}:{profiles:Profile[];gameweek:Gameweek|null;fixtures:Fixture[];predictions:Prediction[];adjustments:ScoreAdjustment[]}){return <section><Heading eyebrow="LEAGUE MEMBERS" title="Players"><p>{predictions.filter(p=>p.gameweek_id===gameweek?.id).length} of {profiles.length} have submitted.</p></Heading><div className={styles.panel}>{profiles.map(p=>{const pred=predictions.find(x=>x.member_id===p.id&&x.gameweek_id===gameweek?.id);const fx=fixtures.find(f=>f.id===pred?.fixture_id);const adj=adjustments.find(a=>a.member_id===p.id&&a.gameweek_id===gameweek?.id);return <div className={styles.row} key={p.id}><strong>{p.display_name}</strong><span>{fx?`${fx.home_team} v ${fx.away_team}`:adj?adj.reason:"Awaiting selection"}</span><span>{fx?.odds_fractional??"—"}</span><b>{fx?"PICKED ✓":adj?`${adj.points} pts`:"PENDING"}</b></div>})}</div></section>}

function AboutPage({ role, profiles }: { role: Role; profiles: Profile[] }) {
  const [tab, setTab] = useState<"about" | "rules" | "instructions" | "members">("about");
  const [rouss, setRouss] = useState(false);
  const tabs: Array<["about" | "rules" | "instructions" | "members", string]> = [
    ["about", "About"], ["rules", "Rules"], ["instructions", "Instructions"], ["members", "Members / Admins"],
  ];
  return <section>
    <Heading eyebrow="BOUNCE BTTS LEAGUE · EST 2024" title="About"><p>League information, rules and role-specific help.</p></Heading>
    <div className={styles.aboutTabs}>{tabs.map(([id,label]) => <button key={id} className={tab===id?styles.active:""} onClick={()=>setTab(id)}>{label}</button>)}</div>
    <div className={`${styles.panel} ${styles.aboutSection}`}>
      {tab === "about" && <><h3>What is Bounce BTTS?</h3><p>The app runs the private Bounce Both Teams To Score league: one unique BTTS pick per player per gameweek, automatic standings and a shareable public table.</p><p>Established 2024. Current season management, historical tables and weekly sharing are all kept in one place.</p></>}
      {tab === "rules" && <><h3>Rules</h3><ul><li>Choose one eligible fixture to finish BTTS: Yes.</li><li>No two players may choose the same fixture in the same gameweek.</li><li>BTTS = <strong>+3</strong>; score–nil = <strong>+1</strong>; 0–0 = <strong>−1</strong>.</li><li>A missed deadline receives the configured missed-selection adjustment (normally −1).</li><li>Normal deadline is Friday 17:00 UK time unless the admin changes it.</li><li>Ties: fewest 0–0 results, then most BTTS wins, then alphabetical.</li></ul></>}
      {tab === "instructions" && <Instructions role={role}/>} 
      {tab === "members" && <><h3>Members / Admins</h3>{profiles.map(p => <div className={styles.row} style={{gridTemplateColumns:"1fr 1fr"}} key={p.id}><strong>{p.display_name}</strong><span>{p.role === "ultimate_admin" ? "Ultimate Admin" : p.role === "admin" ? "League Admin" : "Member"}</span></div>)}{role === "member" && <p className={styles.small}>Member view intentionally hides account/security administration details.</p>}</>}
      <div className={styles.eggZone}><button type="button" className={styles.eggInvisible} aria-hidden="true" tabIndex={-1} onClick={()=>setRouss(true)}>.</button></div>
    </div>
    {rouss && <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Roussetted"><div className={`${styles.overlayCard} ${styles.flash}`}><img src="https://londonhearts.com/images/ianc/images/Gilles_Rousset.jpg" alt="Gilles Rousset during his Hearts career"/><h2>You’ve just been Roussetted</h2><button className={styles.primary} onClick={()=>setRouss(false)}>Close</button></div></div>}
  </section>;
}
function Instructions({role}:{role:Role}){return <><h3>Instructions — {role==="ultimate_admin"?"Ultimate Admin":role==="admin"?"League Admin":"Member"}</h3><ul><li><strong>Making a pick:</strong> open Make My Pick, search, choose a fixture and press Select.</li><li><strong>Viewing picks:</strong> Dashboard shows submitted and pending players plus live/provisional outcomes.</li><li><strong>Sharing:</strong> use Share weekly picks or Share table snapshot.</li>{role!=="member"&&<><li><strong>Admin selections:</strong> Admin → Selections lets you enter or replace multiple player picks before one Save all.</li><li><strong>Fixtures:</strong> use Quick results refresh during match time; use Full fixture & odds refresh for the complete catalogue.</li><li><strong>Results/scoring:</strong> Save FT writes the result and triggers scoring; Recalculate Gameweek Points repairs finished selections.</li></>}{role==="ultimate_admin"&&<li><strong>Users:</strong> Ultimate Admin can manage usernames, passwords, roles and active slots.</li>}</ul></>}

function AdminPage({active,setActive,isUltimate,gameweek,nextGameweek,profiles,fixtures,predictions,adjustments,notice,onChanged}:{active:AdminView;setActive:(v:AdminView)=>void;isUltimate:boolean;gameweek:Gameweek|null;nextGameweek:Gameweek|null;profiles:Profile[];fixtures:Fixture[];predictions:Prediction[];adjustments:ScoreAdjustment[];notice:(m:string)=>void;onChanged:()=>void}){return <section><Heading eyebrow="ADMIN CONTROL" title="League Management"><p>{isUltimate?"Full league, user and security administration.":"Manage selections, fixtures, results and gameweek status."}</p></Heading><div className={styles.adminTabs}>{(["users","selections","fixtures","results","gameweek","seasons"] as AdminView[]).filter(v=>v!=="users"||isUltimate).map(v=><button key={v} className={active===v?styles.active:""} onClick={()=>setActive(v)}>{v[0].toUpperCase()+v.slice(1)}</button>)}</div><div className={styles.panel}>{active==="users"&&isUltimate&&<UsersAdmin notice={notice}/>} {active==="selections"&&<SelectionsAdmin gameweek={gameweek} profiles={profiles} fixtures={fixtures} predictions={predictions} adjustments={adjustments} notice={notice} onChanged={onChanged}/>} {active==="fixtures"&&<FixturesAdmin gameweek={gameweek} nextGameweek={nextGameweek} notice={notice} onChanged={onChanged}/>} {active==="results"&&<ResultsAdmin gameweek={gameweek} fixtures={fixtures} predictions={predictions} notice={notice} onChanged={onChanged}/>} {active==="gameweek"&&<GameweekAdmin gameweek={gameweek} notice={notice} onChanged={onChanged}/>} {active==="seasons"&&<SeasonsAdmin notice={notice} onChanged={onChanged}/>}</div></section>}

function UsersAdmin({notice}:{notice:(m:string)=>void}){const [users,setUsers]=useState<any[]>([]);const [loading,setLoading]=useState(true);async function load(){const r=await fetch("/api/admin/users",{headers:{authorization:`Bearer ${await token()}`}});const j=await r.json();if(r.ok)setUsers(j.users??[]);else notice(j.error);setLoading(false)}useEffect(()=>{load()},[]);async function save(u:any){const r=await fetch("/api/admin/users",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({id:u.id,username:u.username,displayName:u.display_name,role:u.role,active:u.active,password:u.password})});const j=await r.json();notice(r.ok?`${u.username} saved`:j.error)}if(loading)return <div>Loading users…</div>;return <div><p className={styles.notice}>Passwords and access controls remain Ultimate Admin only. <Help text="Use Generate to make a simple replacement password, Save to apply it, and Copy to send the login privately."/></p>{users.map((u:any)=><div className={styles.row} key={u.id}><input value={u.display_name} disabled={u.slot_number===1} onChange={e=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,display_name:e.target.value}:x))}/><input value={u.password} onChange={e=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,password:e.target.value}:x))}/><select value={u.role} disabled={u.slot_number===1} onChange={e=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,role:e.target.value}:x))}><option value="member">Member</option><option value="admin">League Admin</option>{u.slot_number===1&&<option value="ultimate_admin">Ultimate Admin</option>}</select><div className={styles.buttonRow}><button className={styles.button} onClick={()=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,password:`bounce${u.slot_number}${Math.floor(10+Math.random()*90)}`}:x))}>Generate</button><button className={styles.button} onClick={()=>navigator.clipboard.writeText(`${u.display_name}\nUsername: ${u.username}\nPassword: ${u.password}`).then(()=>notice("Login details copied"))}>Copy</button><button className={styles.primary} onClick={()=>save(u)}>Save</button></div></div>)}</div>}

function SelectionsAdmin({gameweek,profiles,fixtures,predictions,adjustments,notice,onChanged}:{gameweek:Gameweek|null;profiles:Profile[];fixtures:Fixture[];predictions:Prediction[];adjustments:ScoreAdjustment[];notice:(m:string)=>void;onChanged:()=>void}){const active=useMemo(()=>profiles.filter(p=>p.active).sort((a,b)=>(a.slot_number??99)-(b.slot_number??99)),[profiles]);const current=useMemo(()=>predictions.filter(p=>p.gameweek_id===gameweek?.id),[predictions,gameweek?.id]);const [draft,setDraft]=useState<Record<string,string>>({});const [search,setSearch]=useState("");const [busy,setBusy]=useState(false);useEffect(()=>{setDraft(Object.fromEntries(active.map(p=>[p.id,current.find(x=>x.member_id===p.id)?.fixture_id??""])))},[active,current]);const q=search.toLowerCase();const available=[...fixtures].filter(f=>!q||`${f.home_team} ${f.away_team} ${f.country} ${competitionDisplayName(f)}`.toLowerCase().includes(q)).sort(fixtureSort);const changed=active.filter(p=>(draft[p.id]??"")!==(current.find(x=>x.member_id===p.id)?.fixture_id??""));async function saveAll(){if(!gameweek||!changed.length)return;const owners=new Map<string,string>();for(const [memberId,fixtureId] of Object.entries(draft) as Array<[string,string]>){if(!fixtureId)continue;const owner=owners.get(fixtureId);if(owner&&owner!==memberId){const f=fixtures.find(x=>x.id===fixtureId);return notice(`${f?`${f.home_team} v ${f.away_team}`:"A fixture"} has been selected for more than one player.`)}owners.set(fixtureId,memberId)}setBusy(true);try{for(const p of changed){const old=current.find(x=>x.member_id===p.id);if(old){const d=await fetch("/api/admin/predictions",{method:"DELETE",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({gameweekId:gameweek.id,memberId:p.id})});if(!d.ok)throw new Error((await d.json()).error??"Could not remove selection")}const fixtureId=draft[p.id];if(fixtureId){const r=await fetch("/api/admin/predictions",{method:"PUT",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({gameweekId:gameweek.id,memberId:p.id,fixtureId})});if(!r.ok)throw new Error((await r.json()).error??"Could not save selection")}}notice(`${changed.length} selection change${changed.length===1?"":"s"} saved`);onChanged()}catch(e){notice(e instanceof Error?e.message:"Could not save selections")}finally{setBusy(false)}}if(!gameweek)return <div>Create a gameweek first.</div>;return <div><p className={styles.notice}>Enter multiple selections, then press Save all once. Unsaved values are held locally and are not reset by the 45-second live-score refresh. <Help text="A fixture can belong to only one player. Taken fixtures are disabled; duplicate validation is rechecked before saving."/></p><input className={styles.search} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search team or competition…"/>{active.map(p=><div className={styles.row} key={p.id}><strong>{p.slot_number}. {p.display_name}</strong><select value={draft[p.id]??""} disabled={busy} onChange={e=>setDraft(d=>({...d,[p.id]:e.target.value}))}><option value="">No selection</option>{available.map(f=>{const takenBy=active.find(other=>other.id!==p.id&&draft[other.id]===f.id);return <option key={f.id} value={f.id} disabled={!!takenBy}>{competitionDisplayName(f)} · {f.home_team} v {f.away_team}{f.odds_fractional?` · ${f.odds_fractional}`:""}{takenBy?` · TAKEN BY ${takenBy.display_name}`:""}</option>})}</select><span>{changed.some(x=>x.id===p.id)?"Unsaved":"Saved"}</span><span/></div>)}<div className={styles.buttonRow}><button className={styles.button} disabled={busy||!changed.length} onClick={()=>setDraft(Object.fromEntries(active.map(p=>[p.id,current.find(x=>x.member_id===p.id)?.fixture_id??""])))}>Discard changes</button><button className={styles.primary} disabled={busy||!changed.length} onClick={saveAll}>{busy?"Saving…":`Save all selections (${changed.length})`}</button></div><PointsAdjustment gameweek={gameweek} profiles={active} adjustments={adjustments} notice={notice} onChanged={onChanged}/></div>}

function PointsAdjustment({gameweek,profiles,adjustments,notice,onChanged}:{gameweek:Gameweek;profiles:Profile[];adjustments:ScoreAdjustment[];notice:(m:string)=>void;onChanged:()=>void}){const [memberId,setMemberId]=useState(profiles[0]?.id??"");const existing=adjustments.find(a=>a.gameweek_id===gameweek.id&&a.member_id===memberId);const [points,setPoints]=useState("-1");const [reason,setReason]=useState("Missed selection");useEffect(()=>{setPoints(String(existing?.points??-1));setReason(existing?.reason??"Missed selection")},[existing?.id]);async function save(){const r=await fetch("/api/admin/adjustments",{method:"PUT",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({gameweekId:gameweek.id,memberId,points:Number(points),reason})});const j=await r.json();notice(r.ok?"Points adjustment saved":j.error);if(r.ok)onChanged()}return <div style={{marginTop:20}}><h3>Missed-selection / manual points <Help text="Use only for a missed deadline or a deliberate manual correction. Normal match scoring comes from the saved fixture result."/></h3><div className={styles.formGrid}><label className={styles.field}>Player<select value={memberId} onChange={e=>setMemberId(e.target.value)}>{profiles.map(p=><option value={p.id} key={p.id}>{p.display_name}</option>)}</select></label><label className={styles.field}>Points<input type="number" step="1" value={points} onChange={e=>setPoints(e.target.value)}/></label><label className={styles.field}>Reason<input value={reason} onChange={e=>setReason(e.target.value)}/></label></div><button className={styles.primary} onClick={save}>Save adjustment</button></div>}

function FixturesAdmin({gameweek,nextGameweek,notice,onChanged}:{gameweek:Gameweek|null;nextGameweek:Gameweek|null;notice:(m:string)=>void;onChanged:()=>void}){const [busy,setBusy]=useState("");const [form,setForm]=useState({competition:"Scottish Premiership",country:"Scotland",homeTeam:"",awayTeam:"",kickoffLocal:"",oddsFractional:""});async function sync(gw:Gameweek|null,mode:"results"|"full"){if(!gw)return;setBusy(mode);const r=await fetch("/api/admin/provider-sync",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({gameweekIds:[gw.id],mode})});const j=await r.json();notice(r.ok?(mode==="results"?`Results refresh complete · ${j.fixturesUpdated??0} updated`:`Full refresh complete · ${j.fixturesAdded??0} added, ${j.fixturesUpdated??0} updated, ${j.oddsUpdated??0} odds`):j.error);setBusy("");if(r.ok)onChanged()}async function add(e:FormEvent){e.preventDefault();if(!gameweek)return;const r=await fetch("/api/admin/fixtures",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({...form,kickoffAt:new Date(form.kickoffLocal).toISOString(),gameweekId:gameweek.id})});const j=await r.json();notice(r.ok?"Fixture added":j.error);if(r.ok)onChanged()}return <div><div className={styles.notice}><strong>Update controls</strong><br/>Quick results refresh asks the live provider-sync route for results mode, while Full fixture & odds refresh performs the full catalogue update. The request is backward-compatible with the existing live route. <Help text="Use Quick during match time. Use Full when you need new fixtures, kickoff changes or refreshed BTTS odds."/></div><div className={styles.buttonRow} style={{margin:"12px 0"}}><button className={styles.primary} disabled={!gameweek||!!busy} onClick={()=>sync(gameweek,"results")}>{busy==="results"?"Refreshing results…":"Quick results refresh"}</button><button className={styles.button} disabled={!gameweek||!!busy} onClick={()=>sync(gameweek,"full")}>{busy==="full"?"Refreshing fixtures & odds…":"Full fixture & odds refresh"}</button>{nextGameweek&&<button className={styles.button} disabled={!!busy} onClick={()=>sync(nextGameweek,"full")}>Full refresh next GW {nextGameweek.number}</button>}</div><form onSubmit={add}><h3>Manual fixture entry</h3><div className={styles.formGrid}><label className={styles.field}>Competition<input value={form.competition} onChange={e=>setForm({...form,competition:e.target.value})}/></label><label className={styles.field}>Country<input value={form.country} onChange={e=>setForm({...form,country:e.target.value})}/></label><label className={styles.field}>Home team<input required value={form.homeTeam} onChange={e=>setForm({...form,homeTeam:e.target.value})}/></label><label className={styles.field}>Away team<input required value={form.awayTeam} onChange={e=>setForm({...form,awayTeam:e.target.value})}/></label><label className={styles.field}>Kickoff <Help text="Local UK date/time for this fixture."/><input type="datetime-local" required value={form.kickoffLocal} onChange={e=>setForm({...form,kickoffLocal:e.target.value})}/></label><label className={styles.field}>BTTS fractional odds <Help text="Optional manual odds such as 8/11. The full provider refresh can replace this when provider odds exist."/><input value={form.oddsFractional} onChange={e=>setForm({...form,oddsFractional:e.target.value})}/></label></div><button className={styles.primary}>Add fixture manually</button></form></div>}

function ResultsAdmin({gameweek,fixtures,predictions,notice,onChanged}:{gameweek:Gameweek|null;fixtures:Fixture[];predictions:Prediction[];notice:(m:string)=>void;onChanged:()=>void}){const [scores,setScores]=useState<Record<string,{home:string;away:string}>>(()=>Object.fromEntries(fixtures.map(f=>[f.id,{home:f.home_score?.toString()??"",away:f.away_score?.toString()??""}])));useEffect(()=>{setScores(Object.fromEntries(fixtures.map(f=>[f.id,{home:f.home_score?.toString()??"",away:f.away_score?.toString()??""}])))},[fixtures]);const [busy,setBusy]=useState(false);async function save(f:Fixture,silent=false){const row=scores[f.id];if(!row||row.home===""||row.away==="")return false;const r=await fetch("/api/admin/results",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({fixtureId:f.id,homeScore:Number(row.home),awayScore:Number(row.away)})});const j=await r.json();if(!silent)notice(r.ok?"Result and points saved":j.error);return r.ok}async function recalc(){const selectedFinished=fixtures.filter(f=>predictions.some(p=>p.fixture_id===f.id)&&finishedStatuses.includes(f.status)&&f.home_score!=null&&f.away_score!=null);if(!selectedFinished.length)return notice("No finished selected fixtures to recalculate.");if(!window.confirm(`Recalculate points for ${selectedFinished.length} finished selected match${selectedFinished.length===1?"":"es"}?`))return;setBusy(true);let ok=0;for(const f of selectedFinished){if(await save(f,true))ok++}setBusy(false);notice(`Recalculated ${ok}/${selectedFinished.length} finished selected matches`);onChanged()}return <div><div className={styles.buttonRow}><button className={styles.primary} disabled={busy} onClick={recalc}>{busy?"Recalculating…":"Recalculate Gameweek Points"}</button><Help text="Repairs scoring by re-saving each finished selected fixture through the same live result endpoint used by manual FT entry."/></div>{fixtures.sort(fixtureSort).map(f=>{const pred=predictions.find(p=>p.fixture_id===f.id);const warning=finishedStatuses.includes(f.status)&&pred&&pred.points_awarded==null;return <div className={styles.row} key={f.id}><span><small>{competitionDisplayName(f)}</small><br/><strong>{f.home_team} v {f.away_team}</strong>{warning&&<><br/><small className={styles.error}>Finished selected fixture has no awarded points</small></>}</span><input type="number" min="0" value={scores[f.id]?.home??""} onChange={e=>setScores(s=>({...s,[f.id]:{...s[f.id],home:e.target.value}}))}/><input type="number" min="0" value={scores[f.id]?.away??""} onChange={e=>setScores(s=>({...s,[f.id]:{...s[f.id],away:e.target.value}}))}/><button className={styles.button} onClick={async()=>{if(await save(f)){onChanged()}}}>Save FT</button></div>})}</div>}

function GameweekAdmin({gameweek,notice,onChanged}:{gameweek:Gameweek|null;notice:(m:string)=>void;onChanged:()=>void}){const [status,setStatus]=useState(gameweek?.status??"open");const [deadline,setDeadline]=useState(gameweek?new Date(gameweek.locks_at).toISOString().slice(0,16):"");useEffect(()=>{setStatus(gameweek?.status??"open");setDeadline(gameweek?new Date(gameweek.locks_at).toISOString().slice(0,16):"")},[gameweek?.id]);async function save(){if(!gameweek)return;const r=await fetch("/api/admin/gameweek",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({id:gameweek.id,status,locksAt:new Date(deadline).toISOString()})});const j=await r.json();notice(r.ok?"Gameweek updated":j.error);if(r.ok)onChanged()}return <div><div className={styles.formGrid}><label className={styles.field}>Status <Help text="Open accepts normal member picks; Locked closes them; Complete marks the gameweek finished."/><select value={status} onChange={e=>setStatus(e.target.value as any)}><option value="open">Open</option><option value="locked">Locked</option><option value="complete">Complete</option></select></label><label className={styles.field}>Deadline <Help text="Normal league deadline is Friday at 17:00 UK time unless you deliberately change it."/><input type="datetime-local" value={deadline} onChange={e=>setDeadline(e.target.value)}/></label></div><button className={styles.primary} onClick={save}>Save current gameweek</button></div>}
function SeasonsAdmin({notice,onChanged}:{notice:(m:string)=>void;onChanged:()=>void}){const [label,setLabel]=useState("");const [gameweeks,setGameweeks]=useState("38");async function create(){if(!label.trim())return;const r=await fetch("/api/admin/seasons",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({label:label.trim(),gameweeks:Number(gameweeks)})});const j=await r.json();notice(r.ok?`Season ${label} created`:j.error);if(r.ok)onChanged()}return <div><div className={styles.formGrid}><label className={styles.field}>Season name <Help text="Use the season label, for example 2027/28. The app header and archive use this value."/><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="2027/28"/></label><label className={styles.field}>Planned gameweeks<input type="number" min="1" max="60" value={gameweeks} onChange={e=>setGameweeks(e.target.value)}/></label></div><button className={styles.primary} onClick={create}>Create New Season</button></div>}

function AlertsPage({notice,onCount}:{notice:(m:string)=>void;onCount:(n:number)=>void}){const [alerts,setAlerts]=useState<any[]>([]);const [runs,setRuns]=useState<any[]>([]);const [loading,setLoading]=useState(true);async function load(){setLoading(true);const auth=await token();const [a,r]=await Promise.all([fetch("/api/admin/alerts",{headers:{authorization:`Bearer ${auth}`}}),fetch("/api/admin/provider-sync",{headers:{authorization:`Bearer ${auth}`}})]);const aj=await a.json();const rj=await r.json();if(a.ok){setAlerts(aj.alerts??[]);onCount((aj.alerts??[]).filter((x:any)=>!x.resolved).length)}else notice(aj.error);if(r.ok)setRuns(rj.runs??[]);setLoading(false)}useEffect(()=>{load()},[]);async function resolve(id:string,resolved=true){const r=await fetch("/api/admin/alerts",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({id,resolved})});if(!r.ok)notice((await r.json()).error);return r.ok}async function bulk(rows:any[],label:string){if(!rows.length)return;if(!window.confirm(`${label}? This will affect ${rows.length} alert${rows.length===1?"":"s"}.`))return;let ok=0;for(const a of rows){if(await resolve(a.id,true))ok++}notice(`${ok} alert${ok===1?"":"s"} cleared`);load()}const unresolved=alerts.filter(a=>!a.resolved);return <section><Heading eyebrow="ADMIN NOTIFICATIONS" title="Alerts"><p>Fixture changes and provider update status.</p></Heading><div className={styles.panel}><div className={styles.buttonRow}><button className={styles.button} onClick={()=>bulk(unresolved,"Clear all visible unresolved alerts")}>Clear all alerts</button></div>{runs[0]&&<p className={styles.notice}>Last provider run: {new Date(runs[0].started_at).toLocaleString("en-GB")} · {String(runs[0].status).toUpperCase()} · {runs[0].requests_used} requests</p>}{loading?<div>Loading alerts…</div>:alerts.length?alerts.map(a=><div className={`${styles.alert} ${a.resolved?styles.resolved:""}`} key={a.id}><div><small>{String(a.severity).toUpperCase()} · {new Date(a.created_at).toLocaleString("en-GB")}</small><strong style={{display:"block"}}>{a.title}</strong><p>{a.message}</p></div><div className={styles.buttonRow}><button className={styles.button} onClick={async()=>{if(await resolve(a.id,!a.resolved))load()}}>{a.resolved?"Reopen":"Clear this alert"}</button>{!a.resolved&&<button className={styles.button} onClick={()=>bulk(unresolved.filter(x=>x.title===a.title),`Clear all alerts of type “${a.title}”`)}>Clear this type</button>}</div></div>):<div>No alerts.</div>}</div></section>}
