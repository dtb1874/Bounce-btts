from pathlib import Path
import re

league = Path('app/LeagueApp.tsx')
s = league.read_text()

s = re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.4.8";', s, count=1)
s = re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "15 Aug 2026";', s, count=1)
s = s.replace('qnother user', 'another user')

picks_needle = '''  const picks=profiles.map(profile=>{\n    const prediction=predictions.find(p=>p.member_id===profile.id);\n    return {profile,prediction,fixture:fixtures.find(f=>f.id===prediction?.fixture_id)};\n  });\n  const finished=fixtures.filter(f=>finishedStatuses.includes(f.status));'''
picks_replacement = '''  const picks=profiles.map(profile=>{\n    const prediction=predictions.find(p=>p.member_id===profile.id);\n    return {profile,prediction,fixture:fixtures.find(f=>f.id===prediction?.fixture_id)};\n  });\n  const missingPicks=picks.filter(({prediction})=>!prediction).map(({profile})=>profile);\n  function remindMissingPicks(){\n    if(!gameweek||!missingPicks.length)return;\n    const names=missingPicks.map(p=>`• ${p.display_name}`).join("\\n");\n    const message=`⚽ BOUNCE BTTS LEAGUE — PICK REMINDER\\n\\nStill to make a pick for GW ${gameweek.number}:\\n${names}\\n\\nMake your BTTS pick here:\\nhttps://bounce-btts.vercel.app\\n\\nDeadline: ${formatKickoff(gameweek.locks_at)}`;\n    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");\n  }\n  const finished=fixtures.filter(f=>finishedStatuses.includes(f.status));'''
if picks_needle not in s:
    raise SystemExit('Could not locate dashboard picks setup')
s = s.replace(picks_needle, picks_replacement, 1)

intro_marker = '''    </div>\n\n    <div className={styles.dashboardStats}>'''
intro_replacement = '''    </div>\n\n    <div className="mobileDashboardActions" aria-label="Dashboard shortcuts">\n      <button onClick={()=>setView("pick")}><span>⚑</span><strong>{isOpen?"Make My Pick":"View My Pick"}</strong></button>\n      <button onClick={()=>setView("table")}><span>☷</span><strong>League Table</strong></button>\n      <button onClick={()=>document.getElementById("current-form")?.scrollIntoView({behavior:"smooth",block:"start"})}><span>↗</span><strong>Current Form</strong></button>\n      <button onClick={()=>document.getElementById("weekly-picks")?.scrollIntoView({behavior:"smooth",block:"start"})}><span>◉</span><strong>All Picks</strong></button>\n    </div>\n\n    <div className={styles.dashboardStats}>'''
if intro_marker not in s:
    raise SystemExit('Could not locate dashboard intro boundary')
s = s.replace(intro_marker, intro_replacement, 1)

weekly_open = '''        <article className={styles.panel}>\n          <div className={styles.panelHeading}>\n            <div><div className={styles.title}>GAMEWEEK PICKS & LIVE RESULTS</div><h3>Everyone at a glance</h3></div>'''
weekly_new = '''        <article id="weekly-picks" className={`${styles.panel} weeklyPicksPanel`}>\n          <div className={styles.panelHeading}>\n            <div><div className={styles.title}>GAMEWEEK PICKS & LIVE RESULTS</div><h3>Everyone at a glance</h3></div>'''
if weekly_open not in s:
    raise SystemExit('Could not locate weekly picks panel')
s = s.replace(weekly_open, weekly_new, 1)

weekly_actions_end = '''            </div>\n          </div>\n          <div className={styles.pickList}>'''
reminder_strip = '''            </div>\n          </div>\n          {isAdmin&&isOpen&&<div className="adminReminderStrip">\n            <div><strong>{missingPicks.length?`${missingPicks.length} still to pick`:"All picks are in ✓"}</strong>{missingPicks.length?<small>{missingPicks.map(p=>p.display_name).join(" · ")}</small>:<small>No reminder needed for this gameweek.</small>}</div>\n            {missingPicks.length>0&&<button type="button" className="adminReminderButton" onClick={remindMissingPicks}>Remind via WhatsApp</button>}\n          </div>}\n          <div className={styles.pickList}>'''
if weekly_actions_end not in s:
    raise SystemExit('Could not locate weekly picks action boundary')
