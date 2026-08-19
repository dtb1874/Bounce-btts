from pathlib import Path
import re

league_path = Path("app/LeagueApp.tsx")
release_css_path = Path("app/release.module.css")
globals_path = Path("app/globals.css")

league = league_path.read_text()
release_css = release_css_path.read_text()
globals_css = globals_path.read_text()

# Swap the compact dashboard hierarchy so the status strip appears before the
# four primary shortcut buttons. Keep all controls and behaviour intact.
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

# Keep Everyone at a glance left aligned and only give it a modest size lift.
old_heading = '<div><div className={styles.title}>GAMEWEEK PICKS & LIVE RESULTS</div><h3>Everyone at a glance</h3></div>'
new_heading = '<div className="weeklyPicksHeading"><div className={styles.title}>GAMEWEEK PICKS & LIVE RESULTS</div><h3>Everyone at a glance</h3></div>'
if old_heading in league:
    league = league.replace(old_heading, new_heading, 1)

# Add the active GW to the centred mobile identity eyebrow. The generated hero
# already has the crest/Bounce lockup and GW selector from the earlier patch.
old_eyebrow = '<p className="dashboardBrandEyebrow">EST 2024 · SEASON {seasonLabel}</p>'
new_eyebrow = '<p className="dashboardBrandEyebrow">EST 2024 · SEASON {seasonLabel} · GW {gameweek?.number??"—"}</p>'
if old_eyebrow in league:
    league = league.replace(old_eyebrow, new_eyebrow, 1)

module_marker = "/* mobile-dashboard-polish-20260819 */"
if module_marker not in release_css:
    release_css += r'''

/* mobile-dashboard-polish-20260819 */
@media(max-width:650px){
  /* Menu sits independently on the left side of the branded hero. */
  .mobileMenu{
    width:48px!important;
    height:48px!important;
    top:70px!important;
    left:10px!important;
    border-radius:12px!important;
    font-size:22px!important;
    line-height:1!important;
    z-index:95!important;
  }

  /* League Control Centre: shorter banner, title only, centred. */
  .dashboardIntro{
    position:relative!important;
    min-height:54px!important;
    height:54px!important;
    padding:0 74px 0 18px!important;
    overflow:visible!important;
    display:flex!important;
    align-items:center!important;
    justify-content:center!important;
  }
  .dashboardIntro>div:first-child{
    width:100%!important;
    min-width:0!important;
    text-align:center!important;
  }
  .dashboardIntro .eyebrow,
  .dashboardIntro p{display:none!important}
  .dashboardIntro h2{
    margin:0!important;
    text-align:center!important;
    font-size:21px!important;
    line-height:1!important;
    white-space:nowrap!important;
  }

  /* Trophy remains on the right and may project outside the banner bounds. */
  .dashboardArt{
    position:absolute!important;
    right:4px!important;
    left:auto!important;
    top:50%!important;
    bottom:auto!important;
    transform:translateY(-50%)!important;
    width:72px!important;
    height:82px!important;
    opacity:1!important;
    overflow:visible!important;
    pointer-events:none!important;
  }
  .dashboardArt img:first-child{display:none!important}
  .dashboardArt img:last-child{
    display:block!important;
    width:72px!important;
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
  /* Branded mobile hero: crest centred above the identity text. */
  .dashboardBrandHero{
    min-height:164px!important;
    height:164px!important;
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
    width:72%!important;
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
    margin:0 auto 3px!important;
  }
  .dashboardBrandLockup>div{
    width:100%!important;
    text-align:center!important;
  }
  .dashboardBrandEyebrow{
    display:block!important;
    margin:0 0 5px!important;
    font-size:7.5px!important;
    line-height:1!important;
    letter-spacing:.11em!important;
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

  /* GW selector sits independently on the right, opposite the menu. */
  .dashboardGwCompact{
    position:absolute!important;
    right:9px!important;
    top:70px!important;
    width:112px!important;
    min-width:112px!important;
    min-height:48px!important;
    padding:6px 7px!important;
    z-index:94!important;
  }
  .dashboardGwCompact label{font-size:8px!important}
  .dashboardGwCompact small{
    display:none!important;
  }
  .dashboardGwCompact .gwRow{margin-top:3px!important}

  /* Status strip first, shortcuts second. */
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
print("Applied refined mobile Dashboard hero, control-centre and hierarchy polish")
