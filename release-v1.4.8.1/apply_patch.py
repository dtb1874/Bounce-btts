from pathlib import Path
import re

league = Path('app/LeagueApp.tsx')
s = league.read_text()

s = re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.4.8.1";', s, count=1)
s = re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "15 Aug 2026";', s, count=1)

old = '''          {isAdmin&&isOpen&&<div className="adminReminderStrip">\n            <div><strong>{missingPicks.length?`${missingPicks.length} still to pick`:"All picks are in ✓"}</strong>{missingPicks.length?<small>{missingPicks.map(p=>p.display_name).join(" · ")}</small>:<small>No reminder needed for this gameweek.</small>}</div>\n            {missingPicks.length>0&&<button type="button" className="adminReminderButton" onClick={remindMissingPicks}>Remind via WhatsApp</button>}\n          </div>}'''
new = '''          {isAdmin&&<div className={`adminReminderStrip ${(!isOpen||!missingPicks.length)?"adminReminderInactive":""}`}>\n            <div><strong>{missingPicks.length?`${missingPicks.length} still to pick`:"All picks are in ✓"}</strong>{missingPicks.length?<small>{missingPicks.map(p=>p.display_name).join(" · ")}</small>:<small>No reminder needed for this gameweek.</small>}</div>\n            <button type="button" className="adminReminderButton" onClick={remindMissingPicks} disabled={!isOpen||!missingPicks.length}>{!missingPicks.length?"All picks in ✓":isOpen?"Remind via WhatsApp":"Reminders closed"}</button>\n          </div>}'''
if old not in s:
    raise SystemExit('Could not locate v1.4.8 reminder strip')
s = s.replace(old, new, 1)

needle = 'const releases=[\n    {version:"1.4.8"'
replacement = 'const releases=[\n    {version:"1.4.8.1",date:"15 Aug 2026",summary:"Condensed admin mobile dashboard and persistent reminder control",changes:["Admin Dashboard reminder control now remains visible at all times in the Weekly Picks section","When all picks are submitted the reminder remains visible in a faded disabled state showing All picks in","Closed gameweeks keep the reminder visible but non-selectable","Mobile admin Dashboard intro and summary area are substantially condensed","Weekly Picks and the current League Table now sit immediately after the four primary mobile shortcuts, ahead of lower-priority dashboard detail"]},\n    {version:"1.4.8"'
if needle not in s:
    raise SystemExit('Could not locate v1.4.8 release history entry')
s = s.replace(needle, replacement, 1)
league.write_text(s)

css = Path('app/globals.css')
g = css.read_text()
marker = '/* v1.4.8.1 admin dashboard hierarchy hotfix */'
if marker not in g:
    g += r'''

/* v1.4.8.1 admin dashboard hierarchy hotfix */
.adminReminderButton:disabled{opacity:.42;filter:saturate(.45);cursor:not-allowed;box-shadow:none}
.adminReminderInactive{opacity:.72}
@media(max-width:650px){
  .dashboardIntro{order:0!important;min-height:72px!important;padding:10px 12px!important;border-radius:14px!important}
  .dashboardIntro .eyebrow{font-size:9px!important;letter-spacing:.08em!important}
  .dashboardIntro h2{font-size:19px!important;line-height:1.05!important;margin:4px 0 0!important;max-width:82%!important}
  .dashboardIntro p{display:none!important}
  .dashboardArt{right:4px!important;bottom:1px!important;width:58px!important;height:58px!important;opacity:.48!important}
  .dashboardArt img:first-child{display:none!important}
  .dashboardArt img:last-child{width:54px!important;height:58px!important}
  .mobileDashboardActions{order:1!important}
  .weeklyPicksPanel{order:2!important}
  .tablePreview{order:3!important}
  .pickPanel{order:4!important}
  .formPanel{order:5!important}
  .dashboardStats{order:6!important;margin-top:0!important}
  .dashboardStats .statCard{flex-basis:124px!important;min-height:60px!important;padding:9px!important}
  .dashboardStats .statCard span{font-size:9px!important}
  .dashboardStats .statCard strong{font-size:18px!important}
  .dashboardStats .statCard small{font-size:8px!important}
}
'''
    css.write_text(g)
