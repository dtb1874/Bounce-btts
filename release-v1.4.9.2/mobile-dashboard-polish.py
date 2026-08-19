from pathlib import Path
import re

league_path = Path("app/LeagueApp.tsx")
release_css_path = Path("app/release.module.css")
globals_path = Path("app/globals.css")

league = league_path.read_text()
release_css = release_css_path.read_text()
globals_css = globals_path.read_text()

# Robustly place the compact status strip before the four shortcut buttons.
actions_start = league.find('\n    <div className="mobileDashboardActions" aria-label="Dashboard shortcuts">')
stats_start = league.find('\n    <div className={`${styles.dashboardStats} adminDashboardStats`}>')
main_start = league.find('\n    <div className={`${styles.dashboardMain} mobileDashboardMain`}>')
if actions_start >= 0 and stats_start >= 0 and main_start > max(actions_start, stats_start):
    if actions_start < stats_start:
        actions_block = league[actions_start:stats_start]
        stats_block = league[stats_start:main_start]
        league = league[:actions_start] + stats_block + actions_block + league[main_start:]
elif stats_start < 0 or actions_start < 0:
    raise SystemExit("Dashboard row-order anchors not found")

# Keep Everyone at a glance left aligned and only give it a modest size lift.
old_heading = '<div><div className={styles.title}>GAMEWEEK PICKS & LIVE RESULTS</div><h3>Everyone at a glance</h3></div>'
new_heading = '<div className="weeklyPicksHeading"><div className={styles.title}>GAMEWEEK PICKS & LIVE RESULTS</div><h3>Everyone at a glance</h3></div>'
if old_heading in league:
    league = league.replace(old_heading, new_heading, 1)

# Add the active GW to the centred mobile identity eyebrow.
old_eyebrow = '<p className="dashboardBrandEyebrow">EST 2024 · SEASON {seasonLabel}</p>'
new_eyebrow = '<p className="dashboardBrandEyebrow">EST 2024 · SEASON {seasonLabel} · GW {gameweek?.number??"—"}</p>'
if old_eyebrow in league:
    league = league.replace(old_eyebrow, new_eyebrow, 1)

module_marker = "/* mobile-dashboard-polish-20260819 */"
if module_marker not in release_css:
    release_css += r'''

/* mobile-dashboard-polish-20260819 */
@media(max-width:650px){
  /* Menu sits independently low on the left side of the branded hero. */
  .mobileMenu{
    width:48px!important;
    height:48px!important;
    top:118px!important;
    left:10px!important;
    border-radius:12px!important;
    font-size:22px!important;
    line-height:1!important;
    z-index:95!important;
  }

  /* Short, centred League Control Centre banner. */
  .dashboardIntro{
    position:relative!important;
    min-height:54px!important;
    height:54px!important;
    padding:0 12px!important;
    overflow:visible!important;
    display:flex!important;
    align-items:center!important;
    justify-content:center!important;
  }
  .dashboardIntro>div:first-child{
    position:absolute!important;
    left:50%!important;
    top:50%!important;
    transform:translate(-50%,-50%)!important;
    width:calc(100% - 88px)!important;
    min-width:0!important;
    text-align:center!important;
  }
  .dashboardIntro .eyebrow,
  .dashboardIntro p{display:none!important}
  .dashboardIntro h2{
    margin:0!important;
    text-align:center!important;
    font-size:20px!important;
    line-height:1!important;
    white-space:nowrap!important;
  }

  /* Trophy stays on the right and can project outside the short banner. */
  .dashboardArt{
    position:absolute!important;
    right:-2px!important;
    left:auto!important;
    top:50%!important;
    bottom:auto!important;
    transform:translateY(-50%)!important;
    width:70px!important;
    height:82px!important;
    opacity:1!important;
    overflow:visible!important;
    pointer-events:none!important;
  }
  .dashboardArt img:first-child{display:none!important}
  .dashboardArt img:last-child{
    display:block!important;
    width:70px!important;
    height:82px!important;
    object-fit:contain!important;
  }
}
'''

global_marker = "/* mobile-dashboard-polish-global-20260819 */"
if global_marker not in globals_css:
    globals_css += r'''

/* mobile-dashboard-polish-global-20260819 */
@media(max-width:650px){
  /* Branded mobile hero with a fully centred identity stack. */
  .dashboardBrandHero{
    min-height:184px!important;
    height:184px!important;
    padding:0!important;
    display:block!important;
    position:relative!important;
    overflow:visible!important;
  }
  .dashboardBrandLockup{
    position:absolute!important;
    left:50%!important;
    top:8px!important;
    transform:translateX(-50%)!important;
    width:74%!important;
    max-width:300px!important;
    display:flex!important;
    flex-direction:column!important;
    align-items:center!important;
    justify-content:flex-start!important;
    gap:0!important;
    text-align:center!important;
  }
  .dashboardBrandCrest{
    width:55px!important;
    height:57px!important;
    flex:0 0 57px!important;
    margin:0 auto 5px!important;
  }
  .dashboardBrandLockup>div{
    width:100%!important;
    text-align:center!important;
  }
  .dashboardBrandEyebrow{
    display:block!important;
    width:100%!important;
    margin:0 0 6px!important;
    font-size:7.5px!important;
    line-height:1!important;
    letter-spacing:.09em!important;
    white-space:nowrap!important;
    text-align:center!important;
  }
  .dashboardBrandLockup h1{
    margin:0!important;
    font-size:34px!important;
    line-height:.9!important;
    letter-spacing:.065em!important;
    white-space:nowrap!important;
    text-align:center!important;
  }
  .dashboardBrandLockup h2{
    margin:7px 0 0!important;
    font-size:11px!important;
    line-height:1!important;
    letter-spacing:.18em!important;
    white-space:nowrap!important;
    text-align:center!important;
  }

  /* GW selector lowered opposite the menu and reduced slightly to protect the identity stack. */
  .dashboardGwCompact{
    position:absolute!important;
    right:9px!important;
    top:116px!important;
    width:104px!important;
    min-width:104px!important;
    min-height:46px!important;
    padding:5px 6px!important;
    z-index:94!important;
  }
  .dashboardGwCompact label{font-size:7.5px!important}
  .dashboardGwCompact small{display:none!important}
  .dashboardGwCompact .gwRow{margin-top:2px!important;gap:4px!important}
  .dashboardGwCompact .gwRow select,
  .dashboardGwCompact .gwRow button{padding:5px!important}

  /* The source order is status strip first, shortcuts second. */
  .adminDashboardStats{margin-top:8px!important;margin-bottom:7px!important}
  .mobileDashboardActions{margin-top:0!important}

  /* Left aligned; only slightly larger than before. */
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
print("Applied refined mobile Dashboard alignment, controls and hierarchy")
