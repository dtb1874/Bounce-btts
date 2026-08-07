"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { combinedFractional } from "@/lib/fractional";

type View = "dashboard" | "pick" | "fixtures" | "table" | "results" | "players" | "admin";
type AdminView = "users" | "fixtures" | "results" | "gameweek";

type Profile = {
  id: string;
  username: string;
  display_name: string;
  role: "admin" | "member";
  active: boolean;
  slot_number: number | null;
};

type Gameweek = {
  id: string;
  number: number;
  status: "open" | "locked" | "complete";
  opens_at: string | null;
  locks_at: string;
  season_id: string | null;
};

type Fixture = {
  id: string;
  gameweek_id: string | null;
  competition: string;
  country: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  odds_fractional: string | null;
  odds_checked_at: string | null;
  source: string;
};

type Prediction = {
  id: string;
  gameweek_id: string;
  member_id: string;
  fixture_id: string;
  points_awarded: number | null;
  created_at: string;
  updated_at: string;
};

type UserAdminRow = Profile & { approved: boolean; password: string };

const navItems: { id: View; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "⌂" },
  { id: "pick", label: "My Pick", icon: "⚑" },
  { id: "fixtures", label: "Fixtures", icon: "▦" },
  { id: "table", label: "League Table", icon: "☷" },
  { id: "results", label: "Results", icon: "✦" },
  { id: "players", label: "Players", icon: "◉" },
  { id: "admin", label: "Admin", icon: "⚙" },
];

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function formatKickoff(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function inputDateTime(value: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

async function token() {
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token ?? "";
}

export default function LeagueApp({
  initialProfile,
  initialProfiles,
  initialGameweek,
  initialFixtures,
  initialPredictions,
  seasonLabel,
  entryFee,
}: {
  initialProfile: Profile;
  initialProfiles: Profile[];
  initialGameweek: Gameweek | null;
  initialFixtures: Fixture[];
  initialPredictions: Prediction[];
  seasonLabel: string;
  entryFee: number;
}) {
  const [view, setView] = useState<View>("dashboard");
  const [adminView, setAdminView] = useState<AdminView>("users");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [fixtures, setFixtures] = useState(initialFixtures);
  const [predictions, setPredictions] = useState(initialPredictions);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const profiles = initialProfiles.filter((profile) => profile.active);
  const gameweek = initialGameweek;

  const predictionByFixture = useMemo(() => new Map(predictions.map((prediction) => [prediction.fixture_id, prediction])), [predictions]);
  const currentPrediction = gameweek ? predictions.find((prediction) => prediction.gameweek_id === gameweek.id && prediction.member_id === initialProfile.id) : undefined;
  const currentFixture = currentPrediction ? fixtures.find((fixture) => fixture.id === currentPrediction.fixture_id) : undefined;
  const submitted = gameweek ? predictions.filter((prediction) => prediction.gameweek_id === gameweek.id).length : 0;
  const isOpen = Boolean(gameweek && gameweek.status === "open" && new Date(gameweek.locks_at) > new Date());
  const competitions = useMemo(() => Array.from(new Set(fixtures.map((fixture) => fixture.competition))), [fixtures]);

  const standings = useMemo(() => {
    const map = new Map(profiles.map((profile) => [profile.id, {
      id: profile.id, name: profile.display_name, played: 0, wins: 0, zeroZeroCount: 0, oneSided: 0, points: 0,
    }]));
    for (const prediction of predictions) {
      if (prediction.points_awarded === null) continue;
      const row = map.get(prediction.member_id);
      if (!row) continue;
      row.played += 1;
      row.points += prediction.points_awarded;
      if (prediction.points_awarded === 3) row.wins += 1;
      if (prediction.points_awarded === 1) row.oneSided += 1;
      if (prediction.points_awarded === -1) row.zeroZeroCount += 1;
    }
    return Array.from(map.values()).sort((a, b) =>
      b.points - a.points || a.zeroZeroCount - b.zeroZeroCount || b.wins - a.wins || a.name.localeCompare(b.name)
    );
  }, [profiles, predictions]);

  function notice(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  async function selectFixture(fixtureId: string) {
    if (!gameweek || !isOpen || busy) return;
    const taken = predictions.find((prediction) => prediction.gameweek_id === gameweek.id && prediction.fixture_id === fixtureId && prediction.member_id !== initialProfile.id);
    if (taken) return notice("That fixture has already been selected.");
    setBusy(true);
    const supabase = createClient();
    let error: { message: string } | null = null;
    if (currentPrediction) {
      const response = await supabase.from("predictions").update({ fixture_id: fixtureId, updated_at: new Date().toISOString() }).eq("id", currentPrediction.id);
      error = response.error;
    } else {
      const response = await supabase.from("predictions").insert({ gameweek_id: gameweek.id, member_id: initialProfile.id, fixture_id: fixtureId }).select().single();
      error = response.error;
      if (!error && response.data) setPredictions((current) => [...current, response.data as Prediction]);
    }
    if (error) notice(error.message.includes("duplicate") ? "That fixture has just been taken by another player." : error.message);
    else {
      if (currentPrediction) setPredictions((current) => current.map((prediction) => prediction.id === currentPrediction.id ? { ...prediction, fixture_id: fixtureId } : prediction));
      notice("Pick saved ✓");
    }
    setBusy(false);
  }

  async function sharePicks() {
    if (!gameweek) return;
    const selected = predictions.filter((prediction) => prediction.gameweek_id === gameweek.id);
    const grouped = new Map<string, Array<{ fixture: Fixture; player: string }>>();
    for (const prediction of selected) {
      const fixture = fixtures.find((item) => item.id === prediction.fixture_id);
      const player = profiles.find((item) => item.id === prediction.member_id)?.display_name;
      if (!fixture || !player) continue;
      grouped.set(fixture.competition, [...(grouped.get(fixture.competition) ?? []), { fixture, player }]);
    }
    const lines = [`BOUNCE BTTS LEAGUE — GW${gameweek.number}`, `Season ${seasonLabel}`, ""];
    for (const [competition, picks] of grouped) {
      lines.push(competition.toUpperCase());
      for (const pick of picks) lines.push(`${pick.fixture.home_team} v ${pick.fixture.away_team} — ${pick.player} — ${pick.fixture.odds_fractional ?? "Odds unavailable"}`);
      lines.push("");
    }
    lines.push(`Combined odds: ${combinedFractional(selected.map((prediction) => fixtures.find((fixture) => fixture.id === prediction.fixture_id)?.odds_fractional))}`);
    lines.push("Odds may change after the daily check.");
    const text = lines.join("\n");
    if (navigator.share) await navigator.share({ title: `Bounce BTTS GW${gameweek.number}`, text, url: `${window.location.origin}/table` });
    else { await navigator.clipboard.writeText(text); notice("Picks copied for WhatsApp"); }
  }

  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = "/login";
  }

  if (!initialProfile.active) {
    return <main className="authPage"><section className="authCard"><h1>Account inactive</h1><p className="authIntro">Ask an admin to activate this user slot for the current season.</p><button className="primaryButton" onClick={signOut}>Sign out</button></section></main>;
  }

  return (
    <main className="appShell">
      <button className="mobileMenuButton" onClick={() => setMobileMenu(true)}>☰</button>
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <button className="closeMenu" onClick={() => setMobileMenu(false)}>×</button>
        <div className="sideBrand">
          <img className="brandCrest" src="/assets/hearts-crest.png" alt="Heart of Midlothian crest" />
          <div><strong>BOUNCE</strong><span>BTTS LEAGUE</span><small>EST 2024</small></div>
        </div>
        <nav>
          {navItems.filter((item) => item.id !== "admin" || initialProfile.role === "admin").map((item) => (
            <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => { setView(item.id); setMobileMenu(false); }}><span>{item.icon}</span>{item.label}</button>
          ))}
        </nav>
        <div className="sidebarWatermark" aria-hidden="true"><img src="/assets/st-giles-round.jpg" alt="" /></div>
        <button className="profileCard" onClick={signOut} title="Sign out">
          <span>{initials(initialProfile.display_name)}</span>
          <div><strong>{initialProfile.display_name}</strong><small>{initialProfile.role === "admin" ? "Administrator" : initialProfile.username}</small></div><b>↪</b>
        </button>
      </aside>
      {mobileMenu && <button className="menuScrim" onClick={() => setMobileMenu(false)} aria-label="Close menu" />}

      <section className="mainArea">
        <header className="heroHeader">
          <div className="heroBackdrop" aria-hidden="true"><div className="skylineLayer"/><div className="mosaicLayer"/></div>
          <div className="heroText"><h1>BOUNCE</h1><h2>— BTTS LEAGUE —</h2><div className="heroRule"><span>♥</span></div><p>EDINBURGH · HEART OF MIDLOTHIAN · EST 2024</p></div>
          <div className="gameweekCard"><span>Season {seasonLabel}</span><div><strong>{gameweek ? `GW ${gameweek.number}` : "NO GW"}</strong></div><small>{gameweek ? `${gameweek.status.toUpperCase()} · Locks ${formatKickoff(gameweek.locks_at)}` : "Create a gameweek"}</small></div>
        </header>

        {view === "dashboard" && <Dashboard gameweek={gameweek} currentFixture={currentFixture} fixtures={fixtures} profiles={profiles} predictions={predictions} standings={standings} submitted={submitted} entryFee={entryFee} setView={setView} selectFixture={selectFixture} sharePicks={sharePicks} isOpen={isOpen} />}
        {(view === "pick" || view === "fixtures") && <FixturesPage fixtures={fixtures} predictions={predictions} profiles={profiles} gameweek={gameweek} myId={initialProfile.id} isOpen={isOpen} selectFixture={selectFixture} competitions={competitions} sharePicks={sharePicks} />}
        {view === "table" && <LeagueTable standings={standings} seasonLabel={seasonLabel} />}
        {view === "results" && <Results fixtures={fixtures} predictions={predictions} profiles={profiles} />}
        {view === "players" && <Players profiles={profiles} predictions={predictions} fixtures={fixtures} gameweek={gameweek} />}
        {view === "admin" && initialProfile.role === "admin" && <AdminPanel active={adminView} setActive={setAdminView} gameweek={gameweek} fixtures={fixtures} onChanged={() => window.location.reload()} notice={notice} />}

        <footer className="siteFooter"><span>♡</span><strong>MADE BY THE ARTIST, FOR THE BOUNCE</strong></footer>
      </section>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function Dashboard({ gameweek, currentFixture, fixtures, profiles, predictions, standings, submitted, entryFee, setView, selectFixture, sharePicks, isOpen }: any) {
  const recent = fixtures.filter((fixture: Fixture) => ["FT", "AET", "PEN"].includes(fixture.status));
  return <div className="dashboardGrid">
    <section className="contentColumn">
      <article className="panel currentPickPanel brandedPanel"><div className="panelTitle">YOUR PICK — {gameweek ? `GAMEWEEK ${gameweek.number}` : "NO ACTIVE GAMEWEEK"}</div>{currentFixture ? <div className="pickDisplay"><img className="pickBrandCrest" src="/assets/hearts-crest.png" alt=""/><div className="teamBadge">{initials(currentFixture.home_team)}</div><strong>{currentFixture.home_team}</strong><span className="versus">V</span><strong>{currentFixture.away_team}</strong><div className="teamBadge away">{initials(currentFixture.away_team)}</div><div className="pickSubmitted">✓ PICK SUBMITTED</div><small>{formatKickoff(currentFixture.kickoff_at)} · BTTS {currentFixture.odds_fractional ?? "Odds unavailable"}</small></div> : <button className="emptySelection" onClick={() => setView("fixtures")}>{isOpen ? "Choose your Saturday 3pm BTTS fixture" : "Selections are currently closed"}</button>}<div className="pickNotice">ⓘ One unique fixture per player. Picks can be changed until the gameweek deadline.</div></article>
      <article className="panel fixturesPanel brandedPanel mosaicPanel"><div className="panelTitle rowTitle"><span>UPCOMING FIXTURES</span><button onClick={() => setView("fixtures")}>View all →</button></div><div className="fixtureRows">{fixtures.slice(0,5).map((fixture: Fixture) => { const prediction = predictions.find((p: Prediction) => p.fixture_id === fixture.id && p.gameweek_id === gameweek?.id); const player = profiles.find((p: Profile) => p.id === prediction?.member_id); return <div className="dashboardFixture" key={fixture.id}><div className="fixtureDate"><strong>{formatKickoff(fixture.kickoff_at).split(",")[0]}</strong><span>15:00</span></div><div className="fixtureTeams"><strong>{fixture.home_team}</strong><span className="miniBadge">{initials(fixture.home_team)}</span><b>v</b><span className="miniBadge">{initials(fixture.away_team)}</span><strong>{fixture.away_team}</strong></div><div className="fixtureOdds"><span>BTTS</span><strong>{fixture.odds_fractional ?? "—"}</strong></div><button disabled={Boolean(player)} onClick={() => selectFixture(fixture.id)}>{player ? `Taken · ${player.display_name}` : "Select"}</button></div>})}{!fixtures.length && <div className="emptyState">No fixtures yet. An admin can add them under Admin → Fixtures.</div>}</div></article>
    </section>
    <aside className="rightColumn">
      <article className="panel statusPanel brandedPanel"><div className="panelTitle">GAMEWEEK STATUS</div><div className="statusNumbers"><strong>{submitted}</strong><span>of {profiles.length} picks submitted</span></div><div className="progressTrack"><i style={{width:`${profiles.length ? submitted/profiles.length*100 : 0}%`}}/></div><small>Prize pot: £{(profiles.length * entryFee).toFixed(0)}</small></article>
      <article className="panel tablePanel brandedPanel"><div className="panelTitle">LEAGUE TABLE</div><div className="miniTable"><div className="miniTableRow header"><span>POS</span><span>PLAYER</span><span>W</span><span>0-0</span><span>PTS</span></div>{standings.slice(0,8).map((row: any,index:number)=><div className={`miniTableRow ${index===0?"leader":""}`} key={row.id}><span>{index+1}</span><strong>{row.name}</strong><span>{row.wins}</span><span>{row.zeroZeroCount}</span><b>{row.points}</b></div>)}</div><button className="panelFooterButton" onClick={() => setView("table")}>View full table →</button></article>
      <article className="panel resultsPanel brandedPanel"><div className="panelTitle">LATEST RESULTS</div>{recent.slice(0,5).map((fixture: Fixture)=><div className="resultRow" key={fixture.id}><span>GW{gameweek?.number}</span><strong>{fixture.home_team}</strong><b>{fixture.home_score} - {fixture.away_score}</b><strong>{fixture.away_team}</strong><i className={(fixture.home_score??0)>0&&(fixture.away_score??0)>0?"yes":"no"}>{(fixture.home_score??0)>0&&(fixture.away_score??0)>0?"✓":"–"}</i></div>)}{!recent.length&&<div className="emptyState compact">No completed results yet.</div>}</article>
      <button className="shareCard" onClick={sharePicks}><span>↗</span><div><strong>Share weekly picks</strong><small>League-sorted · fractional odds · WhatsApp ready</small></div></button>
    </aside>
  </div>;
}

function FixturesPage({ fixtures, predictions, profiles, gameweek, myId, isOpen, selectFixture, competitions, sharePicks }: any) {
  return <section className="pagePanel panel brandedPanel"><div className="pageHeading"><div><span>{gameweek ? `GAMEWEEK ${gameweek.number}` : "NO GAMEWEEK"}</span><h2>Eligible Fixtures</h2><p>UK Saturday 3pm fixtures only. Hearts and Hibs matches are excluded.</p></div><button onClick={sharePicks}>Share picks</button></div>{competitions.map((competition:string)=><div className="competitionSection" key={competition}><h3>{competition}</h3>{fixtures.filter((f:Fixture)=>f.competition===competition).map((fixture:Fixture)=>{const prediction=predictions.find((p:Prediction)=>p.fixture_id===fixture.id&&p.gameweek_id===gameweek?.id);const player=profiles.find((p:Profile)=>p.id===prediction?.member_id);return <div className="fullFixture" key={fixture.id}><div><span>{formatKickoff(fixture.kickoff_at).split(",")[0]}</span><strong>15:00</strong></div><div className="fullTeams"><strong>{fixture.home_team}</strong><b>v</b><strong>{fixture.away_team}</strong></div><div className="fullOdds"><span>BTTS</span><strong>{fixture.odds_fractional??"—"}</strong></div><button disabled={!isOpen||Boolean(player&&player.id!==myId)} onClick={()=>selectFixture(fixture.id)}>{player?.id===myId?"Picked ✓":player?`Taken by ${player.display_name}`:isOpen?"Select":"Closed"}</button></div>})}</div>)}{!fixtures.length&&<div className="emptyState">No fixtures have been added yet.</div>}</section>;
}

function LeagueTable({ standings, seasonLabel }: any) {
  return <section className="pagePanel panel brandedPanel"><div className="pageHeading"><div><span>SEASON {seasonLabel} · EST 2024</span><h2>League Table</h2><p>Ties: fewest 0–0s, most BTTS wins, then alphabetical.</p></div><a href="/table" target="_blank">Public table ↗</a></div><div className="largeTable"><div className="largeTableRow header"><span>POS</span><span>PLAYER</span><span>P</span><span>W</span><span>0-0</span><span>PTS</span></div>{standings.map((row:any,index:number)=><div className={`largeTableRow ${index===0?"leader":""}`} key={row.id}><span>{index+1}</span><strong>{row.name}</strong><span>{row.played}</span><span>{row.wins}</span><span>{row.zeroZeroCount}</span><b>{row.points}</b></div>)}</div></section>;
}

function Results({ fixtures, predictions, profiles }: any) {
  const completed=fixtures.filter((fixture:Fixture)=>["FT","AET","PEN"].includes(fixture.status));
  return <section className="pagePanel panel brandedPanel"><div className="pageHeading"><div><span>COMPLETED FIXTURES</span><h2>Results</h2></div></div>{completed.map((fixture:Fixture)=>{const prediction=predictions.find((p:Prediction)=>p.fixture_id===fixture.id);const player=profiles.find((p:Profile)=>p.id===prediction?.member_id);return <div className="largeResult" key={fixture.id}><span>{player?.display_name??"Unselected"}</span><strong>{fixture.home_team}</strong><b>{fixture.home_score} - {fixture.away_score}</b><strong>{fixture.away_team}</strong><i className={prediction?.points_awarded===3?"yes":"no"}>{prediction?.points_awarded==null?"—":`${prediction.points_awarded>0?"+":""}${prediction.points_awarded} PTS`}</i></div>})}{!completed.length&&<div className="emptyState">No completed results yet.</div>}</section>;
}

function Players({ profiles, predictions, fixtures, gameweek }: any) {
  return <section className="pagePanel panel brandedPanel"><div className="pageHeading"><div><span>LEAGUE MEMBERS</span><h2>Players</h2><p>{predictions.filter((p:Prediction)=>p.gameweek_id===gameweek?.id).length} of {profiles.length} have submitted a pick.</p></div></div><div className="playerGrid">{profiles.map((profile:Profile)=>{const prediction=predictions.find((p:Prediction)=>p.member_id===profile.id&&p.gameweek_id===gameweek?.id);const fixture=fixtures.find((f:Fixture)=>f.id===prediction?.fixture_id);return <article key={profile.id}><span>{initials(profile.display_name)}</span><div><strong>{profile.display_name}</strong><small>{fixture?`${fixture.home_team} v ${fixture.away_team} · ${fixture.odds_fractional??"Odds unavailable"}`:"Awaiting selection"}</small></div><b className={fixture?"picked":"pending"}>{fixture?"PICKED ✓":"PENDING"}</b></article>})}</div></section>;
}

function AdminPanel({ active, setActive, gameweek, fixtures, onChanged, notice }: any) {
  return <section className="pagePanel panel brandedPanel adminPanel"><div className="pageHeading"><div><span>ADMIN CONTROL</span><h2>League Management</h2><p>Manage users, passwords, fixtures, results and gameweek settings.</p></div></div><div className="adminTabs"><button className={active==="users"?"active":""} onClick={()=>setActive("users")}>Users</button><button className={active==="fixtures"?"active":""} onClick={()=>setActive("fixtures")}>Fixtures</button><button className={active==="results"?"active":""} onClick={()=>setActive("results")}>Results</button><button className={active==="gameweek"?"active":""} onClick={()=>setActive("gameweek")}>Gameweek</button></div>{active==="users"&&<AdminUsers notice={notice}/>} {active==="fixtures"&&<AdminFixtures gameweek={gameweek} onChanged={onChanged} notice={notice}/>} {active==="results"&&<AdminResults fixtures={fixtures} onChanged={onChanged} notice={notice}/>} {active==="gameweek"&&<AdminGameweek gameweek={gameweek} onChanged={onChanged} notice={notice}/>}</section>;
}

function AdminUsers({ notice }: { notice: (message:string)=>void }) {
  const [users,setUsers]=useState<UserAdminRow[]>([]);const [loading,setLoading]=useState(true);const [saving,setSaving]=useState("");
  useEffect(()=>{void (async()=>{const response=await fetch("/api/admin/users",{headers:{authorization:`Bearer ${await token()}`}});const payload=await response.json();if(response.ok)setUsers(payload.users);else notice(payload.error);setLoading(false);})();},[]);
  function update(id:string,patch:Partial<UserAdminRow>){setUsers(current=>current.map(user=>user.id===id?{...user,...patch}:user));}
  function generate(user:UserAdminRow){update(user.id,{password:`bounce${user.slot_number}${Math.floor(10+Math.random()*90)}`});}
  async function save(user:UserAdminRow){setSaving(user.id);const response=await fetch("/api/admin/users",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({id:user.id,username:user.username,displayName:user.display_name,role:user.role,active:user.active,password:user.password})});const payload=await response.json();notice(response.ok?`${user.username} saved`:payload.error);setSaving("");}
  async function copy(user:UserAdminRow){await navigator.clipboard.writeText(`${user.display_name}\nUsername: ${user.username}\nPassword: ${user.password}`);notice("Login details copied");}
  if(loading)return <div className="emptyState">Loading users…</div>;
  return <div className="userAdminList"><div className="adminNote">Passwords are visible only to logged-in admins and can be changed at any time.</div>{users.map(user=><article className="userAdminRow" key={user.id}><div className="slotBadge">{user.slot_number}</div><label>Username<input value={user.username} disabled={user.slot_number===1} onChange={e=>update(user.id,{username:e.target.value})}/></label><label>Assigned player<input value={user.display_name} disabled={user.slot_number===1} onChange={e=>update(user.id,{display_name:e.target.value})}/></label><label>Role<select value={user.role} disabled={user.slot_number===1} onChange={e=>update(user.id,{role:e.target.value as "admin"|"member"})}><option value="member">Member</option><option value="admin">Admin</option></select></label><label>Password<input value={user.password} onChange={e=>update(user.id,{password:e.target.value})}/></label><label className="activeToggle"><input type="checkbox" checked={user.active} disabled={user.slot_number===1} onChange={e=>update(user.id,{active:e.target.checked})}/> Active</label><div className="userActions"><button onClick={()=>generate(user)}>Generate</button><button onClick={()=>copy(user)}>Copy</button><button className="save" disabled={saving===user.id} onClick={()=>save(user)}>{saving===user.id?"Saving…":"Save"}</button></div></article>)}</div>;
}

function AdminFixtures({ gameweek, onChanged, notice }: any) {
  const [form,setForm]=useState({competition:"Scottish Premiership",country:"Scotland",homeTeam:"",awayTeam:"",kickoffLocal:"",oddsFractional:""});const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent){event.preventDefault();if(!gameweek)return;setBusy(true);const kickoffAt=new Date(form.kickoffLocal).toISOString();const response=await fetch("/api/admin/fixtures",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({...form,kickoffAt,gameweekId:gameweek.id})});const payload=await response.json();notice(response.ok?"Fixture added":payload.error);setBusy(false);if(response.ok)onChanged();}
  return <form className="adminForm" onSubmit={submit}><div className="adminNote">Add any eligible UK Saturday 3pm match. Hearts and Hibs fixtures are excluded. Fractional odds can be entered now or later.</div><div className="formGrid"><label>Competition<input value={form.competition} onChange={e=>setForm({...form,competition:e.target.value})}/></label><label>Country<input value={form.country} onChange={e=>setForm({...form,country:e.target.value})}/></label><label>Home team<input value={form.homeTeam} onChange={e=>setForm({...form,homeTeam:e.target.value})} required/></label><label>Away team<input value={form.awayTeam} onChange={e=>setForm({...form,awayTeam:e.target.value})} required/></label><label>Kickoff<input type="datetime-local" value={form.kickoffLocal} onChange={e=>setForm({...form,kickoffLocal:e.target.value})} required/></label><label>BTTS fractional odds<input placeholder="e.g. 8/11" value={form.oddsFractional} onChange={e=>setForm({...form,oddsFractional:e.target.value})}/></label></div><button className="primaryButton" disabled={busy||!gameweek}>{busy?"Adding…":"Add fixture"}</button></form>;
}