s = s.replace(weekly_actions_end, reminder_strip, 1)

old_row = 'return <div className={styles.pickListRow} key={profile.id}>'
new_row = 'return <div className={`${styles.pickListRow} ${isAdmin&&!prediction?"adminMissingPickRow":""}`} key={profile.id}>'
if old_row not in s:
    raise SystemExit('Could not locate weekly pick row')
s = s.replace(old_row, new_row, 1)

quick_old = '''        <article className={styles.panel}>\n          <div className={styles.title}>{isAdmin?"ADMIN SHORTCUTS":"QUICK LINKS"}</div>'''
quick_new = '''        <article className={`${styles.panel} mobileRedundantLinks`}>\n          <div className={styles.title}>{isAdmin?"ADMIN SHORTCUTS":"QUICK LINKS"}</div>'''
if quick_old not in s:
    raise SystemExit('Could not locate dashboard quick links')
s = s.replace(quick_old, quick_new, 1)

form_old = '<article className={`${styles.panel} ${styles.formPanel}`}>\n      <div className={styles.panelHeading}>'
form_new = '<article id="current-form" className={`${styles.panel} ${styles.formPanel}`}>\n      <div className={styles.panelHeading}>'
if form_old not in s:
    raise SystemExit('Could not locate dashboard form panel')
s = s.replace(form_old, form_new, 1)

release_needle = 'const releases=[\n    {version:"1.4.7.9"'
release_replacement = 'const releases=[\n    {version:"1.4.8",date:"15 Aug 2026",summary:"Admin pick reminders and mobile member cleanup",changes:["Admins can send a WhatsApp pick reminder directly from the Dashboard weekly-picks section; only members still missing a current-gameweek pick are listed and the message includes the Bounce link and deadline","Mobile Dashboard now prioritises Make My Pick, League Table, Current Form and All Picks while retaining every existing feature through the menu","Mobile stats, pick rows, results and collapsible fixture groups have cleaner spacing and touch targets, with duplicate shortcut clutter reduced","Maroon/gold and Heart of Midlothian pavement-mosaic styling is reinforced across the mobile experience","Fixed the old emulation fallback typo and cleaned the remaining public-table flex alignment warning","Automated outbound WhatsApp reminders remain deliberately shelved"]},\n    {version:"1.4.7.9"'
if release_needle not in s:
    raise SystemExit('Could not locate v1.4.7.9 release history entry')
s = s.replace(release_needle, release_replacement, 1)
league.write_text(s)

