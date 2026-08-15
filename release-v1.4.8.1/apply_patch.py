from pathlib import Path
import re

league = Path('app/LeagueApp.tsx')
s = league.read_text()

s = re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.4.8.1";', s, count=1)
s = re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "15 Aug 2026";', s, count=1)

old_actions = '''              <WeeklyPicksShareButton disabled={!gameweek} gameweekNumber={gameweek?.number??0} seasonLabel={seasonLabel} picks={picks.filter(p=>p.fixture).map(p=>({player:p.profile.display_name,homeTeam:p.fixture!.home_team,awayTeam:p.fixture!.away_team,competition:competitionDisplayName(p.fixture!),kickoffAt:p.fixture!.kickoff_at,odds:p.fixture!.odds_fractional}))}/>\n            </div>'''
new_actions = '''              <WeeklyPicksShareButton disabled={!gameweek} gameweekNumber={gameweek?.number??0} seasonLabel={seasonLabel} picks={picks.filter(p=>p.fixture).map(p=>({player:p.profile.display_name,homeTeam:p.fixture!.home_team,awayTeam:p.fixture!.away_team,competition:competitionDisplayName(p.fixture!),kickoffAt:p.fixture!.kickoff_at,odds:p.fixture!.odds_fractional}))}/>\n              {isAdmin&&<button type="button" className="adminReminderButton adminReminderHeaderButton" onClick={remindMissingPicks} disabled={!isOpen||!missingPicks.length} aria-label={missingPicks.length?`Remind ${missingPicks.length} missing picks via WhatsApp`:"All picks are in"}>{missingPicks.length?"Remind Picks":"All Picks In ✓"}</button>}\n            </div>'''
if old_actions not in s:
    raise SystemExit('Could not locate weekly share actions')
s = s.replace(old_actions, new_actions, 1)

old_strip = '''          {isAdmin&&isOpen&&<div className="adminReminderStrip">\n            <div><strong>{missingPicks.length?`${missingPicks.length} still to pick`:"All picks are in ✓"}</strong>{missingPicks.length?<small>{missingPicks.map(p=>p.display_name).join(" · ")}</small>:<small>No reminder needed for this gameweek.</small>}</div>\n            {missingPicks.length>0&&<button type="button" className="adminReminderButton" onClick={remindMissingPicks}>Remind via WhatsApp</button>}\n          </div>}\n'''
if old_strip not in s:
    raise SystemExit('Could not locate v1.4.8 reminder strip')
s = s.replace(old_strip, '', 1)

needle = 'const releases=[\n    {version:"1.4.8"'
replacement = 'const releases=[\n    {version:"1.4.8.1",date:"15 Aug 2026",summary:"Condensed admin mobile dashboard and persistent reminder action",changes:["Admin Dashboard reminder now sits directly beside the Weekly Picks Share to WhatsApp control","The reminder stays visible for admins at all times and fades into a disabled All Picks In state when no reminder is required or the gameweek is closed","Weekly Picks share and reminder controls are reduced and aligned together on mobile","Mobile admin Dashboard intro and summary area are substantially condensed","Weekly Picks and the current League Table now appear immediately after the four primary mobile shortcuts, ahead of lower-priority dashboard detail"]},\n    {version:"1.4.8"'
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
.adminReminderHeaderButton{min-width:112px;min-height:40px;padding:7px 10px}
.adminReminderButton:disabled{opacity:.38;filter:saturate(.35);cursor:not-allowed;box-shadow:none}
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
  .weeklyPicksPanel .panelHeading{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:start!important}
  .weeklyPicksPanel .shareHeaderActions{max-width:204px!important;width:204px!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:6px!important}
  .weeklyPicksPanel .shareHeaderActions>.button{grid-column:1/-1!important;justify-self:end!important;width:auto!important;min-height:36px!important;padding:6px 10px!important}
  .weeklyPicksPanel .shareCompactWhatsApp,.weeklyPicksPanel .adminReminderHeaderButton{width:99px!important;min-width:99px!important;max-width:99px!important;min-height:38px!important;padding:6px 7px!important;font-size:10px!important;line-height:1.05!important}
}
'''
    css.write_text(g)
