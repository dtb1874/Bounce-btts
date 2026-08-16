from pathlib import Path
import re

league=Path('app/LeagueApp.tsx')
s=league.read_text()

# Brand: remove repeated circular mosaic and use a clean monogram.
s=s.replace('<div className={styles.brand}><img src="/assets/st-giles-heart.jpg" alt=""/><div><strong>BOUNCE</strong><span>BTTS LEAGUE</span><small>EDINBURGH · EST 2024</small></div></div>', '<div className={styles.brand}><div className={styles.brandMark}>B</div><div><strong>BOUNCE</strong><span>BTTS LEAGUE</span><small>EDINBURGH · EST 2024</small></div></div><button type="button" className={styles.mobileMenuClose} onClick={()=>setMobileMenu(false)}>× Close menu</button>',1)

# Make selected standings a true historical snapshot through the selected gameweek.
old='''  const standings = useMemo<Standing[]>(() => {
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
  },[profiles,predictions,adjustments]);'''
new='''  const standings = useMemo<Standing[]>(() => {
    const cutoff = gameweek?.number ?? Number.MAX_SAFE_INTEGER;
    const included = new Set(initialGameweeks.filter(g=>g.number<=cutoff).map(g=>g.id));
    const scopedPredictions = predictions.filter(p=>included.has(p.gameweek_id));
    const scopedAdjustments = adjustments.filter(a=>included.has(a.gameweek_id));
    const rows = new Map<string, Standing>(profiles.map(p => [p.id,{ id:p.id,name:p.display_name,played:0,wins:0,oneSided:0,zeroZeroCount:0,points:0 }] as [string, Standing]));
    for (const p of scopedPredictions) {
      if (p.points_awarded == null) continue;
      const row = rows.get(p.member_id); if (!row) continue;
      row.played += 1; row.points += p.points_awarded;
      if (p.points_awarded === 3) row.wins += 1;
      if (p.points_awarded === 1) row.oneSided += 1;
      if (p.points_awarded === -1) row.zeroZeroCount += 1;
    }
    for (const a of scopedAdjustments) {
      const row = rows.get(a.member_id); if (!row) continue;
      const scored = scopedPredictions.some(p => p.member_id === a.member_id && p.gameweek_id === a.gameweek_id && p.points_awarded != null);
      if (scored && a.reason.trim().toLowerCase() === "missed selection") continue;
      if (!scored) row.played += 1;
      row.points += a.points;
    }
    return Array.from(rows.values()).sort((a,b) => b.points-a.points || a.zeroZeroCount-b.zeroZeroCount || b.wins-a.wins || a.name.localeCompare(b.name));
  },[profiles,predictions,adjustments,initialGameweeks,gameweek?.number]);'''
if old not in s: raise SystemExit('standings block not found')
s=s.replace(old,new,1)

# Keep the side menu state in sync with bottom navigation and add the floating GW selector.
s=s.replace('<button className={view==="dashboard"?styles.active:""} onClick={()=>setView("dashboard")}>', '<button className={view==="dashboard"?styles.active:""} onClick={()=>{setView("dashboard");setMobileMenu(false)}}>',1)
s=s.replace('<button className={view==="pick"?styles.active:""} onClick={()=>setView("pick")}>', '<button className={view==="pick"?styles.active:""} onClick={()=>{setView("pick");setMobileMenu(false)}}>',1)
s=s.replace('<button className={view==="table"?styles.active:""} onClick={()=>setView("table")}>', '<button className={view==="table"?styles.active:""} onClick={()=>{setView("table");setMobileMenu(false)}}>',1)
s=s.replace('<button className={view==="stats"?styles.active:""} onClick={()=>setView("stats")}>', '<button className={view==="stats"?styles.active:""} onClick={()=>{setView("stats");setMobileMenu(false)}}>',1)
s=s.replace('<button onClick={()=>setMobileMenu(true)}><span>☰</span><small>More</small></button>', '<button className={mobileMenu?styles.active:""} onClick={()=>setMobileMenu(v=>!v)}><span>☰</span><small>{mobileMenu?"Close":"More"}</small></button>',1)

