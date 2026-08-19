from pathlib import Path

league_path = Path("app/LeagueApp.tsx")
globals_path = Path("app/globals.css")
league = league_path.read_text()
globals_css = globals_path.read_text()

# Everyone at a glance is already transformed by the dashboard cleanup into a
# compact three-line fixture block: competition, fixture, then BTTS odds.
# Keep the fixture area to two lines, but move the raw fractional price into
# the live/status column so it sits directly below NS / the fixture status.
old_variants = [
    '<div className={`${styles.fixtureCell} dashboardSnapshotFixture`}>{fixture?<><small className="dashboardCompetition">{competitionDisplayName(fixture)}</small><strong>{fixture.home_team} v {fixture.away_team}</strong><small>BTTS {formatFixtureOddsDisplay(fixture.odds_fractional)??"—"}</small></>:<span>Awaiting selection</span>}</div>',
    '<div className={`${styles.fixtureCell} dashboardSnapshotFixture`}>{fixture?<><small className="dashboardCompetition">{competitionDisplayName(fixture)}</small><strong>{fixture.home_team} v {fixture.away_team}</strong><small>BTTS {fixture.odds_fractional??"—"}</small></>:<span>Awaiting selection</span>}</div>',
]
new_markup = '<div className={`${styles.fixtureCell} dashboardSnapshotFixture weeklyFixtureCell`}>{fixture?<><small className="dashboardCompetition weeklyFixtureCompetition">{competitionDisplayName(fixture)}</small><strong>{fixture.home_team} v {fixture.away_team}</strong></>:<span>Awaiting selection</span>}</div>'

replaced = False
for old in old_variants:
    if old in league:
        league = league.replace(old, new_markup, 1)
        replaced = True
        break
if not replaced:
    raise SystemExit("Weekly compact snapshot fixture markup anchor not found")

old_live = '<div className={`${styles.liveCell} dashboardSnapshotLive`}>{fixture?.home_score!=null?<strong>{fixture.home_score}-{fixture.away_score}</strong>:<strong>—</strong>}<small>{fixture?fixtureStatusLabel(fixture):"PENDING"}</small></div>'
new_live = '<div className={`${styles.liveCell} dashboardSnapshotLive weeklySnapshotLive`}>{fixture?.home_score!=null?<strong>{fixture.home_score}-{fixture.away_score}</strong>:<strong>—</strong>}<small>{fixture?fixtureStatusLabel(fixture):"PENDING"}</small>{fixture?<b className="weeklyFixtureOdds">{fixture.odds_fractional??"—"}</b>:null}</div>'
if old_live not in league:
    raise SystemExit("Weekly compact snapshot live-cell anchor not found")
league = league.replace(old_live, new_live, 1)

marker = "/* mobile-weekly-pick-odds-inline-20260819-v3 */"
if marker not in globals_css:
    globals_css += r'''

/* mobile-weekly-pick-odds-inline-20260819-v3 */
.weeklyFixtureCompetition{
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.weeklySnapshotLive{
  display:flex!important;
  flex-direction:column!important;
  align-items:center!important;
  justify-content:center!important;
}
.weeklySnapshotLive .weeklyFixtureOdds{
  display:block!important;
  margin-top:3px!important;
  color:#e8c77c!important;
  font-size:11px!important;
  font-weight:900!important;
  line-height:1!important;
  letter-spacing:.01em!important;
  white-space:nowrap!important;
}
@media(max-width:650px){
  .weeklyPicksPanel .dashboardSnapshotRow{
    min-height:48px!important;
    padding:4px 0!important;
    gap:4px 8px!important;
  }
  .weeklyPicksPanel .weeklyFixtureCompetition{
    margin:0!important;
    font-size:7.5px!important;
    line-height:1!important;
  }
  .weeklyPicksPanel .weeklySnapshotLive .weeklyFixtureOdds{
    margin-top:4px!important;
    font-size:10px!important;
  }
}
'''

league_path.write_text(league)
globals_path.write_text(globals_css)
print("Aligned weekly raw fractional odds directly below fixture status")