css = Path('app/globals.css')
g = css.read_text()
marker = '/* v1.4.8 reminder + mobile cleanup */'
if marker not in g:
    g += r'''

/* v1.4.8 reminder + mobile cleanup */
.mobileDashboardActions{display:none}
.adminReminderStrip{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px;padding:10px 12px;border:1px solid rgba(214,181,143,.35);border-left:4px solid #d6b58f;border-radius:11px;background:linear-gradient(90deg,rgba(116,32,52,.38),rgba(26,18,23,.94));box-shadow:0 8px 22px rgba(0,0,0,.14)}
.adminReminderStrip strong{display:block;color:#f0dcc7;font:700 15px Georgia,serif}.adminReminderStrip small{display:block;margin-top:3px;color:#c2aa96;font-size:11px;line-height:1.35}
.adminReminderButton{flex:0 0 auto;border:1px solid #d6b58f;border-radius:9px;padding:8px 11px;background:linear-gradient(180deg,#7d2941,#5e182d);color:#f4d9a9;font-size:11px;font-weight:900;cursor:pointer;box-shadow:0 6px 16px rgba(70,16,35,.28)}
.adminReminderButton:hover{background:linear-gradient(180deg,#8c304a,#6b1d34)}
.adminMissingPickRow{margin:0 -6px;padding-left:6px!important;padding-right:6px!important;border-left:3px solid #d6b58f;background:linear-gradient(90deg,rgba(116,32,52,.2),transparent 72%)}

@media(max-width:650px){
  .mobileDashboardActions{display:grid;grid-template-columns:1fr 1fr;gap:7px;order:1}
  .mobileDashboardActions button{min-height:48px;display:flex;align-items:center;gap:8px;border:1px solid rgba(214,181,143,.34);border-radius:11px;padding:9px 10px;background:linear-gradient(145deg,rgba(105,29,49,.88),rgba(43,17,26,.96));color:#f0dfcd;text-align:left;font-weight:900;box-shadow:0 8px 20px rgba(0,0,0,.16)}
  .mobileDashboardActions button span{display:grid;place-items:center;width:25px;height:25px;border-radius:7px;background:rgba(214,181,143,.12);color:#e5bf87;font-size:14px}.mobileDashboardActions button strong{font-size:11px;line-height:1.15}
  .dashboardIntro{order:0}.dashboardStats{order:2}.dashboardMain,.dashboardPrimary,.dashboardSide{display:contents!important}.pickPanel{order:3}.tablePreview{order:4}.formPanel{order:5}.weeklyPicksPanel{order:6}.mobileRedundantLinks{display:none!important}
  .dashboardStats{display:flex!important;overflow-x:auto;gap:8px;padding:0 0 3px;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;scrollbar-width:none}.dashboardStats::-webkit-scrollbar{display:none}.dashboardStats .statCard{flex:0 0 138px;min-height:68px;scroll-snap-align:start}.dashboardStats .statCard strong{font-size:20px}
  .dashboardIntro{padding:13px 14px!important}.dashboardIntro h2{font-size:24px!important}.dashboardIntro p{padding-right:0!important;max-width:84%;font-size:11px!important}.dashboardArt{opacity:.36!important}
  .panelHeading{gap:8px}.panelHeading>div:first-child{min-width:0}.panelHeading h3{font-size:18px}.panelHeading .shareHeaderActions{flex:0 0 auto;gap:6px}
  .weeklyPicksPanel .panelHeading{align-items:flex-start}.weeklyPicksPanel .shareHeaderActions{max-width:142px}
  .adminReminderStrip{align-items:stretch;flex-direction:column;margin:0 0 10px;padding:9px 10px}.adminReminderStrip small{font-size:10px}.adminReminderButton{width:100%;min-height:40px}
  .pickListRow{border-radius:8px}.adminMissingPickRow{margin:0;padding-left:7px!important;padding-right:7px!important}
  .fixtureDetails>summary,.fixtureDetailsNested>summary,.fixtureDetailsLeague>summary{min-height:44px;box-sizing:border-box}.fixtureDetails .row button,.fixtureDetailsNested .row button,.fixtureDetailsLeague .row button{grid-column:1/-1;width:100%;min-height:38px;margin-top:2px}.fixtureDetailsNested .row:has(button),.fixtureDetailsLeague .row:has(button){grid-template-columns:58px minmax(0,1fr) 48px!important}
  .resultRow{grid-template-columns:minmax(0,1fr) 58px!important;gap:5px 9px!important;padding:11px 0!important}.resultRow>:nth-child(1),.resultRow>:nth-child(2){grid-column:1}.resultRow>:nth-child(3){grid-column:2;grid-row:1/3}.resultRow>:nth-child(4),.resultRow>:nth-child(5){grid-column:1/-1;text-align:left!important;font-size:11px}
  .formPanel .panelHeading{display:grid;grid-template-columns:1fr}.formPanel .shareHeaderActions{width:100%;justify-content:space-between}.formPanel .shareHeaderActions select{flex:1;min-width:0}.formPanel .shareCompactWhatsApp{flex:0 0 128px}
  .panel::after{opacity:.05!important;background-position:center!important}.dashboardIntro::before{opacity:.045!important}
}
'''
    css.write_text(g)
