from pathlib import Path
import re

league=Path('app/LeagueApp.tsx')
s=league.read_text()
s=re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.4.9.3";', s, count=1)
s=re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "15 Aug 2026";', s, count=1)

# Final-results share component.
needle='import WeeklyPicksShareButton from "./WeeklyPicksShareButton";'
replacement=needle+'\nimport FinalResultsShareButton from "./FinalResultsShareButton";'
if needle not in s: raise SystemExit('Could not locate weekly share import')
s=s.replace(needle,replacement,1)

# Work out when every player has a settled result (including missed-pick adjustments)
# and prepare the share rows using the same scoring/outcome data as the dashboard.
needle='''  const finished=fixtures.filter(f=>finishedStatuses.includes(f.status));\n  const myStanding=standings.find(s=>s.id===myId);'''
replacement='''  const finished=fixtures.filter(f=>finishedStatuses.includes(f.status));\n  const finalResultsReady=Boolean(gameweek)&&!isOpen&&picks.length>0&&picks.every(({profile,prediction,fixture})=>prediction?Boolean(fixture&&finishedStatuses.includes(fixture.status)):allAdjustments.some(a=>a.gameweek_id===gameweek?.id&&a.member_id===profile.id));\n  const finalResultRows=picks.map(({profile,prediction,fixture})=>{\n    const adjustment=allAdjustments.find(a=>a.gameweek_id===gameweek?.id&&a.member_id===profile.id);\n    const outcome=fixture?outcomeLabel(fixture.home_score,fixture.away_score,fixture.status,prediction?.points_awarded??null):null;\n    return {player:profile.display_name,homeTeam:fixture?.home_team??null,awayTeam:fixture?.away_team??null,status:fixture?.status??null,homeScore:fixture?.home_score??null,awayScore:fixture?.away_score??null,points:prediction?.points_awarded??outcome?.points??adjustment?.points??null,outcome:outcome?.label??(adjustment?"MISSED PICK":"PENDING")};\n  });\n  const myStanding=standings.find(s=>s.id===myId);'''
if needle not in s: raise SystemExit('Could not locate Dashboard finished-fixtures block')
s=s.replace(needle,replacement,1)

# Add final-results sharing beside the existing weekly share action. It is visible to all
# roles but locked until every player has a settled result for that gameweek.
needle='''<WeeklyPicksShareButton disabled={!gameweek} gameweekNumber={gameweek?.number??0} seasonLabel={seasonLabel} picks={picks.filter(p=>p.fixture).map(p=>({player:p.profile.display_name,homeTeam:p.fixture!.home_team,awayTeam:p.fixture!.away_team,competition:competitionDisplayName(p.fixture!),kickoffAt:p.fixture!.kickoff_at,odds:p.fixture!.odds_fractional,status:p.fixture!.status,homeScore:p.fixture!.home_score,awayScore:p.fixture!.away_score,elapsed:p.fixture!.live_elapsed??null}))}/>'''
replacement=needle+'''\n              <FinalResultsShareButton disabled={!finalResultsReady} gameweekNumber={gameweek?.number??0} seasonLabel={seasonLabel} rows={finalResultRows}/>'''
if needle not in s: raise SystemExit('Could not locate live weekly share component')
s=s.replace(needle,replacement,1)

