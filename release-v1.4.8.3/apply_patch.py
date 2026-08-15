from pathlib import Path
import re

league=Path('app/LeagueApp.tsx')
s=league.read_text()
s=re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.4.8.3";', s, count=1)
s=re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "15 Aug 2026";', s, count=1)
needle='const releases=[\n    {version:"1.4.8.2"'
replacement='const releases=[\n    {version:"1.4.8.3",date:"15 Aug 2026",summary:"Denser mobile shortcuts, status strip and form view",changes:["The four primary Dashboard shortcuts now fit in one compact horizontal row on mobile with no horizontal scrolling","The compact position/gameweek/selections/prize/admin status strip now sits directly below the shortcuts and fits in one row","Weekly Picks and the current League Table remain immediately below the compact top controls","Current Form no longer uses a horizontally scrolling spreadsheet layout on mobile","Mobile form rows now show each player with tightly packed coloured result icons, removing oversized gameweek spacing while retaining the richer desktop table"]},\n    {version:"1.4.8.2"'
if needle not in s:
    raise SystemExit('Could not locate v1.4.8.2 release history entry')
s=s.replace(needle,replacement,1)
league.write_text(s)

css=Path('app/globals.css')
g=css.read_text()
marker='/* v1.4.8.3 dense mobile dashboard controls + form */'
if marker not in g:
    g += r'''

/* v1.4.8.3 dense mobile dashboard controls + form */
@media(max-width:650px){
  .adminDashboard .mobileDashboardActions{order:1!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:5px!important;width:100%!important;overflow:visible!important}
  .adminDashboard .mobileDashboardActions button{min-width:0!important;width:100%!important;min-height:46px!important;height:46px!important;padding:5px 3px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;text-align:center!important;border-radius:8px!important}
  .adminDashboard .mobileDashboardActions button span{width:18px!important;height:18px!important;font-size:10px!important;border-radius:5px!important;flex:0 0 18px!important}
  .adminDashboard .mobileDashboardActions button strong{font-size:8px!important;line-height:1.05!important;white-space:normal!important;overflow-wrap:anywhere!important}

  .adminDashboard .adminDashboardStats{order:2!important;display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:4px!important;width:100%!important;overflow:visible!important;padding:0!important;margin:0!important}
  .adminDashboard .adminDashboardStats>article{min-width:0!important;width:auto!important;min-height:42px!important;height:42px!important;padding:5px 3px!important;border-radius:7px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;text-align:center!important;overflow:hidden!important}
  .adminDashboard .adminDashboardStats>article span{font-size:6px!important;line-height:1!important;letter-spacing:.025em!important;white-space:nowrap!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important}
  .adminDashboard .adminDashboardStats>article strong{font-size:13px!important;line-height:1!important;margin-top:4px!important;white-space:nowrap!important}
  .adminDashboard .adminDashboardStats>article small{display:none!important}

  .adminDashboard .weeklyPicksPanel{order:3!important}
  .adminDashboard .mobileLeaguePreview{order:4!important}
  .adminDashboard .mobilePickPanel{order:5!important}
  .adminDashboard #current-form{order:6!important}

  #current-form .formTableWrap{overflow:visible!important;width:100%!important}
  #current-form .formTable{display:block!important;min-width:0!important;width:100%!important}
  #current-form .formTable>.formHeader{display:none!important}
  #current-form .formRow{display:flex!important;grid-template-columns:none!important;width:100%!important;align-items:center!important;gap:0!important;min-height:30px!important;padding:2px 0!important}
  #current-form .formRow .formName{flex:0 0 92px!important;min-width:92px!important;max-width:92px!important;padding:4px 5px!important;font-size:10px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
  #current-form .formRow .formCell:not(.formName){flex:1 1 0!important;min-width:0!important;padding:1px 0!important;border:0!important;display:flex!important;align-items:center!important;justify-content:center!important}
  #current-form .formRow .formCell:last-child{display:none!important}
  #current-form .formPill{width:14px!important;height:14px!important;min-width:14px!important;padding:0!important;border-radius:50%!important;font-size:0!important;line-height:14px!important;display:inline-grid!important;place-items:center!important;box-shadow:none!important}
  #current-form .formPill::after{font-size:8px!important;line-height:1!important;font-family:Arial,sans-serif!important;font-weight:900!important}
  #current-form .formWin::after{content:"✓"}
  #current-form .formScoreNil::after{content:"•";font-size:10px!important}
  #current-form .formLoss::after{content:"×"}
  #current-form .formEmpty::after{content:"–"}
}
'''
    css.write_text(g)