function AdminResults({ fixtures, onChanged, notice }: any) {
  const [scores,setScores]=useState<Record<string,{home:string;away:string}>>(()=>Object.fromEntries(fixtures.map((f:Fixture)=>[f.id,{home:f.home_score?.toString()??"",away:f.away_score?.toString()??""}])));
  async function save(fixture:Fixture){const score=scores[fixture.id];const response=await fetch("/api/admin/results",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({fixtureId:fixture.id,homeScore:Number(score?.home),awayScore:Number(score?.away)})});const payload=await response.json();notice(response.ok?"Result and points saved":payload.error);if(response.ok)onChanged();}
  return <div className="adminResults">{fixtures.map((fixture:Fixture)=><div className="adminResultRow" key={fixture.id}><div><small>{fixture.competition}</small><strong>{fixture.home_team} v {fixture.away_team}</strong></div><input type="number" min="0" value={scores[fixture.id]?.home??""} onChange={e=>setScores({...scores,[fixture.id]:{...scores[fixture.id],home:e.target.value}})}/><b>–</b><input type="number" min="0" value={scores[fixture.id]?.away??""} onChange={e=>setScores({...scores,[fixture.id]:{...scores[fixture.id],away:e.target.value}})}/><button onClick={()=>save(fixture)}>Save FT</button></div>)}{!fixtures.length&&<div className="emptyState">Add fixtures first.</div>}</div>;
}