# Enhance the weekly picks image after the older compact-share patch has run.
weekly=Path('app/WeeklyPicksShareButton.tsx')
w=weekly.read_text()
needle='const liveStatuses=new Set(["1H","2H","ET","P","BT","INT"]);'
replacement=needle+'\nconst finishedStatuses=new Set(["FT","AET","PEN"]);\ntype PickState = "win" | "scoreNil" | "zeroZero" | "pending";'
if needle not in w: raise SystemExit('Could not locate weekly live status set')
w=w.replace(needle,replacement,1)
needle='''function liveLabel(pick:WeeklyPick){\n  const status=pick.status??"";\n  if(pick.homeScore==null||pick.awayScore==null)return "";\n  if(liveStatuses.has(status))return `${pick.homeScore}–${pick.awayScore} · ${pick.elapsed!=null?`${pick.elapsed}′`:status}`;\n  if(status==="HT")return `${pick.homeScore}–${pick.awayScore} · HT`;\n  if(["FT","AET","PEN"].includes(status))return `${pick.homeScore}–${pick.awayScore} · ${status}`;\n  return "";\n}\n'''
replacement='''function liveLabel(pick:WeeklyPick){\n  const status=pick.status??"";\n  if(pick.homeScore==null||pick.awayScore==null)return "";\n  if(liveStatuses.has(status))return `${pick.homeScore}–${pick.awayScore} · ${pick.elapsed!=null?`${pick.elapsed}′`:status}`;\n  if(status==="HT")return `${pick.homeScore}–${pick.awayScore} · HT`;\n  if(finishedStatuses.has(status))return `${pick.homeScore}–${pick.awayScore} · ${status}`;\n  return "";\n}\nfunction pickState(pick:WeeklyPick):{text:string;state:PickState}{\n  const finished=finishedStatuses.has(pick.status??"");\n  const home=pick.homeScore,away=pick.awayScore;\n  if(home==null||away==null)return {text:"PENDING",state:"pending"};\n  if(home===0&&away===0)return {text:finished?"0-0  -1":"0-0 LIVE",state:"zeroZero"};\n  if(home>0&&away>0)return {text:finished?"WON  +3":"WINNING",state:"win"};\n  return {text:finished?"SCORE-NIL  +1":"SCORE-NIL LIVE",state:"scoreNil"};\n}\nfunction stateColours(state:PickState){\n  if(state==="win")return {fill:"#1f7a45",stroke:"#67c58a",text:"#f2fff6"};\n  if(state==="scoreNil")return {fill:"#8b5b16",stroke:"#d6a54c",text:"#fff6df"};\n  if(state==="zeroZero")return {fill:"#7c2031",stroke:"#d05c72",text:"#fff1f4"};\n  return {fill:"#41434a",stroke:"#747984",text:"#edf0f5"};\n}\n'''
if needle not in w: raise SystemExit('Could not locate weekly live label')
w=w.replace(needle,replacement,1)
w=w.replace('`${pick.homeTeam} v ${pick.awayTeam}`.slice(0,48)','`${pick.homeTeam} v ${pick.awayTeam}`.slice(0,42)',1)
w=w.replace('live||pick.competition.slice(0,52)','live||pick.competition.slice(0,42)',1)
needle='''    const kickoff=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",weekday:"short",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(pick.kickoffAt)); ctx.fillText(kickoff,82,y+74);\n    ctx.fillStyle="#c5ad96";ctx.font="700 17px Arial,sans-serif";ctx.fillText("BTTS",1010,y+32);'''
replacement='''    const kickoff=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",weekday:"short",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(pick.kickoffAt)); ctx.fillText(kickoff,82,y+74);\n    const outcome=pickState(pick),colours=stateColours(outcome.state);\n    ctx.fillStyle=colours.fill;ctx.strokeStyle=colours.stroke;ctx.lineWidth=1.5;roundedRect(ctx,795,y+52,190,31,15);ctx.fill();ctx.stroke();\n    ctx.fillStyle=colours.text;ctx.font="800 14px Arial,sans-serif";ctx.textAlign="center";ctx.fillText(outcome.text,890,y+73);ctx.textAlign="left";\n    ctx.fillStyle="#c5ad96";ctx.font="700 17px Arial,sans-serif";ctx.fillText("BTTS",1010,y+32);'''
if needle not in w: raise SystemExit('Could not locate weekly image score row')
w=w.replace(needle,replacement,1)
w=w.replace('Live scores reflect the latest in-app refresh.','Live score and BTTS status reflect the latest in-app refresh.',1)
weekly.write_text(w)

# Make the existing Dashboard league-table share action explicit rather than generic.
share_table=Path('app/ShareTableButton.tsx')
t=share_table.read_text()
t=t.replace('{busy ? "Creating…" : "Share to WhatsApp"}','{busy ? "Creating…" : "Share league table"}')
share_table.write_text(t)

# Release history.
needle='const releases=[\n    {version:"1.4.9.2"'
replacement='const releases=[\n    {version:"1.4.9.3",date:"15 Aug 2026",summary:"Outcome-highlighted shares plus Dashboard final-result and table sharing",changes:["Shared Weekly Picks images now colour-code each BTTS selection state: green when BTTS is winning/won, amber for score-nil, red for 0-0 and grey while pending","Finished picks show their scoring outcome directly in the shared image, including WON +3, SCORE-NIL +1 and 0-0 -1","The Dashboard now includes a Share final results action for all users; it unlocks automatically once every player has a settled fixture result or missed-pick adjustment","The existing Dashboard league-table snapshot control is now labelled clearly as Share league table","Final Results sharing uses the same settled scores, outcome labels and points already used by the league"]},\n    {version:"1.4.9.2"'
if needle not in s: raise SystemExit('Could not locate v1.4.9.2 release entry')
s=s.replace(needle,replacement,1)
league.write_text(s)

css=Path('app/globals.css')
g=css.read_text()
marker='/* v1.4.9.3 dashboard share controls */'
if marker not in g:
    g += r'''

/* v1.4.9.3 dashboard share controls */
.dashboardFinalResultsShareButton{display:inline-flex;align-items:center;gap:7px;min-height:40px;padding:7px 10px;border:1px solid rgba(215,178,125,.48);border-radius:10px;background:linear-gradient(180deg,#6d2339,#501728);color:#f4e5d6;cursor:pointer}
.dashboardFinalResultsShareButton span{font-size:14px}.dashboardFinalResultsShareButton strong{font-size:12px;white-space:nowrap}.dashboardFinalResultsShareButton small{display:none}.dashboardFinalResultsShareButton:disabled{opacity:.45;cursor:not-allowed}
@media(max-width:650px){.weeklyPicksPanel .dashboardFinalResultsShareButton{min-height:38px!important;padding:6px 7px!important;font-size:10px!important}.weeklyPicksPanel .dashboardFinalResultsShareButton strong{font-size:10px!important}.tablePreview .tableShareControl.compact button{font-size:10px!important;padding:6px 8px!important;min-height:34px!important}}
'''
    css.write_text(g)
