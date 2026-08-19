from pathlib import Path

league_path = Path("app/LeagueApp.tsx")
globals_path = Path("app/globals.css")
league = league_path.read_text()
globals_css = globals_path.read_text()

# Everyone at a glance is already transformed by the dashboard cleanup into a
# compact three-line fixture block: competition, fixture, then BTTS odds.
# Collapse that to two lines by keeping competition and putting the raw
# fractional BTTS price directly beside the fixture name.
old_variants = [
    '<div className={`${styles.fixtureCell} dashboardSnapshotFixture`}>{fixture?<><small className="dashboardCompetition">{competitionDisplayName(fixture)}</small><strong>{fixture.home_team} v {fixture.away_team}</strong><small>BTTS {formatFixtureOddsDisplay(fixture.odds_fractional)??"—"}</small></>:<span>Awaiting selection</span>}</div>',
    '<div className={`${styles.fixtureCell} dashboardSnapshotFixture`}>{fixture?<><small className="dashboardCompetition">{competitionDisplayName(fixture)}</small><strong>{fixture.home_team} v {fixture.away_team}</strong><small>BTTS {fixture.odds_fractional??"—"}</small></>:<span>Awaiting selection</span>}</div>',
]
new_markup = '<div className={`${styles.fixtureCell} dashboardSnapshotFixture weeklyFixtureCell`}>{fixture?<><small className="dashboardCompetition weeklyFixtureCompetition">{competitionDisplayName(fixture)}</small><div className="weeklyFixtureLine"><strong>{fixture.home_team} v {fixture.away_team}</strong><b className="weeklyFixtureOdds">{fixture.odds_fractional??"—"}</b></div></>:<span>Awaiting selection</span>}</div>'

replaced = False
for old in old_variants:
    if old in league:
        league = league.replace(old, new_markup, 1)
        replaced = True
        break
if not replaced:
    raise SystemExit("Weekly compact snapshot fixture markup anchor not found")

marker = "/* mobile-weekly-pick-odds-inline-20260819-v2 */"
if marker not in globals_css:
    globals_css += r'''

/* mobile-weekly-pick-odds-inline-20260819-v2 */
.weeklyFixtureLine{
  display:flex;
  align-items:baseline;
  gap:7px;
  min-width:0;
  width:100%;
}
.dashboardSnapshotFixture .weeklyFixtureLine>strong{
  order:0!important;
  min-width:0;
  flex:1 1 auto;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.weeklyFixtureOdds{
  order:1!important;
  flex:0 0 auto;
  color:#e8c77c!important;
  font-size:11px;
  font-weight:900;
  letter-spacing:.01em;
  white-space:nowrap;
}
.weeklyFixtureCompetition{
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
@media(max-width:650px){
  .weeklyPicksPanel .dashboardSnapshotRow{
    min-height:48px!important;
    padding:4px 0!important;
    gap:4px 8px!important;
  }
  .weeklyPicksPanel .weeklyFixtureLine{gap:5px!important}
  .weeklyPicksPanel .weeklyFixtureOdds{
    font-size:10px!important;
    line-height:1!important;
  }
  .weeklyPicksPanel .weeklyFixtureCompetition{
    margin:0!important;
    font-size:7.5px!important;
    line-height:1!important;
  }
}
'''

league_path.write_text(league)
globals_path.write_text(globals_css)
print("Placed weekly raw fractional odds beside fixture and reduced snapshot card height")
