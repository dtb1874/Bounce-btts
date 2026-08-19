from pathlib import Path

league_path = Path("app/LeagueApp.tsx")
globals_path = Path("app/globals.css")
league = league_path.read_text()
globals_css = globals_path.read_text()

# Dashboard already re-renders from the app's existing 30-second clock, so use
# Date.now() locally and avoid changing the established Dashboard prop contract.
old_status = '''  const statusText = !gameweek ? "No gameweek selected" :
    gameweek.status==="complete" ? "Gameweek complete" :
    isOpen ? "Selections open" : "Selections closed";
'''
new_status = '''  const statusText = !gameweek ? "No gameweek selected" :
    gameweek.status==="complete" ? "Gameweek complete" :
    isOpen ? "Selections open" : "Selections closed";

  const dashboardNow = Date.now();
  const selectedOpensAt = gameweek?.opens_at ? new Date(gameweek.opens_at).getTime() : null;
  const selectedLocksAt = gameweek?.locks_at ? new Date(gameweek.locks_at).getTime() : null;
  const timingTarget = !gameweek ? null :
    selectedOpensAt!==null && dashboardNow < selectedOpensAt
      ? {gameweek, mode:"Opens" as const, value:gameweek.opens_at as string}
      : selectedLocksAt!==null && dashboardNow < selectedLocksAt
        ? {gameweek, mode:"Locks" as const, value:gameweek.locks_at}
        : null;
  const timingText = timingTarget ? (()=>{
    const parts = new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",weekday:"short",day:"2-digit",month:"2-digit",hour:"numeric",minute:"2-digit",hour12:true}).formatToParts(new Date(timingTarget.value));
    const part=(type:string)=>parts.find(p=>p.type===type)?.value??"";
    const minute=part("minute"), hour=part("hour"), period=part("dayPeriod").toLowerCase();
    const clock=minute==="00"?`${hour}${period}`:`${hour}:${minute}${period}`;
    return `GW ${timingTarget.gameweek.number} ${timingTarget.mode} ${part("weekday")} ${clock} ${part("day")}/${part("month")}`;
  })() : null;
'''
if old_status not in league:
    raise SystemExit("Dashboard status anchor not found")
league = league.replace(old_status, new_status, 1)

anchor = '''            <div className="weeklyPicksHeading"><h3>Everyone at a glance</h3><div className={styles.title}>GAMEWEEK PICKS & LIVE RESULTS</div></div>
            <div className="dashboardActionGrid">'''
insert = '''            <div className="weeklyPicksHeading"><div className="weeklyPicksTitleRow"><h3>Everyone at a glance</h3>{timingText&&<span className={`${styles.title} dashboardGameweekTiming`} aria-live="polite">{timingText}</span>}</div><div className={styles.title}>GAMEWEEK PICKS & LIVE RESULTS</div></div>
            <div className="dashboardActionGrid">'''
if anchor not in league:
    raise SystemExit("Weekly picks heading/action anchor not found")
league = league.replace(anchor, insert, 1)

marker = "/* dashboard-dynamic-gameweek-status-20260819 */"
if marker not in globals_css:
    globals_css += r'''

/* dashboard-dynamic-gameweek-status-20260819 */
.weeklyPicksTitleRow{
  display:flex;
  align-items:baseline;
  justify-content:space-between;
  gap:14px;
  width:100%;
}
.dashboardGameweekTiming{
  flex:0 0 auto;
  color:#e6c36f!important;
  font-weight:900!important;
  text-align:right;
  white-space:nowrap;
  text-transform:none!important;
}
@media(max-width:650px){
  .weeklyPicksPanel .weeklyPicksTitleRow{
    gap:8px!important;
  }
  .weeklyPicksPanel .weeklyPicksTitleRow h3{
    min-width:0!important;
  }
  .weeklyPicksPanel .dashboardGameweekTiming{
    flex:0 0 auto!important;
    padding:0!important;
    margin:0!important;
    min-height:0!important;
    line-height:1!important;
    letter-spacing:.055em!important;
    white-space:nowrap!important;
  }
}
'''

league_path.write_text(league)
globals_path.write_text(globals_css)
print("Aligned compact dynamic GW timing to the selected gameweek opens/locks values")