anchor='''    <nav className={styles.mobileDock} aria-label="Primary navigation">'''
floating='''    {["dashboard","table","stats","results","combined","players"].includes(view) && gameweek && <div className={styles.floatingGameweek} aria-label="Gameweek selector">
      <button type="button" aria-label="Previous gameweek" disabled={initialGameweeks.findIndex(g=>g.id===gameweekId)<=0} onClick={()=>{const i=initialGameweeks.findIndex(g=>g.id===gameweekId);if(i>0)setGameweekId(initialGameweeks[i-1].id)}}>‹</button>
      <label><span>VIEWING</span><select aria-label="Choose gameweek" value={gameweek.id} onChange={e=>setGameweekId(e.target.value)}>{initialGameweeks.map(g=><option key={g.id} value={g.id}>GW {g.number}</option>)}</select></label>
      <button type="button" aria-label="Next gameweek" disabled={initialGameweeks.findIndex(g=>g.id===gameweekId)>=initialGameweeks.length-1} onClick={()=>{const i=initialGameweeks.findIndex(g=>g.id===gameweekId);if(i>=0&&i<initialGameweeks.length-1)setGameweekId(initialGameweeks[i+1].id)}}>›</button>
    </div>}
    <nav className={styles.mobileDock} aria-label="Primary navigation">'''
if anchor not in s: raise SystemExit('mobile dock anchor missing')
s=s.replace(anchor,floating,1)

# Remove the stats-page circular mosaic completely.
s=s.replace('''      <div className={styles.statsHeroMosaic}><img src="/assets/st-giles-heart.jpg" alt="Heart of Midlothian pavement mosaic"/></div>
''','',1)

# Make stats honour the selected historical gameweek as well.
s=s.replace('<LeagueStats standings={standings} seasonLabel={seasonLabel} fixtures={fixtures} predictions={predictions} profiles={profiles} gameweeks={initialGameweeks} adjustments={adjustments}/>', '<LeagueStats standings={standings} seasonLabel={seasonLabel} gameweek={gameweek??null} fixtures={fixtures} predictions={predictions} profiles={profiles} gameweeks={initialGameweeks} adjustments={adjustments}/>',1)
s=s.replace('function LeagueStats({standings,seasonLabel,fixtures,predictions,profiles,gameweeks,adjustments}:{standings:Standing[];seasonLabel:string;fixtures:Fixture[];predictions:Prediction[];profiles:Profile[];gameweeks:Gameweek[];adjustments:ScoreAdjustment[]}){', 'function LeagueStats({standings,seasonLabel,gameweek,fixtures,predictions,profiles,gameweeks,adjustments}:{standings:Standing[];seasonLabel:string;gameweek:Gameweek|null;fixtures:Fixture[];predictions:Prediction[];profiles:Profile[];gameweeks:Gameweek[];adjustments:ScoreAdjustment[]}){',1)
stats_start=s.find('function LeagueStats(')
stats_end=s.find('function ResultsPage(',stats_start)
if stats_start<0 or stats_end<0: raise SystemExit('LeagueStats segment missing')
segment=s[stats_start:stats_end]
segment=segment.replace('  const gameweekById=new Map(gameweeks.map(g=>[g.id,g]));\n  const finished=predictions.map', '  const gameweekById=new Map(gameweeks.map(g=>[g.id,g]));\n  const cutoff=gameweek?.number??Number.MAX_SAFE_INTEGER;\n  const scopedPredictions=predictions.filter(p=>(gameweekById.get(p.gameweek_id)?.number??Number.MAX_SAFE_INTEGER)<=cutoff);\n  const finished=scopedPredictions.map',1)
segment=segment.replace('const picks=predictions.filter(p=>p.member_id===profile.id)', 'const picks=scopedPredictions.filter(p=>p.member_id===profile.id)')
s=s[:stats_start]+segment+s[stats_end:]

