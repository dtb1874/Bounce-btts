from pathlib import Path
import re

league=Path('app/LeagueApp.tsx')
s=league.read_text()

s=s.replace('type View = "dashboard" | "pick" | "fixtures" | "table" | "results" | "combined" | "history" | "players" | "about" | "alerts" | "admin";', 'type View = "dashboard" | "pick" | "fixtures" | "table" | "stats" | "results" | "combined" | "history" | "players" | "about" | "alerts" | "admin";',1)
s=s.replace('{ id: "table", label: "League Table", icon: "☷" },\n  { id: "results"', '{ id: "table", label: "League Table", icon: "☷" },\n  { id: "stats", label: "League Stats", icon: "◫" },\n  { id: "results"',1)

if 'const viewHashes:' not in s:
    s=s.replace('const competitionPriority = [', '''const viewHashes: Record<View,string> = {dashboard:"dashboard",pick:"make-my-pick",fixtures:"fixtures",table:"league-table",stats:"league-stats",results:"results",combined:"combined-results",history:"league-history",players:"players",about:"about",alerts:"alerts",admin:"admin"};
const hashViews = Object.fromEntries(Object.entries(viewHashes).map(([k,v])=>[v,k])) as Record<string,View>;

const competitionPriority = [''',1)

s=s.replace('const [view,setView] = useState<View>("dashboard");', '''const [view,setView] = useState<View>(()=>{
    if(typeof window==="undefined")return "dashboard";
    const slug=window.location.hash.replace(/^#/,"");
    return hashViews[slug]??"dashboard";
  });''',1)

needle='useEffect(() => { const t = window.setInterval(() => setNow(Date.now()),30000); return () => clearInterval(t); },[]);'
if 'viewHashes[view]' not in s:
    s=s.replace(needle, needle+'''\n  useEffect(()=>{ if(typeof window!=="undefined") window.history.replaceState(null,"",`${window.location.pathname}${window.location.search}#${viewHashes[view]}`); },[view]);
  useEffect(()=>{ const onHash=()=>{const next=hashViews[window.location.hash.replace(/^#/,"")];if(next)setView(next)};window.addEventListener("hashchange",onHash);return()=>window.removeEventListener("hashchange",onHash)},[]);''',1)

s=s.replace('return <main className={styles.shell}>\n    <button className={styles.mobileMenu}', 'return <main className={`${styles.shell} ${styles.v2Shell}`} data-view={view}>\n    <button className={styles.mobileMenu}',1)
s=s.replace('<section className={styles.main}>', '<section className={styles.main} data-current-view={view}>',1)

# Add public preview link in the desktop brand area.
s=s.replace('<div className={styles.brand}><img src="/assets/st-giles-heart.jpg" alt=""/><div><strong>BOUNCE</strong><span>BTTS LEAGUE</span><small>EST 2024</small></div></div>', '<div className={styles.brand}><img src="/assets/st-giles-heart.jpg" alt=""/><div><strong>BOUNCE</strong><span>BTTS LEAGUE</span><small>EDINBURGH · EST 2024</small></div></div><a className={styles.spectatorLink} href="/table" target="_blank" rel="noreferrer">Spectator view ↗</a>',1)

# Render the new standalone stats section.
s=s.replace('{view==="table" && <LeagueTable standings={standings} seasonLabel={seasonLabel} gameweek={gameweek??null} entryFee={entryFee} fixtures={fixtures} predictions={predictions} profiles={profiles} gameweeks={initialGameweeks} adjustments={adjustments}/>}\n        {view==="results"', '{view==="table" && <LeagueTable standings={standings} seasonLabel={seasonLabel} gameweek={gameweek??null} entryFee={entryFee} fixtures={fixtures} predictions={predictions} profiles={profiles} gameweeks={initialGameweeks} adjustments={adjustments}/>}\n        {view==="stats" && <LeagueStats standings={standings} seasonLabel={seasonLabel} fixtures={fixtures} predictions={predictions} profiles={profiles} gameweeks={initialGameweeks} adjustments={adjustments}/>}\n        {view==="results"',1)

