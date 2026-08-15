from pathlib import Path
import re

league=Path('app/LeagueApp.tsx')
s=league.read_text()
s=re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.4.9.4";', s, count=1)
s=re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "15 Aug 2026";', s, count=1)

s=s.replace('type View = "dashboard" | "pick" | "fixtures" | "table" | "results" | "history" | "players" | "about" | "alerts" | "admin";', 'type View = "dashboard" | "pick" | "fixtures" | "table" | "results" | "combined" | "history" | "players" | "about" | "alerts" | "admin";',1)
s=s.replace('import FinalResultsShareButton from "./FinalResultsShareButton";', 'import CombinedShareButton from "./CombinedShareButton";',1)

# Rebuild the post-release Weekly Picks share button around the common fixture renderer.
weekly=Path('app/WeeklyPicksShareButton.tsx')
weekly.write_text('''"use client";\n\nimport { useState } from "react";\nimport { createFixtureShareImage, type FixtureSharePick } from "./FixtureShareImage";\n\ntype Props={gameweekNumber:number;seasonLabel:string;picks:FixtureSharePick[];disabled?:boolean};\n\nexport default function WeeklyPicksShareButton({gameweekNumber,seasonLabel,picks,disabled=false}:Props){\n  const [busy,setBusy]=useState(false);\n  async function share(){\n    if(disabled||busy)return;\n    setBusy(true);\n    try{\n      const file=await createFixtureShareImage(gameweekNumber,seasonLabel,picks);\n      const data:ShareData={title:`Bounce BTTS GW${gameweekNumber} fixtures`,text:`Bounce BTTS League — GW${gameweekNumber} selected fixtures`,files:[file]};\n      const nav=navigator as Navigator&{canShare?:(data:ShareData)=>boolean};\n      if(navigator.share&&(!nav.canShare||nav.canShare({files:[file]})))await navigator.share(data);\n      else{const url=URL.createObjectURL(file);const a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}\n    }finally{setBusy(false)}\n  }\n  return <button className="dashboardGoldAction" type="button" onClick={share} disabled={disabled||busy}>{busy?"Creating…":"Share fixtures"}</button>\n}\n''')

# Replace the mixed action cluster with four equal gold actions for all users.
start=s.find('<div className="shareHeaderActions">', s.find('GAMEWEEK PICKS & LIVE RESULTS'))
end=s.find('</div>', start)
if start<0 or end<0: raise SystemExit('Could not locate Weekly Picks action cluster')
old=s[start:end+6]
picks_expr='picks.filter(p=>p.fixture).map(p=>({player:p.profile.display_name,homeTeam:p.fixture!.home_team,awayTeam:p.fixture!.away_team,competition:competitionDisplayName(p.fixture!),kickoffAt:p.fixture!.kickoff_at,odds:p.fixture!.odds_fractional,status:p.fixture!.status,homeScore:p.fixture!.home_score,awayScore:p.fixture!.away_score,elapsed:p.fixture!.live_elapsed??null}))'
new=f'''<div className="dashboardActionGrid">\n              <button type="button" className="dashboardGoldAction" onClick={{onLiveRefresh}} disabled={{liveRefreshing}}>{{liveRefreshing?"Refreshing…":"Fixture refresh"}}</button>\n              <button type="button" className="dashboardGoldAction" onClick={{()=>setView("combined")}}>Combined results</button>\n              <WeeklyPicksShareButton disabled={{!gameweek}} gameweekNumber={{gameweek?.number??0}} seasonLabel={{seasonLabel}} picks={{{picks_expr}}}/>\n              <CombinedShareButton disabled={{!gameweek}} gameweekNumber={{gameweek?.number??0}} seasonLabel={{seasonLabel}} picks={{{picks_expr}}} standings={{standings}}/>\n            </div>'''
s=s[:start]+new+s[end+6:]