# Give weekly pick rows a stable global hook for the mobile composition pass.
s=s.replace('className={`${styles.pickListRow} ${isAdmin&&!prediction?"adminMissingPickRow":""}`}', 'className={`${styles.pickListRow} v2PickRow ${isAdmin&&!prediction?"adminMissingPickRow":""}`}',1)

# History: compact summary, compact honour rows, and interactive personalised trophy.
s=s.replace('''  const [id,setId]=useState(seasons[0]?.id??"");
''','''  const [id,setId]=useState(seasons[0]?.id??"");
  const [trophyOpen,setTrophyOpen]=useState(false);
''',1)
s=s.replace('''      <img src="/assets/bounce-cup.png" alt="" aria-hidden="true"/>
    </div>
    <div className={styles.historyStatsBand}>
      <article><span>REIGNING CHAMPION</span><strong>{reigningChampion?.winner ?? "—"}</strong></article>
      <article><span>SELECTED SEASON</span><strong>{selected?.label ?? "—"}</strong></article>
      <article><span>ARCHIVED GAMEWEEKS</span><strong>{selected?.gameweeks ?? 0}</strong></article>
    </div>''','''      <button type="button" className={styles.historyTrophyButton} aria-label="Expand personalised Bounce trophy" onClick={()=>setTrophyOpen(true)}><img src="/assets/bounce-cup.png" alt="Personalised Bounce trophy"/></button>
    </div>
    <div className={styles.historyStatsBand}>
      <article className={styles.historySummaryCard}><div><span>REIGNING CHAMPION</span><strong>{reigningChampion?.winner ?? "—"}</strong></div><div><span>SELECTED SEASON</span><strong>{selected?.label ?? "—"}</strong></div><div><span>GAMEWEEKS</span><strong>{selected?.gameweeks ?? 0}</strong></div></article>
    </div>
    {trophyOpen&&<button type="button" className={styles.trophyOverlay} aria-label="Close enlarged trophy" onClick={()=>setTrophyOpen(false)}><img src="/assets/bounce-cup.png" alt="Personalised Bounce trophy enlarged"/><span>Tap to close</span></button>}''',1)

# Update v2 release note wording away from circular mosaic language and mention historical snapshots.
s=s.replace('"Refreshed the League Table presentation with subtle Heart of Midlothian pavement-mosaic texture while retaining the maroon and gold Bounce identity"', '"Rebuilt the visual system with restrained Edinburgh heritage imagery and selective full-section Heart of Midlothian street-heart watermarking rather than repeated circular motifs","Gameweek switching now recalculates standings as a true historical snapshot through the selected week"',1)

league.write_text(s)

# Public spectator pages: remove the repeated circular heart/round mosaic imagery.
for file in ['app/table/page.tsx','app/stats/page.tsx']:
    p=Path(file); t=p.read_text()
    t=t.replace('<img src="/assets/st-giles-heart.jpg" alt="Heart of Midlothian pavement mosaic"/>','')
    t=t.replace('<img src="/assets/st-giles-round.jpg" alt=""/>','')
    p.write_text(t)

