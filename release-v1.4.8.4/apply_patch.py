from pathlib import Path
import re

league=Path('app/LeagueApp.tsx')
s=league.read_text()
s=re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.4.8.4";', s, count=1)
s=re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "15 Aug 2026";', s, count=1)
old='return <section className={`${styles.dashboard} ${isAdmin?"adminDashboard":""}`}> '
if old in s:
    s=s.replace(old,'return <section className={`${styles.dashboard} compactDashboard ${isAdmin?"adminDashboard":""}`}> ',1)
else:
    old2='return <section className={`${styles.dashboard} ${isAdmin?"adminDashboard":""}`}> '
    if old2 in s:
        s=s.replace(old2,'return <section className={`${styles.dashboard} compactDashboard ${isAdmin?"adminDashboard":""}`}> ',1)
    else:
        exact='return <section className={`${styles.dashboard} ${isAdmin?"adminDashboard":""}`}> '
        if exact not in s:
            exact='return <section className={`${styles.dashboard} ${isAdmin?"adminDashboard":""}`}> '
        if exact not in s:
            target='return <section className={`${styles.dashboard} ${isAdmin?"adminDashboard":""}`}> '
        # tolerate no trailing whitespace
        target='return <section className={`${styles.dashboard} ${isAdmin?"adminDashboard":""}`}> '
# robust replacement without relying on trailing whitespace
s=s.replace('return <section className={`${styles.dashboard} ${isAdmin?"adminDashboard":""}`}>','return <section className={`${styles.dashboard} compactDashboard ${isAdmin?"adminDashboard":""}`}>',1)

needle='const releases=[\n    {version:"1.4.8.3"'
replacement='const releases=[\n    {version:"1.4.8.4",date:"15 Aug 2026",summary:"Consistent Dashboard structure across all roles",changes:["Reviewed Dashboard rendering for Ultimate Admin, Admin, Member and Guest roles","The compact mobile Dashboard hierarchy now applies consistently to every role","All roles use the same compact header, four-shortcut row, status strip, Weekly Picks, League Table and Current Form structure","Admin-only reminder controls, Admin Alerts and administrative actions remain visible only to authorised admin roles","Member and guest views no longer fall back to the older mobile Dashboard ordering or spacing"]},\n    {version:"1.4.8.3"'
if needle not in s:
    raise SystemExit('Could not locate v1.4.8.3 release history entry')
s=s.replace(needle,replacement,1)
league.write_text(s)

css=Path('app/globals.css')
g=css.read_text()
marker='/* v1.4.8.4 role-consistent compact dashboard */'
if marker not in g:
    g += r'''

/* v1.4.8.4 role-consistent compact dashboard */
@media(max-width:650px){
  .compactDashboard{gap:8px!important}
  .compactDashboard .adminDashboardIntro{order:0!important;min-height:48px!important;height:48px!important;padding:7px 10px!important;border-radius:11px!important;display:flex!important;align-items:center!important;overflow:hidden!important}
  .compactDashboard .adminDashboardIntro>div:first-child{min-width:0!important;display:flex!important;align-items:baseline!important;gap:8px!important;white-space:nowrap!important}
  .compactDashboard .adminDashboardIntro span{font-size:8px!important;letter-spacing:.07em!important;flex:0 0 auto!important}
  .compactDashboard .adminDashboardIntro h2{font-size:16px!important;line-height:1!important;margin:0!important;max-width:none!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
  .compactDashboard .adminDashboardIntro p{display:none!important}
  .compactDashboard .adminDashboardIntro .dashboardArt{display:none!important}

  .compactDashboard .mobileDashboardActions{order:1!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:5px!important;width:100%!important;overflow:visible!important;margin:0!important}
  .compactDashboard .mobileDashboardActions button{min-width:0!important;width:100%!important;min-height:46px!important;height:46px!important;padding:5px 3px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;text-align:center!important;border-radius:8px!important}
  .compactDashboard .mobileDashboardActions button span{width:18px!important;height:18px!important;font-size:10px!important;border-radius:5px!important;flex:0 0 18px!important}
  .compactDashboard .mobileDashboardActions button strong{font-size:8px!important;line-height:1.05!important;white-space:normal!important;overflow-wrap:anywhere!important}

  .compactDashboard .adminDashboardStats{order:2!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:4px!important;width:100%!important;overflow:visible!important;padding:0!important;margin:0!important}
  .compactDashboard.adminDashboard .adminDashboardStats{grid-template-columns:repeat(5,minmax(0,1fr))!important}
  .compactDashboard .adminDashboardStats>article{min-width:0!important;width:auto!important;min-height:42px!important;height:42px!important;padding:5px 3px!important;border-radius:7px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;text-align:center!important;overflow:hidden!important;box-shadow:none!important;opacity:.82!important}
  .compactDashboard .adminDashboardStats>article span{font-size:6px!important;line-height:1!important;letter-spacing:.025em!important;white-space:nowrap!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important}
  .compactDashboard .adminDashboardStats>article strong{font-size:13px!important;line-height:1!important;margin-top:4px!important;white-space:nowrap!important}
  .compactDashboard .adminDashboardStats>article small{display:none!important}

  .compactDashboard .mobileDashboardMain,.compactDashboard .mobileDashboardPrimary,.compactDashboard .mobileDashboardSide{display:contents!important}
  .compactDashboard .weeklyPicksPanel{order:3!important;margin-top:0!important}
  .compactDashboard .mobileLeaguePreview{order:4!important;margin-top:0!important}
  .compactDashboard .mobilePickPanel{order:5!important;margin-top:0!important}
  .compactDashboard #current-form{order:6!important;margin-top:0!important}
}
'''
    css.write_text(g)
