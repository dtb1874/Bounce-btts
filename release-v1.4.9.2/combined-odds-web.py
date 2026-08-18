from pathlib import Path

league_path = Path("app/LeagueApp.tsx")
globals_path = Path("app/globals.css")
league = league_path.read_text()
globals = globals_path.read_text()

helper_anchor = 'function initials(name: string) { return name.split(/\\s+/).map(p => p[0] ?? "").join("").slice(0,2).toUpperCase(); }'
helper_code = '''function formatFixtureOddsDisplay(value:string|null|undefined){
  if(!value)return null;
  const match=value.trim().match(/^(\\d+(?:\\.\\d+)?)\\s*\\/\\s*(\\d+(?:\\.\\d+)?)$/);
  if(!match)return value;
  const numerator=Number(match[1]),denominator=Number(match[2]);
  if(!Number.isFinite(numerator)||!Number.isFinite(denominator)||denominator<=0)return value;
  return `${(numerator/denominator).toFixed(2)}/1`;
}
function combinedFractionalOddsFromStrings(values:Array<string|null|undefined>){
  if(!values.length)return null;
  let combinedDecimal=1;
  for(const value of values){
    const match=value?.trim().match(/^(\\d+(?:\\.\\d+)?)\\s*\\/\\s*(\\d+(?:\\.\\d+)?)$/);
    if(!match)return null;
    const numerator=Number(match[1]),denominator=Number(match[2]);
    if(!Number.isFinite(numerator)||!Number.isFinite(denominator)||denominator<=0)return null;
    combinedDecimal*=1+numerator/denominator;
  }
  const fractionalTotal=combinedDecimal-1;
  if(!Number.isFinite(fractionalTotal)||fractionalTotal<0)return null;
  return `${fractionalTotal.toFixed(2)}/1`;
}
'''
if 'function formatFixtureOddsDisplay' not in league:
    if helper_anchor not in league:
        raise SystemExit("Odds display helper anchor not found")
    league = league.replace(helper_anchor, helper_code + helper_anchor, 1)
elif 'function combinedFractionalOddsFromStrings' not in league:
    if helper_anchor not in league:
        raise SystemExit("Combined odds helper anchor not found")
    league = league.replace(helper_anchor, helper_code.split('function combinedFractionalOddsFromStrings',1)[1] + helper_anchor, 1)

weekly_marker = '<article id="weekly-picks"'
if weekly_marker not in league:
    raise SystemExit("Weekly picks panel not found")
head, tail = league.split(weekly_marker, 1)
insert_anchor = '            </div>\n          </div>\n          <div className={styles.pickList}>'
odds_strip = '            </div>\n          </div>\n          <div className="weeklyCombinedOddsStrip"><span>Combined BTTS odds</span><strong>{combinedFractionalOddsFromStrings(picks.filter(p=>p.fixture).map(p=>p.fixture?.odds_fractional))??"—"}</strong></div>\n          <div className={styles.pickList}>'
if 'weeklyCombinedOddsStrip' not in tail:
    if insert_anchor not in tail:
        raise SystemExit("Weekly picks action-row closing anchor not found")
    tail = tail.replace(insert_anchor, odds_strip, 1)
league = head + weekly_marker + tail

# Present every individual BTTS price in the same readable two-decimal /1 format.
replacements = {
    '{myFixture.odds_fractional??"Odds unavailable"}': '{formatFixtureOddsDisplay(myFixture.odds_fractional)??"Odds unavailable"}',
    '{fixture.odds_fractional??"—"}': '{formatFixtureOddsDisplay(fixture.odds_fractional)??"—"}',
    '{f.odds_fractional??"—"}': '{formatFixtureOddsDisplay(f.odds_fractional)??"—"}',
    '{fx?.odds_fractional??"—"}': '{formatFixtureOddsDisplay(fx?.odds_fractional)??"—"}',
    'selected.odds_fractional?` · ${selected.odds_fractional}`': 'selected.odds_fractional?` · ${formatFixtureOddsDisplay(selected.odds_fractional)}`',
    'f.odds_fractional?` · ${f.odds_fractional}`': 'f.odds_fractional?` · ${formatFixtureOddsDisplay(f.odds_fractional)}`',
}
for before, after in replacements.items():
    league = league.replace(before, after)

css_marker = '/* combined-odds-web-20260818 */'
if css_marker not in globals:
    globals += '''

/* combined-odds-web-20260818 */
.weeklyCombinedOddsStrip{display:flex;align-items:baseline;justify-content:flex-end;gap:7px;margin:8px 0 4px;padding-top:7px;border-top:1px solid rgba(216,183,111,.16);white-space:nowrap;color:#bda58e;font-size:9px;letter-spacing:.07em;text-transform:uppercase}
.weeklyCombinedOddsStrip strong{color:#e8c77c;font-size:16px;letter-spacing:.02em;text-transform:none}
@media(max-width:650px){
  .weeklyCombinedOddsStrip{justify-content:flex-end;font-size:7.5px;gap:5px;margin-top:7px;padding-top:6px;text-align:right}
  .weeklyCombinedOddsStrip strong{font-size:13px}
}
'''

league_path.write_text(league)
globals_path.write_text(globals)
print("Applied combined odds strip and standard two-decimal /1 fixture odds display")
