from pathlib import Path
import re

league_path = Path("app/LeagueApp.tsx")
release_css_path = Path("app/release.module.css")
globals_path = Path("app/globals.css")

league = league_path.read_text()
release_css = release_css_path.read_text()
globals_css = globals_path.read_text()

# Swap the compact dashboard hierarchy on mobile/source order so the status strip
# appears before the four primary shortcut buttons. Keep all controls/functionality.
actions_pattern = re.compile(
    r'(\n    <div className="mobileDashboardActions" aria-label="Dashboard shortcuts">.*?</div>)\n\n'
    r'(    <div className=\{`\$\{styles\.dashboardStats\} adminDashboardStats`\}>.*?</div>)\n\n'
    r'(    <div className=\{`\$\{styles\.dashboardMain\} mobileDashboardMain`\}>)',
    re.S,
)
if actions_pattern.search(league):
    league = actions_pattern.sub(r'\n\2\n\n\1\n\n\3', league, count=1)
elif league.find('adminDashboardStats') > league.find('mobileDashboardActions'):
    raise SystemExit("Dashboard row-order anchor not found")

# Keep Everyone at a glance left aligned; only give it a small emphasis class if
# the earlier dashboard patch did not already add one.
old_heading = '<div><div className={styles.title}>GAMEWEEK PICKS & LIVE RESULTS</div><h3>Everyone at a glance</h3></div>'
new_heading = '<div className="weeklyPicksHeading"><div className={styles.title}>GAMEWEEK PICKS & LIVE RESULTS</div><h3>Everyone at a glance</h3></div>'
if old_heading in league:
    league = league.replace(old_heading, new_heading, 1)

module_marker = "/* mobile-dashboard-polish-20260819 */"
if module_marker not in release_css:
    release_css += r'''

/* mobile-dashboard-polish-20260819 */
@media(max-width:650px){
  /* Larger, lower mobile navigation control aligned with the compact art banner. */
  .mobileMenu{
    width:46px!important;
    height:46px!important;
    top:108px!important;
    left:10px!important;
    border-radius:11px!important;
    font-size:21px!important;
    line-height:1!important;
    z-index:95!important;
  }

  /* Give the compact dashboard art/banner enough height to show the trophy cleanly. */
  .dashboardIntro{
    min-height:64px!important;
    height:64px!important;
    padding:0 12px!important;
    overflow:hidden!important;
  }
  .dashboardIntro>div:first-child{
    min-width:0!important;
  }
  .dashboardArt{
    right:50%!important;
    bottom:-3px!important;
    transform:translateX(50%)!important;
    width:112px!important;
    height:66px!important;
    opacity:.78!important;
  }
  .dashboardArt img:first-child{display:none!important}
  .dashboardArt img:last-child{
    width:62px!important;
    height:64px!important;
    object-fit:contain!important;
  }
}
'''

global_marker = "/* mobile-dashboard-polish-global-20260819 */"
if global_marker not in globals_css:
    globals_css += r'''

/* mobile-dashboard-polish-global-20260819 */
@media(max-width:650px){
  /* Centre the badge + Bounce lockup as one group in the top identity header. */
  .dashboardBrandHero{
    min-height:100px!important;
    height:100px!important;
    padding:8px 8px!important;
    display:block!important;
    position:relative!important;
    overflow:visible!important;
  }
  .dashboardBrandLockup{
    position:absolute!important;
    left:50%!important;
    top:9px!important;
    transform:translateX(-50%)!important;
    width:max-content!important;
    max-width:72%!important;
    display:flex!important;
    align-items:center!important;
    justify-content:center!important;
    gap:8px!important;
    text-align:left!important;
  }
  .dashboardBrandCrest{
    width:46px!important;
    height:48px!important;
    flex:0 0 46px!important;
  }
  .dashboardBrandLockup h1{
    font-size:27px!important;
    line-height:.95!important;
    letter-spacing:.055em!important;
    white-space:nowrap!important;
  }
  .dashboardBrandLockup h2{
    font-size:10px!important;
    line-height:1!important;
    letter-spacing:.12em!important;
    margin-top:4px!important;
    white-space:nowrap!important;
  }
  .dashboardBrandEyebrow{
    font-size:7px!important;
    line-height:1!important;
    margin:0 0 3px!important;
    letter-spacing:.08em!important;
    white-space:nowrap!important;
  }

  /* Lower the GW picker onto the same visual utility line as the intro banner. */
  .dashboardGwCompact{
    position:absolute!important;
    right:9px!important;
    top:108px!important;
    width:142px!important;
    min-width:142px!important;
    min-height:48px!important;
    padding:6px 7px!important;
    z-index:94!important;
  }
  .dashboardGwCompact label{font-size:8px!important}
  .dashboardGwCompact small{
    font-size:7px!important;
    line-height:1.15!important;
    margin-top:3px!important;
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
  }
  .dashboardGwCompact .gwRow{margin-top:3px!important}

  /* Status strip first, shortcuts second; source order is also swapped by this patch. */
  .adminDashboardStats{margin-top:8px!important;margin-bottom:7px!important}
  .mobileDashboardActions{margin-top:0!important}

  /* Keep this heading left aligned and simply make it a touch more prominent. */
  .weeklyPicksHeading{text-align:left!important}
  .weeklyPicksHeading h3{
    text-align:left!important;
    font-size:20px!important;
    line-height:1.05!important;
    margin-top:2px!important;
  }
}
'''

league_path.write_text(league)
release_css_path.write_text(release_css)
globals_path.write_text(globals_css)
print("Applied mobile Dashboard header, utility-line and hierarchy polish")
