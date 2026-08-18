from pathlib import Path

league_path = Path("app/LeagueApp.tsx")
globals_path = Path("app/globals.css")
league = league_path.read_text()
globals = globals_path.read_text()

helper_anchor = 'function initials(name: string) { return name.split(/\\s+/).map(p => p[0] ?? "").join("").slice(0,2).toUpperCase(); }'
helper_code = '''function combinedFractionalOddsFromStrings(values:Array<string|null|undefined>){
  if(!values.length)return null;
  const gcdNumber=(a:number,b:number)=>{a=Math.abs(Math.round(a));b=Math.abs(Math.round(b));while(b){const t=b;b=a%b;a=t}return a||1};
  let decimalNumerator=1,decimalDenominator=1;
  for(const value of values){
    const match=value?.trim().match(/^(\\d+)\\s*\\/\\s*(\\d+)$/);
    if(!match)return null;
    const numerator=Number(match[1]),denominator=Number(match[2]);
    if(!Number.isSafeInteger(numerator)||!Number.isSafeInteger(denominator)||denominator<=0)return null;
    decimalNumerator*=numerator+denominator;decimalDenominator*=denominator;
    const common=gcdNumber(decimalNumerator,decimalDenominator);decimalNumerator/=common;decimalDenominator/=common;
    if(!Number.isSafeInteger(decimalNumerator)||!Number.isSafeInteger(decimalDenominator))return null;
  }
  let numerator=decimalNumerator-decimalDenominator,denominator=decimalDenominator;
  const common=gcdNumber(numerator,denominator);numerator/=common;denominator/=common;
  return `${numerator}/${denominator}`;
}
'''
if 'function combinedFractionalOddsFromStrings' not in league:
    if helper_anchor not in league:
        raise SystemExit("Combined odds helper anchor not found")
    league = league.replace(helper_anchor, helper_code + helper_anchor, 1)

old_heading = '<div className="weeklyPicksHeading"><h3>Everyone at a glance</h3><div className={styles.title}>GAMEWEEK PICKS & LIVE RESULTS</div></div>'
new_heading = '<div className="weeklyPicksHeading"><div><h3>Everyone at a glance</h3><div className={styles.title}>GAMEWEEK PICKS & LIVE RESULTS</div></div><div className="weeklyCombinedOdds"><span>Combined BTTS odds</span><strong>{combinedFractionalOddsFromStrings(picks.filter(p=>p.fixture).map(p=>p.fixture?.odds_fractional))??"—"}</strong></div></div>'
if new_heading not in league:
    if old_heading not in league:
        raise SystemExit("Weekly picks combined odds heading anchor not found")
    league = league.replace(old_heading, new_heading, 1)

css_marker = '/* combined-odds-web-20260818 */'
if css_marker not in globals:
    globals += '''

/* combined-odds-web-20260818 */
.weeklyPicksHeading{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;width:100%}
.weeklyCombinedOdds{display:flex;align-items:baseline;gap:7px;white-space:nowrap;color:#bda58e;font-size:9px;letter-spacing:.07em;text-transform:uppercase}
.weeklyCombinedOdds strong{color:#e8c77c;font-size:15px;letter-spacing:.02em;text-transform:none}
@media(max-width:650px){
  .weeklyPicksHeading{align-items:flex-end;gap:8px}
  .weeklyCombinedOdds{font-size:7px;gap:4px}
  .weeklyCombinedOdds strong{font-size:12px}
}
'''

league_path.write_text(league)
globals_path.write_text(globals)
print("Applied website combined BTTS odds")
