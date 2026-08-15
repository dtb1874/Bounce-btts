from pathlib import Path
import re

league = Path('app/LeagueApp.tsx')
s = league.read_text()

s = re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.4.8.2";', s, count=1)
s = re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "15 Aug 2026";', s, count=1)

replacements = [
    ('return <section className={styles.dashboard}>', 'return <section className={`${styles.dashboard} ${isAdmin?"adminDashboard":""}`}>', 'dashboard root'),
    ('<div className={styles.dashboardIntro}>', '<div className={`${styles.dashboardIntro} adminDashboardIntro`}>', 'dashboard intro'),
    ('<div className={styles.dashboardStats}>', '<div className={`${styles.dashboardStats} adminDashboardStats`}>', 'dashboard stats'),
    ('<div className={styles.dashboardMain}>', '<div className={`${styles.dashboardMain} mobileDashboardMain`}>', 'dashboard main'),
    ('<div className={styles.dashboardPrimary}>', '<div className={`${styles.dashboardPrimary} mobileDashboardPrimary`}>', 'dashboard primary'),
    ('<aside className={styles.dashboardSide}>', '<aside className={`${styles.dashboardSide} mobileDashboardSide`}>', 'dashboard side'),
    ('<article className={`${styles.panel} ${styles.pickPanel}`}>', '<article className={`${styles.panel} ${styles.pickPanel} mobilePickPanel`}>', 'pick panel'),
    ('<article className={`${styles.panel} ${styles.tablePreview}`}>', '<article className={`${styles.panel} ${styles.tablePreview} mobileLeaguePreview`}>', 'league preview'),
]
for old,new,name in replacements:
    if old not in s:
        raise SystemExit('Could not locate '+name)
    s=s.replace(old,new,1)

needle = 'const releases=[\n    {version:"1.4.8.1"'
replacement = 'const releases=[\n    {version:"1.4.8.2",date:"15 Aug 2026",summary:"True compact admin mobile hierarchy",changes:["Admin mobile header is reduced to a slim identity strip rather than a prominent hero card","The five admin summary cards are converted into a small low-priority horizontal status strip","Weekly Picks now genuinely follows the four primary shortcuts, with the current League Table immediately after it","Your Pick, Current Form and compact status information move below the two most useful live league sections","Corrected the mobile hierarchy selectors so the intended compact layout now applies to CSS-module dashboard elements"]},\n    {version:"1.4.8.1"'
if needle not in s:
    raise SystemExit('Could not locate v1.4.8.1 release history entry')
s=s.replace(needle,replacement,1)
league.write_text(s)

css=Path('app/globals.css')
g=css.read_text()
marker='/* v1.4.8.2 true compact admin mobile hierarchy */'
if marker not in g:
    g += r'''

/* v1.4.8.2 true compact admin mobile hierarchy */
@media(max-width:650px){
  .adminDashboard{gap:8px!important}
  .adminDashboard .adminDashboardIntro{order:0!important;min-height:48px!important;height:48px!important;padding:7px 10px!important;border-radius:11px!important;display:flex!important;align-items:center!important;overflow:hidden!important}
  .adminDashboard .adminDashboardIntro>div:first-child{min-width:0!important;display:flex!important;align-items:baseline!important;gap:8px!important;white-space:nowrap!important}
  .adminDashboard .adminDashboardIntro span{font-size:8px!important;letter-spacing:.07em!important;flex:0 0 auto!important}
  .adminDashboard .adminDashboardIntro h2{font-size:16px!important;line-height:1!important;margin:0!important;max-width:none!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
  .adminDashboard .adminDashboardIntro p{display:none!important}
  .adminDashboard .adminDashboardIntro .dashboardArt{display:none!important}
  .adminDashboard .mobileDashboardActions{order:1!important;margin:0!important;gap:6px!important}
  .adminDashboard .mobileDashboardActions button{min-height:43px!important;padding:7px 9px!important;border-radius:9px!important}
  .adminDashboard .mobileDashboardActions button span{width:22px!important;height:22px!important;font-size:12px!important}
  .adminDashboard .mobileDashboardActions button strong{font-size:10px!important}
  .adminDashboard .mobileDashboardMain,.adminDashboard .mobileDashboardPrimary,.adminDashboard .mobileDashboardSide{display:contents!important}
  .adminDashboard .weeklyPicksPanel{order:2!important;margin-top:0!important}
  .adminDashboard .mobileLeaguePreview{order:3!important;margin-top:0!important}
  .adminDashboard .mobilePickPanel{order:4!important;margin-top:0!important}
  .adminDashboard #current-form{order:5!important;margin-top:0!important}
  .adminDashboard .adminDashboardStats{order:6!important;display:flex!important;gap:5px!important;overflow-x:auto!important;padding:1px 0 3px!important;margin:0!important;scrollbar-width:none!important;-webkit-overflow-scrolling:touch!important}
  .adminDashboard .adminDashboardStats::-webkit-scrollbar{display:none!important}
  .adminDashboard .adminDashboardStats>article{flex:0 0 96px!important;min-height:46px!important;height:46px!important;padding:6px 7px!important;border-radius:9px!important;box-shadow:none!important;opacity:.82!important}
  .adminDashboard .adminDashboardStats>article span{font-size:7px!important;line-height:1!important;letter-spacing:.06em!important}
  .adminDashboard .adminDashboardStats>article strong{font-size:15px!important;line-height:1.05!important;margin-top:4px!important}
  .adminDashboard .adminDashboardStats>article small{display:none!important}
}
'''
    css.write_text(g)