# New mobile dock, deliberately separate from the old mobile drawer.
dock='''<nav className={styles.mobileDock} aria-label="Primary navigation">
      <button className={view==="dashboard"?styles.active:""} onClick={()=>setView("dashboard")}><span>⌂</span><small>Home</small></button>
      <button className={view==="pick"?styles.active:""} onClick={()=>setView("pick")}><span>⚑</span><small>Pick</small></button>
      <button className={view==="table"?styles.active:""} onClick={()=>setView("table")}><span>☷</span><small>Table</small></button>
      <button className={view==="stats"?styles.active:""} onClick={()=>setView("stats")}><span>◫</span><small>Stats</small></button>
      <button onClick={()=>setMobileMenu(true)}><span>☰</span><small>More</small></button>
    </nav>'''
if 'className={styles.mobileDock}' not in s:
    s=s.replace('    {emulatedProfile&&<button className={styles.stopEmulating}', '    '+dock+'\n    {emulatedProfile&&<button className={styles.stopEmulating}',1)

# League table becomes standings + timeline only; detailed statistics move to League Stats.
start=s.find('function LeagueTable(')
end=s.find('function CombinedResultsPage(',start)
if start<0 or end<0: raise SystemExit('LeagueTable block not found')
block=s[start:end]
if '<SeasonPositionTimeline' in block and '<div className={styles.leagueStatsBand}>' in block:
    block=re.sub(r'(</div><SeasonPositionTimeline profiles=\{profiles\} gameweeks=\{gameweeks\} predictions=\{predictions\} adjustments=\{adjustments\}/>)<div className=\{styles\.leagueStatsBand\}>.*?</section>\n\}', r'\1<div className={styles.tableToStats}><div><span>MORE THAN THE TABLE</span><strong>Explore the season story</strong><small>Strike rates, streaks, odds, leaders and player tendencies now live in their own League Stats section.</small></div><button onClick={()=>window.location.hash="league-stats"}>Open League Stats →</button></div></section>\n}', block, count=1, flags=re.S)
    s=s[:start]+block+s[end:]

