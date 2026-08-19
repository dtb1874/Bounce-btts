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
  const upcomingGameweek = [...gameweeks]
    .filter(g => Boolean(g.opens_at) && new Date(g.opens_at as string).getTime() > dashboardNow)
    .sort((a,b) => new Date(a.opens_at as string).getTime() - new Date(b.opens_at as string).getTime())[0] ?? null;
  const timingTarget = isOpen && gameweek ? {gameweek, mode:"LOCKS" as const, value:gameweek.locks_at} : upcomingGameweek?.opens_at ? {gameweek:upcomingGameweek, mode:"OPENS" as const, value:upcomingGameweek.opens_at} : null;
  const timingText = timingTarget ? `GW ${timingTarget.gameweek.number} ${timingTarget.mode} · ${new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(timingTarget.value)).replace(",","").replace(","," ·").toUpperCase()}` : null;
'''
if old_status not in league:
    raise SystemExit("Dashboard status anchor not found")
league = league.replace(old_status, new_status, 1)

anchor = '    <div className="mobileDashboardActions" aria-label="Dashboard shortcuts">'
insert = '    {timingText&&<div className="dashboardGameweekTiming" aria-live="polite">{timingText}</div>}\n\n' + anchor
if anchor not in league:
    raise SystemExit("Dashboard actions anchor not found")
league = league.replace(anchor, insert, 1)

marker = "/* dashboard-dynamic-gameweek-status-20260819 */"
if marker not in globals_css:
    globals_css += r'''

/* dashboard-dynamic-gameweek-status-20260819 */
.dashboardGameweekTiming{
  display:flex;
  align-items:center;
  justify-content:center;
  min-height:34px;
  padding:6px 12px 4px;
  color:#e6c36f;
  font-size:12px;
  font-weight:900;
  letter-spacing:.085em;
  text-align:center;
  text-transform:uppercase;
}
@media(max-width:650px){
  .dashboardGameweekTiming{
    min-height:42px!important;
    padding:10px 8px 6px!important;
    font-size:11px!important;
    line-height:1.1!important;
    letter-spacing:.07em!important;
  }
}
'''

league_path.write_text(league)
globals_path.write_text(globals_css)
print("Added dynamic dashboard GW locks/opens status line")
