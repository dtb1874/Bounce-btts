"use client";

import { useMemo, useState } from "react";

type Tab = "home" | "fixtures" | "picks" | "table" | "admin";
type Member = { id: string; name: string; initials: string };
type Fixture = { id:string; competition:string; home:string; away:string; kickoff:string; odds?:string; selectedBy?:string };

const members: Member[] = [
  { id:"dtb", name:"DTB", initials:"DT" }, { id:"daves", name:"Dave S", initials:"DS" },
  { id:"turnsy", name:"Turnsy Fitchett", initials:"TF" }, { id:"ryan", name:"Ryan", initials:"RY" },
  { id:"davep", name:"Dave Pickup", initials:"DP" }, { id:"yacky", name:"Yacky", initials:"YA" },
  { id:"ian", name:"Ian", initials:"IA" }, { id:"kevinp", name:"Kevin Pickup", initials:"KP" }
];

const starterFixtures: Fixture[] = [
  { id:"1", competition:"SCOTTISH PREMIERSHIP", home:"Aberdeen", away:"Dundee United", kickoff:"15:00", odds:"8/13" },
  { id:"2", competition:"SCOTTISH PREMIERSHIP", home:"Motherwell", away:"Kilmarnock", kickoff:"15:00", odds:"4/6", selectedBy:"Dave S" },
  { id:"3", competition:"EFL CHAMPIONSHIP", home:"Bristol City", away:"Preston", kickoff:"15:00", odds:"7/10" },
  { id:"4", competition:"EFL LEAGUE ONE", home:"Bolton", away:"Reading", kickoff:"15:00", odds:"4/7", selectedBy:"Ryan" },
  { id:"5", competition:"EFL LEAGUE TWO", home:"Notts County", away:"Crewe", kickoff:"15:00", odds:"8/15" },
  { id:"6", competition:"NATIONAL LEAGUE NORTH", home:"Chorley", away:"Scarborough Athletic", kickoff:"15:00", odds:"4/5" },
  { id:"7", competition:"NORTHERN PREMIER LEAGUE", home:"Hyde United", away:"Guiseley", kickoff:"15:00", odds:"5/6" }
];

const leaguePriority = ["SCOTTISH PREMIERSHIP","PREMIER LEAGUE","EFL CHAMPIONSHIP","EFL LEAGUE ONE","EFL LEAGUE TWO","NATIONAL LEAGUE"];
function leagueRank(name:string) { const i=leaguePriority.findIndex(x=>name.includes(x)); return i < 0 ? 99 : i; }