# Standalone League Stats component.
if 'function LeagueStats(' not in s:
    insert_at=s.find('function CombinedResultsPage(')
    stats=r'''function LeagueStats({standings,seasonLabel,fixtures,predictions,profiles,gameweeks,adjustments}:{standings:Standing[];seasonLabel:string;fixtures:Fixture[];predictions:Prediction[];profiles:Profile[];gameweeks:Gameweek[];adjustments:ScoreAdjustment[]}){
  const fixtureById=new Map(fixtures.map(f=>[f.id,f]));
  const gameweekById=new Map(gameweeks.map(g=>[g.id,g]));
  const finished=predictions.map(p=>({p,f:fixtureById.get(p.fixture_id)})).filter((x):x is {p:Prediction;f:Fixture}=>Boolean(x.f&&x.p.points_awarded!=null));
  const orderedWeeks=[...gameweeks].sort((a,b)=>a.number-b.number);
  const frac=(value:string|null)=>{if(!value)return 0;const m=value.match(/(\d+)\s*\/\s*(\d+)/);return m?Number(m[1])/Math.max(Number(m[2]),1):0};
  const rows=profiles.map(profile=>{
    const picks=predictions.filter(p=>p.member_id===profile.id).sort((a,b)=>(gameweekById.get(a.gameweek_id)?.number??999)-(gameweekById.get(b.gameweek_id)?.number??999));
    const scored=picks.filter(p=>p.points_awarded!=null);
    const wins=scored.filter(p=>p.points_awarded===3);
    const scoreNil=scored.filter(p=>p.points_awarded===1).length;
    const zeroZero=scored.filter(p=>p.points_awarded===-1).length;
    let current=0,best=0;
    for(const gw of orderedWeeks){const p=scored.find(x=>x.gameweek_id===gw.id);if(p?.points_awarded===3){current++;best=Math.max(best,current)}else if(p?.points_awarded!=null)current=0;}
    let tail=0;for(let i=orderedWeeks.length-1;i>=0;i--){const p=scored.find(x=>x.gameweek_id===orderedWeeks[i].id);if(!p)continue;if(p.points_awarded===3)tail++;else break;}
    const winFixtures=wins.map(p=>fixtureById.get(p.fixture_id)).filter(Boolean) as Fixture[];
    const biggest=[...winFixtures].sort((a,b)=>frac(b.odds_fractional)-frac(a.odds_fractional))[0];
    const comps=new Map<string,{picks:number,wins:number}>();picks.forEach(p=>{const f=fixtureById.get(p.fixture_id);if(!f)return;const k=competitionDisplayName(f);const e=comps.get(k)??{picks:0,wins:0};e.picks++;if(p.points_awarded===3)e.wins++;comps.set(k,e)});
    const favourite=[...comps.entries()].sort((a,b)=>b[1].picks-a[1].picks)[0]?.[0]??"—";
    const bestLeague=[...comps.entries()].filter(([,v])=>v.picks>0).sort((a,b)=>(b[1].wins/b[1].picks)-(a[1].wins/a[1].picks)||b[1].wins-a[1].wins)[0]?.[0]??"—";
    const standing=standings.find(x=>x.id===profile.id);
    return {id:profile.id,name:profile.display_name,points:standing?.points??0,played:standing?.played??scored.length,wins:wins.length,scoreNil,zeroZero,strike:scored.length?wins.length/scored.length*100:0,ppg:scored.length?(standing?.points??0)/scored.length:0,currentStreak:tail,bestStreak:best,biggest:biggest?.odds_fractional??"—",favourite,bestLeague};
  }).sort((a,b)=>b.points-a.points||b.strike-a.strike||a.name.localeCompare(b.name));
  const bestForm=[...rows].sort((a,b)=>b.currentStreak-a.currentStreak||b.strike-a.strike)[0];
  const bestStrike=[...rows].filter(r=>r.played>0).sort((a,b)=>b.strike-a.strike||b.wins-a.wins)[0];
  const biggest=[...rows].sort((a,b)=>frac(b.biggest)-frac(a.biggest))[0];
  const leader=rows[0];
  return <section className={styles.statsPage}>
    <Heading eyebrow={`SEASON ${seasonLabel} · LEAGUE INTELLIGENCE`} title="League Stats"><p>The numbers behind the table — form, efficiency, streaks, odds and player tendencies.</p></Heading>
    <div className={styles.statsHero}>
      <div className={styles.statsHeroCopy}><span>THE SEASON STORY</span><h3>{leader?.name??"—"} currently sets the pace</h3><p>Use the cards below to see who is clinical, who is ambitious and who keeps finding trouble.</p></div>
      <div className={styles.statsHeroMosaic}><img src="/assets/st-giles-heart.jpg" alt="Heart of Midlothian pavement mosaic"/></div>
    </div>
    <div className={styles.leaderStrip}>
      <article><span>LEAGUE LEADER</span><strong>{leader?.name??"—"}</strong><small>{leader?`${leader.points} pts`:"No scores yet"}</small></article>
      <article><span>BEST CURRENT FORM</span><strong>{bestForm?.currentStreak?bestForm.name:"—"}</strong><small>{bestForm?.currentStreak?`${bestForm.currentStreak} straight BTTS wins`:"No active streak"}</small></article>
      <article><span>HIGHEST STRIKE RATE</span><strong>{bestStrike?.name??"—"}</strong><small>{bestStrike?`${bestStrike.strike.toFixed(0)}% BTTS`:"No scored picks"}</small></article>
      <article><span>BIGGEST WINNER</span><strong>{biggest?.biggest!=="—"?biggest?.name:"—"}</strong><small>{biggest?.biggest!=="—"?`BTTS ${biggest?.biggest}`:"Waiting for a priced winner"}</small></article>
    </div>
    <div className={styles.statLeaderboard}><div className={styles.statLeaderboardHead}><span>PLAYER</span><span>SR%</span><span>PPG</span><span>STREAK</span><span>BEST</span></div>{rows.map((r,i)=><div className={styles.statLeaderboardRow} key={r.id}><span><b>{i+1}</b><strong>{r.name}</strong></span><span>{r.strike.toFixed(0)}%</span><span>{r.ppg.toFixed(1)}</span><span>{r.currentStreak?r.currentStreak:"—"}</span><span>{r.biggest}</span></div>)}</div>
    <div className={styles.playerStatGrid}>{rows.map(r=><article key={r.id} className={styles.playerStatCard}><header><div><span>PLAYER PROFILE</span><h3>{r.name}</h3></div><strong>{r.points} pts</strong></header><div className={styles.playerStatMetrics}><div><span>BTTS STRIKE</span><b>{r.strike.toFixed(0)}%</b></div><div><span>POINTS / PICK</span><b>{r.ppg.toFixed(1)}</b></div><div><span>+3 WINS</span><b>{r.wins}</b></div><div><span>SCORE-NIL</span><b>{r.scoreNil}</b></div><div><span>0-0</span><b>{r.zeroZero}</b></div><div><span>BEST STREAK</span><b>{r.bestStreak||"—"}</b></div></div><footer><p><span>BIGGEST WINNER</span><strong>{r.biggest}</strong></p><p><span>MOST PICKED</span><strong>{r.favourite}</strong></p><p><span>BEST LEAGUE</span><strong>{r.bestLeague}</strong></p></footer></article>)}</div>
  </section>
}

'''
    s=s[:insert_at]+stats+s[insert_at:]