# Add a dedicated combined results view: selected fixtures with current live/final state plus the league table.
combined=r'''function CombinedResultsPage({gameweek,fixtures,predictions,profiles,standings,seasonLabel,entryFee}:{gameweek:Gameweek|null;fixtures:Fixture[];predictions:Prediction[];profiles:Profile[];standings:Standing[];seasonLabel:string;entryFee:number}){
  const selected=predictions.map(p=>({prediction:p,fixture:fixtures.find(f=>f.id===p.fixture_id),profile:profiles.find(pr=>pr.id===p.member_id)})).filter((x):x is {prediction:Prediction;fixture:Fixture;profile:Profile}=>Boolean(x.fixture&&x.profile));
  return <section className="combinedResultsPage"><Heading eyebrow={gameweek?`GAMEWEEK ${gameweek.number}`:"RESULTS"} title="Combined Results"><p>Selected fixtures and the current league table together.</p></Heading><div className={`${styles.panel} combinedResultsFixtures`}><div className={styles.title}>SELECTED FIXTURES</div>{selected.map(({prediction,fixture,profile})=>{const outcome=outcomeLabel(fixture.home_score,fixture.away_score,fixture.status,prediction.points_awarded);return <div className={styles.resultRow} key={prediction.id}><strong>{profile.display_name}</strong><span>{fixture.home_team} v {fixture.away_team}</span><b className={styles.score}>{fixture.home_score==null?"—":`${fixture.home_score}-${fixture.away_score}`}</b><span>{fixtureStatusLabel(fixture)}</span><span className={outcome.tone==="good"?styles.statusGood:outcome.tone==="warn"?styles.statusWarn:outcome.tone==="bad"?styles.statusBad:styles.statusNeutral}>{outcome.label} {outcome.points!=null?`(${outcome.points>0?"+":""}${outcome.points})`:""}</span></div>})}{!selected.length&&<div className={styles.notice}>No selected fixtures yet.</div>}</div><div className={`${styles.panel} ${styles.table} ${styles.fullLeagueTable} ${styles.enhancedTableShell} combinedResultsTable`}><div className={`${styles.tableRow} ${styles.header}`}><span>POS</span><span>PLAYER</span><span>P</span><span>W</span><span>S-N</span><span>0-0</span><span>PTS</span></div>{standings.map((r,i)=><div key={r.id} className={`${styles.tableRow} ${i===0?styles.leader:""} ${i<3?styles.tableRowTopThree:""}`}><span className={styles.positionCell}>{i===0?"🏆":i+1}</span><strong>{r.name}</strong><span>{r.played}</span><span>{r.wins}</span><span>{r.oneSided}</span><span>{r.zeroZeroCount}</span><b>{r.points}</b></div>)}</div><div className="combinedResultsMeta">Season {seasonLabel} · Prize pot £{(standings.length*entryFee).toFixed(0)}</div></section>
}

'''
marker='function ResultsPage('
idx=s.find(marker)
if idx<0: raise SystemExit('Could not locate ResultsPage')
s=s[:idx]+combined+s[idx:]

render='''        {view==="results" && <ResultsPage gameweek={gameweek??null} fixtures={currentFixtures} predictions={currentPredictions} profiles={profiles} onRefresh={()=>refreshLiveData(false)}/>}'''
replacement=render+'\n        {view==="combined" && <CombinedResultsPage gameweek={gameweek??null} fixtures={currentFixtures} predictions={currentPredictions} profiles={profiles} standings={standings} seasonLabel={seasonLabel} entryFee={entryFee}/>}'
if render not in s: raise SystemExit('Could not locate ResultsPage render')
s=s.replace(render,replacement,1)

# v1.4.9.4 release history.
needle='const releases=[\n    {version:"1.4.9.3"'
replacement='const releases=[\n    {version:"1.4.9.4",date:"15 Aug 2026",summary:"Dashboard action grid and unified fixture sharing",changes:["The Weekly Picks action area is now a clean 2×2 grid of equal gold controls: Fixture refresh, Combined results, Share fixtures and Share combined table / fixtures","Combined results opens a single view containing the selected fixtures with current live/final outcomes plus the current league table","Share fixtures and Share combined table / fixtures use the exact same fixture renderer, so scores, elapsed status and BTTS outcome colours are identical in both images","Green indicates BTTS winning/won, amber score-nil, red 0-0 and grey pending","The previous mixed Results / Share final results / All Picks In / Refresh button layout has been removed from this action area"]},\n    {version:"1.4.9.3"'
if needle not in s: raise SystemExit('Could not locate v1.4.9.3 release entry')
s=s.replace(needle,replacement,1)
league.write_text(s)

css=Path('app/globals.css')
g=css.read_text()
marker='/* v1.4.9.4 unified dashboard actions */'
if marker not in g:
    g += r'''

/* v1.4.9.4 unified dashboard actions */
.dashboardActionGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:310px;max-width:100%}.dashboardGoldAction{width:100%!important;min-width:0!important;height:48px!important;min-height:48px!important;padding:7px 10px!important;border:1px solid #f4d58d!important;border-radius:11px!important;background:linear-gradient(180deg,#f6d98d,#d9aa48 62%,#bf8731)!important;color:#421421!important;font-size:12px!important;font-weight:900!important;line-height:1.08!important;text-align:center!important;display:flex!important;align-items:center!important;justify-content:center!important;box-shadow:0 6px 16px rgba(191,135,49,.22)!important;white-space:normal!important}.dashboardGoldAction:disabled{opacity:.58!important;filter:saturate(.55)!important;cursor:not-allowed!important}.combinedResultsPage{display:grid;gap:14px}.combinedResultsFixtures .resultRow{align-items:center}.combinedResultsMeta{font-size:12px;color:#b9a594;text-align:right;padding:0 4px}@media(max-width:650px){.weeklyPicksPanel .panelHeading{grid-template-columns:minmax(0,1fr) 204px!important}.weeklyPicksPanel .dashboardActionGrid{width:204px!important;grid-template-columns:99px 99px!important;gap:6px!important}.weeklyPicksPanel .dashboardGoldAction{width:99px!important;height:42px!important;min-height:42px!important;padding:5px 6px!important;font-size:9.5px!important;border-radius:9px!important}.combinedResultsPage .resultRow{grid-template-columns:minmax(86px,.8fr) minmax(145px,1.5fr) 48px 48px minmax(88px,.8fr)!important;font-size:10px!important}}
'''
    css.write_text(g)