function AdminGameweek({ gameweek, onChanged, notice }: any) {
  const [status,setStatus]=useState(gameweek?.status??"open");
  const [locksAt,setLocksAt]=useState(gameweek?inputDateTime(gameweek.locks_at):"");
  const [busy,setBusy]=useState(false);
  async function save(){if(!gameweek||!locksAt)return;setBusy(true);const response=await fetch("/api/admin/gameweek",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({id:gameweek.id,status,locksAt:new Date(locksAt).toISOString()})});const payload=await response.json();notice(response.ok?"Gameweek updated":payload.error);setBusy(false);if(response.ok)onChanged();}
  async function createNext(){if(!locksAt)return notice("Choose the next deadline first.");setBusy(true);const response=await fetch("/api/admin/gameweek",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({locksAt:new Date(locksAt).toISOString()})});const payload=await response.json();notice(response.ok?`Gameweek ${payload.gameweek.number} created`:payload.error);setBusy(false);if(response.ok)onChanged();}
  return <div className="adminForm"><div className="adminNote">Update the current gameweek, or create the next one using the deadline below.</div><div className="formGrid"><label>Status<select value={status} onChange={e=>setStatus(e.target.value)} disabled={!gameweek}><option value="open">Open</option><option value="locked">Locked</option><option value="complete">Complete</option></select></label><label>Pick deadline<input type="datetime-local" value={locksAt} onChange={e=>setLocksAt(e.target.value)}/></label></div><div className="userActions"><button className="save" disabled={busy||!gameweek} onClick={save}>{busy?"Saving…":"Save current gameweek"}</button><button disabled={busy||!locksAt} onClick={createNext}>Create next gameweek</button></div></div>;
}