# Refresh release note wording for the redesign preview.
s=s.replace('summary:"Season Position Timeline and v2 league-table experience"','summary:"Complete v2 mobile-first visual rebuild and season storytelling"',1)
league.write_text(s)

css=Path('app/release.module.css')
c=css.read_text()
marker='/* ===== BOUNCE V2 PRESENTATION REBUILD ===== */'
if marker not in c:
    c += r'''

/* ===== BOUNCE V2 PRESENTATION REBUILD ===== */
.v2Shell{--v2-maroon:#5b1730;--v2-deep:#10090e;--v2-ink:#09080b;--v2-gold:#e8c36f;--v2-cream:#f4eadf;--v2-muted:#aa9b91;background:#09080b!important}
.v2Shell .main{background:linear-gradient(180deg,#09080b 0%,#120b10 45%,#09080b 100%)!important}
.v2Shell .sidebar{background:linear-gradient(180deg,rgba(15,8,12,.98),rgba(30,10,18,.98))!important;border-right:1px solid rgba(232,195,111,.24)!important}
.v2Shell .sidebar::before{content:"";position:absolute;inset:auto -50px 64px -50px;height:250px;background:url('/assets/st-giles-heart.jpg') center/220px no-repeat;opacity:.16;filter:sepia(.25) saturate(.75);pointer-events:none}
.v2Shell .brand{padding:10px 8px 16px;border-bottom:1px solid rgba(232,195,111,.15)}
.v2Shell .brand img{width:66px;height:66px;border:2px solid rgba(232,195,111,.68)!important;box-shadow:0 0 0 5px rgba(91,23,48,.45),0 10px 30px rgba(0,0,0,.4)}
.v2Shell .brand strong{font-size:27px;color:var(--v2-cream)}
.v2Shell .brand span{color:var(--v2-gold)}
.spectatorLink{display:block;margin:-8px 8px 16px;padding:8px 10px;text-align:center;border:1px solid rgba(232,195,111,.24);border-radius:10px;color:#d9bd7e;text-decoration:none;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;background:rgba(232,195,111,.04)}
.v2Shell .nav{gap:3px}.v2Shell .nav button{padding:10px 12px;border-radius:9px;color:#cfc3bb}.v2Shell .nav button:hover,.v2Shell .nav button.active{background:linear-gradient(90deg,rgba(112,27,56,.94),rgba(112,27,56,.18))!important;color:#fff5e9!important;box-shadow:inset 3px 0 0 var(--v2-gold)!important}
.v2Shell .hero{min-height:188px!important;padding:28px 34px!important;background:linear-gradient(90deg,rgba(12,7,10,.78),rgba(42,13,25,.55),rgba(13,8,12,.68)),url('/assets/edinburgh-skyline.jpg') center 42%/cover no-repeat!important;border-bottom:1px solid rgba(232,195,111,.3)!important}
.v2Shell .hero::after{content:""!important;display:block!important;position:absolute!important;right:36px!important;top:18px!important;width:148px!important;height:148px!important;border-radius:50%!important;background:url('/assets/st-giles-heart.jpg') center/cover no-repeat!important;opacity:.88!important;border:2px solid rgba(232,195,111,.65)!important;box-shadow:0 0 0 8px rgba(42,13,25,.48),0 16px 42px rgba(0,0,0,.55)!important;filter:sepia(.1) saturate(.85)!important}
.v2Shell .hero h1{font-size:51px!important;color:#fff3e5!important;text-shadow:0 5px 22px #000!important}.v2Shell .hero h2{color:var(--v2-gold)!important}.v2Shell .hero p{color:#e6d6c7!important}
.v2Shell .gwCard{margin-right:175px!important;background:rgba(9,8,11,.76)!important;border:1px solid rgba(232,195,111,.4)!important;box-shadow:0 12px 35px rgba(0,0,0,.42)!important}
.v2Shell .content{position:relative;padding:22px 28px 40px!important;background:radial-gradient(circle at 92% 6%,rgba(111,28,55,.18),transparent 24rem)}
.v2Shell .content::before{content:""!important;position:fixed!important;right:-95px!important;bottom:-90px!important;width:380px!important;height:380px!important;border-radius:50%!important;background:url('/assets/st-giles-round.jpg') center/cover no-repeat!important;opacity:.08!important;pointer-events:none!important;filter:sepia(.3) saturate(.6)!important;z-index:0!important}
.v2Shell .page{position:relative;z-index:1}
.v2Shell .heading{position:relative;min-height:118px;margin:0 0 18px!important;padding:20px 175px 18px 20px!important;overflow:hidden;border:1px solid rgba(232,195,111,.28)!important;border-left:4px solid var(--v2-gold)!important;border-radius:17px!important;background:linear-gradient(90deg,rgba(77,17,40,.94),rgba(28,12,19,.88) 66%,rgba(9,8,11,.42)),url('/assets/edinburgh-skyline.jpg') right center/58% auto no-repeat!important;box-shadow:0 18px 44px rgba(0,0,0,.26)!important}
.v2Shell .heading::after{content:"";position:absolute;right:28px;top:14px;width:90px;height:90px;border-radius:50%;background:url('/assets/st-giles-heart.jpg') center/cover no-repeat;opacity:.86;border:1px solid rgba(232,195,111,.6);box-shadow:0 8px 25px rgba(0,0,0,.38)}
.v2Shell .heading span{color:var(--v2-gold)!important}.v2Shell .heading h2{font-size:34px!important;color:#fff1e5!important}.v2Shell .heading p{color:#c7b9b0!important;max-width:720px}
.v2Shell .panel{border:1px solid rgba(136,67,86,.48)!important;background:linear-gradient(145deg,rgba(22,15,20,.97),rgba(10,10,13,.98))!important;border-radius:18px!important;box-shadow:0 18px 46px rgba(0,0,0,.22)!important}
.v2Shell .panel::before{content:"";position:absolute;left:0;right:0;bottom:0;height:68px;background:linear-gradient(180deg,transparent,rgba(88,23,47,.28)),url('/assets/st-giles-footer.jpg') center 70%/cover no-repeat;opacity:.2;pointer-events:none}
.v2Shell .dashboardIntro{min-height:165px;border-radius:19px!important;padding:22px 185px 22px 22px!important;background:linear-gradient(90deg,rgba(70,15,37,.94),rgba(18,11,16,.75)),url('/assets/edinburgh-skyline.jpg') center/cover no-repeat!important;border:1px solid rgba(232,195,111,.3)!important;overflow:hidden!important}
.v2Shell .dashboardIntro::after{content:"";position:absolute!important;right:26px!important;top:20px!important;width:120px!important;height:120px!important;border-radius:50%!important;background:url('/assets/st-giles-heart.jpg') center/cover no-repeat!important;opacity:.9!important;border:2px solid rgba(232,195,111,.55)!important;box-shadow:0 0 0 7px rgba(72,16,37,.42)!important}
.v2Shell .dashboardArt{display:none!important}
.v2Shell .statCard{background:linear-gradient(145deg,rgba(49,19,31,.92),rgba(15,13,17,.98))!important;border:1px solid rgba(232,195,111,.2)!important;border-radius:15px!important}.v2Shell .statCard span,.v2Shell .title{color:var(--v2-gold)!important}.v2Shell .statCard strong{font-family:Georgia,serif;color:#fff0df!important}
.tableToStats{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:18px;padding:17px 18px;border:1px solid rgba(232,195,111,.28);border-radius:15px;background:linear-gradient(90deg,rgba(82,19,43,.75),rgba(20,12,17,.92)),url('/assets/st-giles-footer.jpg') right/55% auto no-repeat}.tableToStats span{display:block;color:#e8c36f;font-size:9px;font-weight:900;letter-spacing:.13em}.tableToStats strong{display:block;color:#fff0e3;font:700 21px Georgia,serif;margin:3px 0}.tableToStats small{display:block;color:#b9aaa0;max-width:690px}.tableToStats button{border:1px solid #d7b261;background:#e8c36f;color:#32101d;border-radius:10px;padding:10px 13px;font-weight:900;white-space:nowrap}
.statsPage{position:relative}.statsHero{display:grid;grid-template-columns:1fr 180px;gap:18px;align-items:center;min-height:190px;margin-bottom:14px;padding:24px;border:1px solid rgba(232,195,111,.28);border-radius:18px;background:linear-gradient(90deg,rgba(82,18,43,.91),rgba(20,11,17,.72)),url('/assets/edinburgh-skyline.jpg') center/cover no-repeat;overflow:hidden}.statsHeroCopy span{font-size:10px;font-weight:900;letter-spacing:.15em;color:#e8c36f}.statsHeroCopy h3{font:700 31px Georgia,serif;margin:5px 0;color:#fff1e4}.statsHeroCopy p{color:#d0bfb4;max-width:640px}.statsHeroMosaic{text-align:center}.statsHeroMosaic img{width:138px;height:138px;border-radius:50%;object-fit:cover;border:2px solid rgba(232,195,111,.72);box-shadow:0 0 0 8px rgba(65,16,35,.55),0 18px 40px rgba(0,0,0,.4)}
.leaderStrip{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}.leaderStrip article{min-width:0;padding:14px;border:1px solid rgba(232,195,111,.2);border-radius:14px;background:linear-gradient(145deg,rgba(48,19,31,.95),rgba(15,12,16,.98));overflow:hidden}.leaderStrip span{display:block;color:#d7b66e;font-size:9px;font-weight:900;letter-spacing:.1em}.leaderStrip strong{display:block;margin:6px 0 3px;color:#fff0e4;font:700 20px Georgia,serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.leaderStrip small{color:#a99d95}
.statLeaderboard{border:1px solid rgba(136,67,86,.46);border-radius:16px;overflow:hidden;margin-bottom:16px;background:#0f0d10}.statLeaderboardHead,.statLeaderboardRow{display:grid;grid-template-columns:minmax(145px,1fr) 70px 70px 80px 90px;align-items:center;padding:10px 13px}.statLeaderboardHead{background:linear-gradient(90deg,#681a38,#421326);color:#e8c36f;font-size:9px;font-weight:900;letter-spacing:.1em}.statLeaderboardRow{border-top:1px solid rgba(255,255,255,.065);color:#dcd2ca}.statLeaderboardRow>span:first-child{display:flex;align-items:center;gap:10px}.statLeaderboardRow>span:first-child b{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#32121f;color:#e8c36f;font-size:10px}.statLeaderboardRow strong{color:#fff0e5}
.playerStatGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.playerStatCard{position:relative;overflow:hidden;border:1px solid rgba(130,65,84,.5);border-radius:17px;padding:17px;background:linear-gradient(145deg,rgba(30,16,23,.98),rgba(10,10,13,.98));box-shadow:0 14px 34px rgba(0,0,0,.18)}.playerStatCard::after{content:"";position:absolute;right:-34px;bottom:-45px;width:150px;height:150px;border-radius:50%;background:url('/assets/st-giles-heart.jpg') center/cover no-repeat;opacity:.07}.playerStatCard header{display:flex;justify-content:space-between;gap:10px;align-items:start;margin-bottom:13px}.playerStatCard header span{color:#d7b66e;font-size:8px;font-weight:900;letter-spacing:.11em}.playerStatCard h3{margin:3px 0;color:#fff0e5;font-size:21px}.playerStatCard header>strong{font:700 22px Georgia,serif;color:#e8c36f}.playerStatMetrics{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.playerStatMetrics div{padding:9px;border-radius:10px;background:rgba(255,255,255,.028);border:1px solid rgba(255,255,255,.055)}.playerStatMetrics span,.playerStatCard footer span{display:block;font-size:8px;color:#918780;letter-spacing:.06em}.playerStatMetrics b{display:block;margin-top:3px;color:#eee4dc;font-size:16px}.playerStatCard footer{position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:11px;padding-top:10px;border-top:1px solid rgba(255,255,255,.07)}.playerStatCard footer p{margin:0;min-width:0}.playerStatCard footer strong{display:block;margin-top:4px;color:#d7bd93;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mobileDock{display:none}
@media(max-width:650px){
  .v2Shell{padding-bottom:76px}
  .v2Shell .mobileMenu{position:fixed!important;top:10px!important;left:10px!important;width:42px!important;height:42px!important;border-radius:13px!important;background:rgba(22,10,16,.9)!important;border:1px solid rgba(232,195,111,.38)!important;color:#e8c36f!important;z-index:80!important}
  .v2Shell .main{margin-left:0!important}
  .v2Shell .hero{min-height:126px!important;padding:20px 100px 18px 62px!important;background-position:center 42%!important}
  .v2Shell .hero::after{right:13px!important;top:14px!important;width:74px!important;height:74px!important;opacity:.94!important;box-shadow:0 0 0 4px rgba(45,12,25,.55),0 10px 25px rgba(0,0,0,.46)!important}
  .v2Shell .hero h1{font-size:31px!important;line-height:1!important}.v2Shell .hero h2{font-size:12px!important;margin-top:4px!important}.v2Shell .hero p{font-size:7px!important;line-height:1.25!important;margin:5px 0 0!important}
  .v2Shell .gwCard{position:absolute!important;left:62px!important;right:98px!important;bottom:8px!important;min-width:0!important;margin:0!important;padding:5px 7px!important;border-radius:9px!important}.v2Shell .gwCard>label{display:none!important}.v2Shell .gwRow{margin:0!important;gap:4px!important}.v2Shell .gwRow select,.v2Shell .gwRow button{height:25px!important;padding:2px 6px!important;font-size:9px!important}.v2Shell .gwCard>small{display:none!important}.v2Shell .demoSwitch{display:none!important}
  .v2Shell .content{padding:12px 10px 20px!important}.v2Shell .content::before{width:240px!important;height:240px!important;right:-105px!important;bottom:44px!important;opacity:.075!important}
  .v2Shell .heading{min-height:88px!important;padding:12px 78px 11px 12px!important;border-radius:14px!important;margin-bottom:10px!important;background-size:auto 100%!important}.v2Shell .heading::after{right:9px!important;top:10px!important;width:62px!important;height:62px!important}.v2Shell .heading h2{font-size:24px!important;line-height:1.02!important;margin:3px 0!important}.v2Shell .heading span{font-size:8px!important}.v2Shell .heading p{font-size:10px!important;line-height:1.3!important;margin-top:5px!important;max-width:245px}
  .v2Shell .panel{border-radius:14px!important;margin-bottom:10px!important;padding:12px!important}
  .v2Shell .dashboardIntro{min-height:122px!important;padding:16px 98px 15px 15px!important;border-radius:15px!important;margin-bottom:9px!important}.v2Shell .dashboardIntro::after{right:13px!important;top:16px!important;width:70px!important;height:70px!important;box-shadow:0 0 0 4px rgba(72,16,37,.42)!important}.v2Shell .dashboardIntro h2{font-size:23px!important;line-height:1.02!important;margin:4px 0!important}.v2Shell .dashboardIntro p{font-size:10px!important;line-height:1.25!important}.v2Shell .dashboardStats{gap:7px!important}.v2Shell .statCard{padding:10px!important;min-height:76px!important}.v2Shell .statCard strong{font-size:22px!important}
  .mobileDock{display:grid;grid-template-columns:repeat(5,1fr);position:fixed;z-index:75;left:8px;right:8px;bottom:max(8px,env(safe-area-inset-bottom));height:61px;padding:5px;border:1px solid rgba(232,195,111,.34);border-radius:17px;background:rgba(15,8,12,.96);backdrop-filter:blur(13px);box-shadow:0 12px 36px rgba(0,0,0,.55)}.mobileDock button{border:0;border-radius:12px;background:transparent;color:#9f9289;display:grid;place-items:center;align-content:center;gap:1px}.mobileDock button span{font-size:18px;line-height:1}.mobileDock button small{font-size:8px;font-weight:800}.mobileDock button.active{background:linear-gradient(180deg,rgba(112,27,56,.84),rgba(68,18,37,.86));color:#f7df9f;box-shadow:inset 0 0 0 1px rgba(232,195,111,.18)}
  .tableToStats{display:block;padding:13px;margin-top:10px}.tableToStats strong{font-size:18px}.tableToStats small{font-size:10px;line-height:1.3}.tableToStats button{width:100%;margin-top:9px;padding:9px}
  .statsHero{grid-template-columns:1fr 88px;min-height:132px;padding:15px 12px;margin-bottom:9px}.statsHeroCopy h3{font-size:21px;line-height:1.05}.statsHeroCopy p{font-size:10px;line-height:1.3}.statsHeroMosaic img{width:70px;height:70px;box-shadow:0 0 0 4px rgba(65,16,35,.55)}
  .leaderStrip{grid-template-columns:1fr 1fr;gap:7px;margin-bottom:9px}.leaderStrip article{padding:11px;min-height:82px}.leaderStrip strong{font-size:16px}.leaderStrip small{font-size:9px;line-height:1.2}
  .statLeaderboard{margin-bottom:9px}.statLeaderboardHead,.statLeaderboardRow{grid-template-columns:minmax(108px,1fr) 43px 42px 45px 60px;padding:8px 7px;gap:2px;font-size:9px}.statLeaderboardHead{font-size:7px}.statLeaderboardRow>span:first-child{gap:5px}.statLeaderboardRow>span:first-child b{width:18px;height:18px;font-size:8px}.statLeaderboardRow strong{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .playerStatGrid{grid-template-columns:1fr;gap:8px}.playerStatCard{padding:13px;border-radius:14px}.playerStatCard h3{font-size:19px}.playerStatCard header>strong{font-size:18px}.playerStatMetrics{gap:5px}.playerStatMetrics div{padding:7px 6px}.playerStatMetrics span{font-size:7px}.playerStatMetrics b{font-size:15px}.playerStatCard footer{gap:5px}.playerStatCard footer span{font-size:7px}.playerStatCard footer strong{font-size:9px}
}
'''
css.write_text(c)