# Module styling: append a decisive feedback override layer.
css=Path('app/release.module.css')
c=css.read_text()
c+='''

/* ===== V2 USER FEEDBACK PASS ===== */
/* Circular mosaic treatment removed globally; heritage imagery is now selective and page-specific. */
.v2Shell .hero::after,.v2Shell .heading::after,.v2Shell .dashboardIntro::after,.v2Shell .content::before,.v2Shell .sidebar::before,.v2Shell .panel::before,.seasonTimeline::after{display:none!important;background:none!important}
.v2Shell .hero{padding-right:34px!important}
.v2Shell .heading{padding-right:20px!important;min-height:auto!important;background:linear-gradient(90deg,rgba(77,17,40,.96),rgba(28,12,19,.9) 66%,rgba(9,8,11,.5)),url('/assets/edinburgh-skyline.jpg') right center/58% auto no-repeat!important}
.v2Shell .brand{display:grid!important;grid-template-columns:56px 1fr!important;align-items:center!important;gap:10px!important;position:relative}
.brandMark{width:52px;height:58px;display:grid;place-items:center;border:1px solid rgba(232,195,111,.55);border-radius:8px;background:linear-gradient(145deg,#671b38,#31101e);color:#f3d68e;font:800 31px Georgia,serif;box-shadow:0 10px 24px rgba(0,0,0,.35)}
.mobileMenuClose{display:none;border:1px solid rgba(232,195,111,.3);background:rgba(232,195,111,.06);color:#ead5a0;border-radius:9px;padding:8px 10px;font-size:10px;font-weight:900;margin:0 8px 10px}
.v2Shell .dashboardIntro{padding-right:22px!important;background:linear-gradient(90deg,rgba(69,15,37,.96),rgba(18,11,16,.74)),url('/assets/tynecastle-building-watermark.png') right center/auto 115% no-repeat!important}
.v2Shell .gwCard{margin-right:0!important;max-width:310px!important;width:auto!important;justify-self:end!important}
/* The street-heart is used only where it reads as a continuous watermark, not as a repeated badge. */
.v2Shell .leagueTableFirst,.v2Shell .formPanel{position:relative!important;overflow:hidden!important;background:linear-gradient(145deg,rgba(20,14,19,.90),rgba(9,9,12,.94)),url('/assets/st-giles-heart.jpg') center/cover no-repeat!important}
.v2Shell .leagueTableFirst>* ,.v2Shell .formPanel>*{position:relative;z-index:1}
.v2Shell .seasonTimeline{background:linear-gradient(145deg,rgba(67,15,34,.94),rgba(24,10,16,.95)),url('/assets/edinburgh-skyline.jpg') center/cover no-repeat!important}
.statsHero{grid-template-columns:1fr!important;background:linear-gradient(90deg,rgba(82,18,43,.93),rgba(20,11,17,.78)),url('/assets/tynecastle-building-watermark.png') right center/auto 120% no-repeat!important}
.statsHeroMosaic{display:none!important}
.historyHero{position:relative!important;overflow:visible!important;min-height:150px!important;padding-right:170px!important}
.historyTrophyButton{position:absolute;right:5px;top:50%;transform:translateY(-50%);width:172px;height:190px;border:0;background:transparent;padding:0;z-index:3;filter:drop-shadow(0 18px 24px rgba(0,0,0,.5))}
.historyTrophyButton img{width:100%;height:100%;object-fit:contain;transition:transform .2s ease}.historyTrophyButton:hover img{transform:scale(1.04)}
.historyStatsBand{display:block!important}.historySummaryCard{display:grid!important;grid-template-columns:1.2fr 1fr .7fr!important;gap:0!important;padding:0!important;overflow:hidden!important}.historySummaryCard>div{padding:13px 15px;border-right:1px solid rgba(232,195,111,.13)}.historySummaryCard>div:last-child{border-right:0}.historySummaryCard span{display:block;color:#c8a95f;font-size:8px;font-weight:900;letter-spacing:.09em}.historySummaryCard strong{display:block;margin-top:4px;color:#fff0df;font:700 18px Georgia,serif}
.honourGrid{display:grid!important;gap:5px!important}.honourCard{display:grid!important;grid-template-columns:90px minmax(0,1fr) auto!important;align-items:center!important;gap:10px!important;min-height:0!important;padding:9px 12px!important;border-radius:9px!important}.honourCard span,.honourCard strong,.honourCard small{margin:0!important}.honourCard strong{font-size:14px!important}.honourCard small{text-align:right!important}.honourCardLeader{background:linear-gradient(90deg,rgba(111,27,56,.74),rgba(56,16,31,.45))!important;border-color:rgba(232,195,111,.45)!important}
.trophyOverlay{position:fixed;inset:0;z-index:120;border:0;background:rgba(5,4,6,.88);backdrop-filter:blur(8px);display:grid;place-items:center;padding:30px}.trophyOverlay img{width:min(82vw,520px);height:min(72vh,620px);object-fit:contain;filter:drop-shadow(0 28px 42px rgba(0,0,0,.65))}.trophyOverlay span{position:absolute;bottom:max(28px,env(safe-area-inset-bottom));color:#e8c36f;font-size:11px;font-weight:900;letter-spacing:.08em}
.floatingGameweek{position:fixed;z-index:72;right:18px;bottom:82px;display:grid;grid-template-columns:34px auto 34px;align-items:stretch;overflow:hidden;border:1px solid rgba(232,195,111,.42);border-radius:13px;background:rgba(18,9,14,.95);box-shadow:0 12px 34px rgba(0,0,0,.48);backdrop-filter:blur(12px)}.floatingGameweek>button{border:0;background:rgba(232,195,111,.06);color:#e8c36f;font-size:19px;font-weight:900}.floatingGameweek>button:disabled{opacity:.25}.floatingGameweek label{display:grid;place-items:center;padding:5px 8px;border-left:1px solid rgba(232,195,111,.12);border-right:1px solid rgba(232,195,111,.12)}.floatingGameweek label span{font-size:6px;letter-spacing:.12em;font-weight:900;color:#9d8c80}.floatingGameweek select{border:0;background:transparent;color:#f4dd9d;font-weight:900;font-size:12px;appearance:none;text-align:center;padding:0 3px}
@media(max-width:650px){
 .mobileMenuClose{display:block}
 .v2Shell .hero{min-height:132px!important;padding:18px 14px!important}.v2Shell .hero h1{max-width:none!important;font-size:34px!important}.v2Shell .hero h2,.v2Shell .hero p{max-width:none!important}.v2Shell .gwCard{display:none!important}
 .v2Shell .heading{padding:12px!important;min-height:74px!important;background:linear-gradient(90deg,rgba(76,17,39,.97),rgba(25,12,18,.88)),url('/assets/edinburgh-skyline.jpg') right center/auto 100% no-repeat!important}.v2Shell .heading h2{font-size:24px!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;line-height:1.05!important}.v2Shell .heading p{max-width:100%!important;font-size:9px!important}
 .v2Shell .dashboardIntro{min-height:104px!important;padding:14px!important;background:linear-gradient(90deg,rgba(67,15,35,.96),rgba(18,11,16,.78)),url('/assets/tynecastle-building-watermark.png') right center/auto 108% no-repeat!important}.v2Shell .dashboardIntro h2{font-size:22px!important;white-space:normal!important}.v2Shell .dashboardIntro p{max-width:78%!important}
 .leaguePage>.heading{display:block!important}.leaguePage>.heading>div{max-width:none!important}.leaguePage>.heading>span,.leaguePage>.heading>[class*="shareInline"]{display:block!important;margin-top:8px!important;width:max-content!important;max-width:100%!important}
 .floatingGameweek{right:10px;bottom:78px;grid-template-columns:30px auto 30px;border-radius:12px}.floatingGameweek label{padding:4px 7px}.floatingGameweek select{font-size:11px}
 .historyHero{min-height:122px!important;padding:14px 110px 14px 14px!important}.historyHero h3{font-size:23px!important}.historyTrophyButton{width:126px;height:146px;right:-7px;top:51%}.historySummaryCard{grid-template-columns:1.25fr 1fr .62fr!important}.historySummaryCard>div{padding:10px 9px!important}.historySummaryCard strong{font-size:13px!important}.historySummaryCard span{font-size:6px!important}.honourCard{grid-template-columns:66px minmax(0,1fr) auto!important;padding:8px 9px!important;gap:6px!important}.honourCard span,.honourCard small{font-size:8px!important}.honourCard strong{font-size:12px!important}
 .statsHero{min-height:112px!important;padding:14px!important;background:linear-gradient(90deg,rgba(82,18,43,.95),rgba(20,11,17,.80)),url('/assets/tynecastle-building-watermark.png') right center/auto 115% no-repeat!important}.statsHeroCopy p{max-width:78%}
}
'''
css.write_text(c)