export default function Home() {
  const [tab,setTab] = useState<Tab>("home");
  const [fixtures,setFixtures] = useState(starterFixtures);
  const [toast,setToast] = useState("");
  const me = members[0];
  const myFixture = fixtures.find(f=>f.selectedBy===me.name);
  const submitted = fixtures.filter(f=>f.selectedBy).length;
  const picked = useMemo(()=>fixtures.filter(f=>f.selectedBy).sort((a,b)=>leagueRank(a.competition)-leagueRank(b.competition)||a.competition.localeCompare(b.competition)),[fixtures]);

  function choose(id:string) {
    setFixtures(current=>current.map(f=>f.id===id?{...f,selectedBy:me.name}:f.selectedBy===me.name?{...f,selectedBy:undefined}:f));
    flash("Pick saved ✓");
  }
  function flash(message:string){ setToast(message); setTimeout(()=>setToast(""),1800); }
  async function sharePicks(){
    const lines:string[]=["⚽ *BOUNCE BTTS — GAMEWEEK 1*",""];
    let last="";
    picked.forEach(f=>{ if(f.competition!==last){ if(last) lines.push(""); lines.push(`*${f.competition}*`); last=f.competition; } lines.push(`${f.selectedBy} — ${f.home} v ${f.away}${f.odds?` — ${f.odds}`:""}`); });
    const pending=members.length-picked.length;
    lines.push("",`${picked.length}/${members.length} picks submitted${pending?` · ${pending} pending`:""}`,"BTTS odds shown are the latest stored daily prices and may move.");
    const text=lines.join("\n");
    if(navigator.share){ try{ await navigator.share({title:"Bounce BTTS Gameweek 1",text}); return; }catch{} }
    await navigator.clipboard.writeText(text); flash("Picks copied for WhatsApp ✓");
  }

  return <main className="app">
    <header className="topbar">
      <button className="brand" onClick={()=>setTab("home")}><b>B</b><span><strong>BOUNCE</strong><small>BTTS LEAGUE · 26/27</small></span></button>
      <div className="topActions"><span className="gw">GW 1</span><button className="avatar">{me.initials}</button></div>
    </header>
    <div className="deadline"><span><i/> PICKS OPEN</span><strong>Saturday 14:55 deadline</strong><em>UK · SAT · 3PM</em></div>

    <div className="page">
      {tab==="home" && <>
        <section className="hero"><div><span className="eyebrow">GAMEWEEK 1</span><h1>Pick one.<br/>Back the bounce.</h1><p>Choose one unique UK Saturday 3pm fixture for both teams to score.</p></div><div className="heroBadge"><small>YOUR PICK</small><strong>{myFixture?"LOCKED IN":"NOT PICKED"}</strong></div></section>
        <section className="quickGrid">
          <article><small>SUBMITTED</small><strong>{submitted}<span>/{members.length}</span></strong><p>league picks</p></article>
          <article><small>YOUR POSITION</small><strong>—</strong><p>season starts level</p></article>
          <article><small>DAILY UPDATE</small><strong>08:00</strong><p>fixtures · results · odds</p></article>
        </section>
        <section className="card pickCard"><div className="sectionHead"><div><small>YOUR SELECTION</small><h2>Gameweek pick</h2></div><button onClick={()=>setTab("fixtures")}>{myFixture?"CHANGE":"CHOOSE"}</button></div>
          {myFixture?<div className="chosen"><span>{myFixture.competition}</span><strong>{myFixture.home} <i>v</i> {myFixture.away}</strong><div><b>Saturday · 15:00</b><em>BTTS {myFixture.odds??"—"}</em></div></div>:<button className="empty" onClick={()=>setTab("fixtures")}><b>+</b><span><strong>Choose your BTTS fixture</strong><small>All eligible UK 3pm matches</small></span></button>}
        </section>
        <section className="card"><div className="sectionHead"><div><small>GAMEWEEK 1</small><h2>League picks</h2></div><button onClick={()=>setTab("picks")}>VIEW ALL</button></div>
          <div className="memberList">{members.map(m=>{const f=fixtures.find(x=>x.selectedBy===m.name);return <div className="member" key={m.id}><span className="mini">{m.initials}</span><div><strong>{m.name}</strong><small>{f?`${f.home} v ${f.away}`:"Awaiting selection"}</small></div><b className={f?"picked":"pending"}>{f?"PICKED ✓":"PENDING"}</b></div>})}</div>
        </section>
      </>}

      {tab==="fixtures" && <section className="card"><div className="sectionHead"><div><small>ALL ELIGIBLE UK MATCHES</small><h2>Saturday 3pm fixtures</h2></div><span className="count">{fixtures.filter(f=>!f.selectedBy||f.selectedBy===me.name).length} OPEN</span></div><p className="info">The daily feed can include lower non-league competitions too. If it is UK-based, 3pm Saturday and carried by the provider, it can appear here. Hearts fixtures are excluded.</p>
        {[...new Set(fixtures.map(f=>f.competition))].map(comp=><div className="competition" key={comp}><h3>{comp}</h3>{fixtures.filter(f=>f.competition===comp).map(f=>{const mine=f.selectedBy===me.name; const taken=!!f.selectedBy&&!mine;return <button disabled={taken} onClick={()=>choose(f.id)} className={`fixture ${taken?"taken":""} ${mine?"mine":""}`} key={f.id}><time>{f.kickoff}</time><span><strong>{f.home}</strong><strong>{f.away}</strong></span><em>{f.odds?`BTTS ${f.odds}`:"Odds —"}</em><b>{mine?"YOUR PICK ✓":taken?`TAKEN · ${f.selectedBy}`:"SELECT"}</b></button>})}</div>)}
      </section>}

      {tab==="picks" && <section className="card"><div className="sectionHead"><div><small>BET SLIP ORDER</small><h2>Gameweek 1 picks</h2></div><button className="share" onClick={sharePicks}>SHARE</button></div><p className="info">Grouped into league order so the accumulator is quicker to enter. Odds are stored once daily; they are indicative and may change.</p>
        {picked.length===0?<div className="blank">No picks submitted yet.</div>:[...new Set(picked.map(f=>f.competition))].map(comp=><div className="shareGroup" key={comp}><h3>{comp}</h3>{picked.filter(f=>f.competition===comp).map(f=><div className="shareRow" key={f.id}><span><b>{f.selectedBy}</b><strong>{f.home} v {f.away}</strong></span><em>BTTS<br/><b>{f.odds??"—"}</b></em></div>)}</div>)}
        <div className="shareFooter"><span>Latest daily odds</span><strong>08:00 UK</strong></div>
      </section>}

      {tab==="table" && <section className="card"><div className="sectionHead"><div><small>SEASON 2026/27</small><h2>League table</h2></div><button onClick={()=>flash("Public table link copied ✓")}>SHARE</button></div><div className="table"><div className="tr th"><span>#</span><span>PLAYER</span><span>P</span><span>W</span><span>0-0</span><span>PTS</span></div>{members.slice().sort((a,b)=>a.name.localeCompare(b.name)).map((m,i)=><div className={`tr ${m.id===me.id?"you":""}`} key={m.id}><b>{i+1}</b><span className="player"><i>{m.initials}</i><strong>{m.name}</strong></span><span>0</span><span>0</span><span>0</span><strong>0</strong></div>)}</div><p className="rule"><b>TIEBREAK:</b> fewest 0–0 results → most wins/correct BTTS picks → alphabetical.</p></section>}

      {tab==="admin" && <><section className="card"><div className="sectionHead"><div><small>ADMIN ONLY</small><h2>League control</h2></div><span className="adminTag">ADMIN</span></div><div className="adminGrid"><button><b>👥</b><strong>Members</strong><small>Create users & reset passwords</small></button><button><b>⚽</b><strong>Fixtures</strong><small>Review feed & eligibility</small></button><button><b>✓</b><strong>Results</strong><small>Review scoring corrections</small></button><button><b>↗</b><strong>Sharing</strong><small>Public table & weekly picks</small></button></div></section><section className="card setup"><small>GO-LIVE CHECKLIST</small><h2>User setup still required</h2><p>The interface is ready for individual accounts, but the real member accounts must be created in Supabase Auth and linked to the profiles table before passwords are issued.</p><div><b>1</b> Create admin account</div><div><b>2</b> Create each member account</div><div><b>3</b> Approve profiles</div><div><b>4</b> Test member pick permissions</div></section></>}
    </div>

    <nav className="nav"><button className={tab==="home"?"active":""} onClick={()=>setTab("home")}><span>⌂</span>Home</button><button className={tab==="fixtures"?"active":""} onClick={()=>setTab("fixtures")}><span>⚽</span>Pick</button><button className={tab==="picks"?"active":""} onClick={()=>setTab("picks")}><span>☷</span>Picks</button><button className={tab==="table"?"active":""} onClick={()=>setTab("table")}><span>▥</span>Table</button><button className={tab==="admin"?"active":""} onClick={()=>setTab("admin")}><span>⚙</span>Admin</button></nav>
    {toast&&<div className="toast">{toast}</div>}
  </main>;
}
