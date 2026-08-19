from pathlib import Path

league_path = Path("app/LeagueApp.tsx")
release_css_path = Path("app/release.module.css")
globals_path = Path("app/globals.css")

league = league_path.read_text()
release_css = release_css_path.read_text()
globals_css = globals_path.read_text()

# Give the mobile dashboard controls explicit global hooks so the preview does not
# depend on CSS-module ordering/specificity from the older dashboard patch chain.
league = league.replace(
    '<button className={styles.mobileMenu} onClick={()=>setMobileMenu(true)}>☰</button>',
    '<button className={`${styles.mobileMenu} mobileDashboardMenu`} onClick={()=>setMobileMenu(true)}>☰</button>',
    1,
)
league = league.replace(
    '<div className={`${styles.dashboardIntro} adminDashboardIntro`}>',
    '<div className={`${styles.dashboardIntro} adminDashboardIntro mobileControlCentre`}>',
    1,
)
league = league.replace(
    '<div className={styles.dashboardArt} aria-hidden="true">',
    '<div className={`${styles.dashboardArt} mobileControlTrophy`} aria-hidden="true">',
    1,
)

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

# Keep the module-level rules for the actual CSS-module classes, but the global
# block below is the authoritative mobile layout and deliberately has stronger
# selectors than the older dashboard-cleanup patch.
module_marker = "/* mobile-dashboard-polish-20260819-v2 */"
if module_marker not in release_css:
    release_css += r'''

/* mobile-dashboard-polish-20260819-v2 */
@media(max-width:650px){
  .dashboardIntro.mobileControlCentre{
    position:relative!important;
    min-height:54px!important;
    height:54px!important;
    padding:0 12px!important;
    overflow:visible!important;
    display:flex!important;
    align-items:center!important;
    justify-content:center!important;
  }
  .dashboardIntro.mobileControlCentre>div:first-child{
    position:absolute!important;
    left:50%!important;
    top:50%!important;
    transform:translate(-50%,-50%)!important;
    width:calc(100% - 88px)!important;
    min-width:0!important;
    text-align:center!important;
  }
  .dashboardIntro.mobileControlCentre .eyebrow,
  .dashboardIntro.mobileControlCentre p{display:none!important}
  .dashboardIntro.mobileControlCentre h2{
    margin:0!important;
    text-align:center!important;
    font-size:20px!important;
    line-height:1!important;
    white-space:nowrap!important;
  }
  .dashboardArt.mobileControlTrophy{
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
  .dashboardArt.mobileControlTrophy img:first-child{display:none!important}
  .dashboardArt.mobileControlTrophy img:last-child{
    display:block!important;
    width:70px!important;
    height:82px!important;
    object-fit:contain!important;
  }
}
'''

global_marker = "/* mobile-dashboard-polish-global-20260819-v2 */"
if global_marker not in globals_css:
    globals_css += r'''

/* mobile-dashboard-polish-global-20260819-v2 */
@media(max-width:650px){
  /* Force the intended mobile hero even when legacy global rules are restored from build cache. */
  .dashboardBrandHero.dashboardBrandHero{
    min-height:184px!important;
    height:184px!important;
    padding:0!important;
    display:block!important;
    position:relative!important;
    overflow:visible!important;
    grid-template-columns:none!important;
    gap:0!important;
    align-items:initial!important;
  }
  .dashboardBrandHero .dashboardBrandLockup{
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
  .dashboardBrandHero .dashboardBrandCrest{
    width:55px!important;
    height:57px!important;
    flex:0 0 57px!important;
    margin:0 auto 5px!important;
  }
  .dashboardBrandHero .dashboardBrandLockup>div{
    width:100%!important;
    text-align:center!important;
  }
  .dashboardBrandHero .dashboardBrandEyebrow{
    display:block!important;
    width:100%!important;
    margin:0 0 6px!important;
    font-size:7.5px!important;
    line-height:1!important;
    letter-spacing:.09em!important;
    white-space:nowrap!important;
    text-align:center!important;
  }
  .dashboardBrandHero .dashboardBrandLockup h1{
    margin:0!important;
    font-size:34px!important;
    line-height:.9!important;
    letter-spacing:.065em!important;
    white-space:nowrap!important;
    text-align:center!important;
  }
  .dashboardBrandHero .dashboardBrandLockup h2{
    margin:7px 0 0!important;
    font-size:11px!important;
    line-height:1!important;
    letter-spacing:.18em!important;
    white-space:nowrap!important;
    text-align:center!important;
  }

  /* Menu and GW selector sit on the same lower utility line, clear of the brand lockup. */
  main .mobileDashboardMenu{
    width:48px!important;
    height:48px!important;
    top:118px!important;
    left:10px!important;
    border-radius:12px!important;
    font-size:22px!important;
    line-height:1!important;
    z-index:95!important;
  }
  .dashboardBrandHero .dashboardGwCompact{
    position:absolute!important;
    right:9px!important;
    top:116px!important;
    width:104px!important;
    min-width:104px!important;
    min-height:46px!important;
    padding:5px 6px!important;
    margin:0!important;
    transform:none!important;
    z-index:94!important;
  }
  .dashboardBrandHero .dashboardGwCompact label{font-size:7.5px!important}
  .dashboardBrandHero .dashboardGwCompact small{display:none!important}
  .dashboardBrandHero .dashboardGwCompact [class*="gwRow"]{margin-top:2px!important;gap:4px!important}
  .dashboardBrandHero .dashboardGwCompact [class*="gwRow"] select,
  .dashboardBrandHero .dashboardGwCompact [class*="gwRow"] button{padding:5px!important}

  /* Short League Control Centre card with centred title and trophy projecting at right. */
  .mobileControlCentre.adminDashboardIntro{
    position:relative!important;
    min-height:54px!important;
    height:54px!important;
    padding:0 12px!important;
    overflow:visible!important;
    display:flex!important;
    align-items:center!important;
    justify-content:center!important;
  }
  .mobileControlCentre.adminDashboardIntro>div:first-child{
    position:absolute!important;
    left:50%!important;
    top:50%!important;
    transform:translate(-50%,-50%)!important;
    width:calc(100% - 88px)!important;
    min-width:0!important;
    text-align:center!important;
  }
  .mobileControlCentre.adminDashboardIntro [class*="eyebrow"],
  .mobileControlCentre.adminDashboardIntro p{display:none!important}
  .mobileControlCentre.adminDashboardIntro h2{
    margin:0!important;
    text-align:center!important;
    font-size:20px!important;
    line-height:1!important;
    white-space:nowrap!important;
  }
  .mobileControlCentre .mobileControlTrophy{
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
  .mobileControlCentre .mobileControlTrophy img:first-child{display:none!important}
  .mobileControlCentre .mobileControlTrophy img:last-child{
    display:block!important;
    width:70px!important;
    height:82px!important;
    object-fit:contain!important;
  }

  /* Status strip first, shortcuts second. */
  .adminDashboardStats{margin-top:8px!important;margin-bottom:7px!important}
  .mobileDashboardActions{margin-top:0!important}

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
print("Applied forced mobile Dashboard polish with explicit global hooks")