# Global hooks for the Dashboard action/header and pick-list composition.
global_css=Path('app/globals.css')
g=global_css.read_text()
g+='''

/* v2 feedback: compact actions + readable weekly picks */
@media(max-width:650px){
 .weeklyPicksPanel .panelHeading{display:block!important;padding-bottom:8px!important}.weeklyPicksPanel .panelHeading>div:first-child{display:flex!important;flex-direction:column!important}.weeklyPicksPanel .panelHeading h3{order:1!important;font-size:20px!important;line-height:1.05!important;margin:0 0 2px!important}.weeklyPicksPanel .panelHeading .title{order:2!important;font-size:8px!important;letter-spacing:.1em!important;opacity:.72!important}.dashboardActionGrid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important;width:100%!important;margin-top:9px!important}.dashboardActionGrid button,.dashboardActionGrid [role="button"]{min-height:32px!important;height:auto!important;padding:7px 8px!important;font-size:9px!important;line-height:1.05!important;border-radius:8px!important}.dashboardGoldAction{min-height:32px!important;padding:7px 8px!important}
 .v2PickRow{display:grid!important;grid-template-columns:minmax(88px,.8fr) minmax(0,1.55fr) 48px!important;grid-template-areas:"player fixture score" "outcome outcome outcome"!important;gap:5px 7px!important;padding:9px 7px!important;align-items:center!important;border-radius:9px!important;margin-bottom:4px!important;background:rgba(255,255,255,.018)!important;border:1px solid rgba(255,255,255,.045)!important}.v2PickRow>[class*="playerCell"]{grid-area:player!important;min-width:0!important}.v2PickRow>[class*="fixtureCell"]{grid-area:fixture!important;min-width:0!important}.v2PickRow>[class*="liveCell"]{grid-area:score!important;text-align:center!important;min-width:0!important}.v2PickRow>[class*="status"]{grid-area:outcome!important;text-align:right!important;font-size:8px!important;font-weight:900!important;padding-top:3px!important;border-top:1px solid rgba(255,255,255,.04)!important}.v2PickRow [class*="playerCell"] strong{font-size:10px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.v2PickRow [class*="fixtureCell"] strong{font-size:10px!important;line-height:1.2!important;display:block!important}.v2PickRow [class*="fixtureCell"] small{font-size:8px!important;line-height:1.2!important;color:rgba(240,231,223,.62)!important}.v2PickRow [class*="liveCell"] strong{font-size:16px!important}.v2PickRow [class*="liveCell"] small{font-size:7px!important}
}
'''
global_css.write_text(g)

# Public styling: no circular mosaic repeats, no repeated heart texture on every card.
pub=Path('app/public-v2.css')
pubc=pub.read_text()+'''\n/* v2 feedback: restrained public heritage treatment */\n.spectatorHero>img,.spectatorSection:after,.spectatorFooter img{display:none!important}.spectatorHero{padding-right:clamp(18px,5vw,72px)!important}.spectatorSection{overflow:hidden}.spectatorFooter{padding-left:18px}.publicPlayerStats article{background:linear-gradient(145deg,rgba(34,16,25,.97),rgba(12,11,14,.99))}\n@media(max-width:650px){.spectatorHero{padding:20px 16px!important}.spectatorHeroCopy{max-width:100%!important}.spectatorHero p{max-width:290px!important}}\n'''
pub.write_text(pubc)
