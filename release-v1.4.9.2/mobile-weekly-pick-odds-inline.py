from pathlib import Path

league_path = Path("app/LeagueApp.tsx")
globals_path = Path("app/globals.css")
league = league_path.read_text()
globals_css = globals_path.read_text()

# In Everyone at a glance, keep the fractional BTTS price beside the fixture name.
# The market is always BTTS here, so the extra label is unnecessary.
old_variants = [
    '<div className={styles.fixtureCell}>{fixture?<><strong>{fixture.home_team} v {fixture.away_team}</strong><small>{competitionDisplayName(fixture)} · {formatFixtureOddsDisplay(fixture.odds_fractional)??"—"}</small></>:<span>Awaiting selection</span>}</div>',
    '<div className={styles.fixtureCell}>{fixture?<><strong>{fixture.home_team} v {fixture.away_team}</strong><small>{competitionDisplayName(fixture)} · {fixture.odds_fractional??"—"}</small></>:<span>Awaiting selection</span>}</div>',
]
new_markup = '<div className={`${styles.fixtureCell} weeklyFixtureCell`}>{fixture?<><div className="weeklyFixtureLine"><strong>{fixture.home_team} v {fixture.away_team}</strong><b className="weeklyFixtureOdds">{fixture.odds_fractional??"—"}</b></div><small className="weeklyFixtureCompetition">{competitionDisplayName(fixture)}</small></>:<span>Awaiting selection</span>}</div>'

replaced = False
for old in old_variants:
    if old in league:
        league = league.replace(old, new_markup, 1)
        replaced = True
        break
if not replaced:
    raise SystemExit("Weekly player-card fixture markup anchor not found")

marker = "/* mobile-weekly-pick-odds-inline-20260819 */"
if marker not in globals_css:
    globals_css += r'''

/* mobile-weekly-pick-odds-inline-20260819 */
.weeklyFixtureLine{
  display:flex;
  align-items:baseline;
  gap:7px;
  min-width:0;
}
.weeklyFixtureLine>strong{
  min-width:0;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.weeklyFixtureOdds{
  flex:0 0 auto;
  color:#e8c77c;
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
  .weeklyPicksPanel [class*="pickListRow"]{
    padding:6px 0!important;
    gap:3px 8px!important;
  }
  .weeklyPicksPanel .weeklyFixtureLine{gap:5px!important}
  .weeklyPicksPanel .weeklyFixtureOdds{
    font-size:10.5px!important;
    line-height:1!important;
  }
  .weeklyPicksPanel .weeklyFixtureCompetition{
    margin-top:1px!important;
    font-size:8.5px!important;
    line-height:1.05!important;
  }
}
'''

league_path.write_text(league)
globals_path.write_text(globals_css)
print("Placed weekly BTTS fractional odds beside fixture and tightened mobile player cards")
