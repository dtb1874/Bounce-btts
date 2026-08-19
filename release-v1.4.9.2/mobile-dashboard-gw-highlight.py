from pathlib import Path

league_path = Path("app/LeagueApp.tsx")
globals_path = Path("app/globals.css")

league = league_path.read_text()
css = globals_path.read_text()

# Keep the brand eyebrow focused on the league identity; the active gameweek is
# shown only in the dedicated picker on mobile.
with_gw = '<p className="dashboardBrandEyebrow">EST 2024 · SEASON {seasonLabel} · GW {gameweek?.number??"—"}</p>'
without_gw = '<p className="dashboardBrandEyebrow">EST 2024 · SEASON {seasonLabel}</p>'
if with_gw in league:
    league = league.replace(with_gw, without_gw, 1)

marker = "/* mobile-dashboard-gw-highlight-20260819 */"
if marker not in css:
    css += r'''

/* mobile-dashboard-gw-highlight-20260819 */
@media(max-width:650px){
  .dashboardBrandHero.dashboardBrandHero .dashboardGwCompact [class*="gwRow"] select{
    color:#f2c94c!important;
    -webkit-text-fill-color:#f2c94c!important;
    font-weight:800!important;
  }
}
'''

league_path.write_text(league)
globals_path.write_text(css)
print("Removed GW from mobile brand eyebrow and highlighted selected gameweek in strong gold")
