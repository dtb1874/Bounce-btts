from pathlib import Path

public_path = Path("app/PublicLeagueTable.tsx")
public_data_path = Path("lib/public-table.ts")
league_path = Path("app/LeagueApp.tsx")

public = public_path.read_text()
public_data = public_data_path.read_text()
league = league_path.read_text()

# -----------------------------
# Public/read-only data model
# -----------------------------
old_insight_tail = '''  strikeRate: number;
  pointsPerPick: number;
  currentStreak: number;
  bestStreak: number;
};'''
new_insight_tail = '''  strikeRate: number;
  pointsPerPick: number;
  currentStreak: number;
  bestStreak: number;
  longestWinlessStreak: number;
  averageSelectedOdds: number | null;
  averageWinningOdds: number | null;
  biggestWinningOdds: number | null;
};'''
if new_insight_tail not in public_data:
    if old_insight_tail not in public_data:
        raise SystemExit("PublicPlayerInsight extension anchor not found")
    public_data = public_data.replace(old_insight_tail, new_insight_tail, 1)

old_fixture_type = '''type PublicFixture = {
  id: string;
  competition: string | null;
  home_score: number | null;
  away_score: number | null;
};'''
new_fixture_type = '''type PublicFixture = {
  id: string;
  competition: string | null;
  home_score: number | null;
  away_score: number | null;
  odds_fractional: string | null;
};

function fractionalOddsRatio(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.trim().match(/^(-?\\d+(?:\\.\\d+)?)\\s*\\/\\s*(\\d+(?:\\.\\d+)?)$/);
  if (!match) return null;
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return numerator / denominator;
}'''
if 'function fractionalOddsRatio' not in public_data:
    if old_fixture_type not in public_data:
        raise SystemExit("PublicFixture type anchor not found")
    public_data = public_data.replace(old_fixture_type, new_fixture_type, 1)

old_fixture_select = '.select("id,competition,home_score,away_score")'
new_fixture_select = '.select("id,competition,home_score,away_score,odds_fractional")'
if new_fixture_select not in public_data:
    if old_fixture_select not in public_data:
        raise SystemExit("Public fixture select anchor not found")
    public_data = public_data.replace(old_fixture_select, new_fixture_select, 1)

old_favourite = '''    const favouriteCompetition = [...competitions.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "—";
    return {'''
new_favourite = '''    const favouriteCompetition = [...competitions.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "—";
    const selectedOdds = memberPredictions
      .map((prediction) => fractionalOddsRatio(fixtureById.get(prediction.fixture_id)?.odds_fractional))
      .filter((value): value is number => value !== null);
    const winningOdds = scoredPredictions
      .filter((prediction) => prediction.points_awarded === 3)
      .map((prediction) => fractionalOddsRatio(fixtureById.get(prediction.fixture_id)?.odds_fractional))
      .filter((value): value is number => value !== null);
    let longestWinlessStreak = 0;
    let runningWinless = 0;
    for (const prediction of scoredPredictions) {
      if (prediction.points_awarded === 3) {
        runningWinless = 0;
      } else {
        runningWinless += 1;
        longestWinlessStreak = Math.max(longestWinlessStreak, runningWinless);
      }
    }
    return {'''
if 'const selectedOdds = memberPredictions' not in public_data:
    if old_favourite not in public_data:
        raise SystemExit("Public odds calculation anchor not found")
    public_data = public_data.replace(old_favourite, new_favourite, 1)

old_return_tail = '''      currentStreak,
      bestStreak,
    };'''
new_return_tail = '''      currentStreak,
      bestStreak,
      longestWinlessStreak,
      averageSelectedOdds: selectedOdds.length ? selectedOdds.reduce((sum, value) => sum + value, 0) / selectedOdds.length : null,
      averageWinningOdds: winningOdds.length ? winningOdds.reduce((sum, value) => sum + value, 0) / winningOdds.length : null,
      biggestWinningOdds: winningOdds.length ? Math.max(...winningOdds) : null,
    };'''
if 'averageSelectedOdds: selectedOdds.length' not in public_data:
    if old_return_tail not in public_data:
        raise SystemExit("Public insight return extension anchor not found")
    public_data = public_data.replace(old_return_tail, new_return_tail, 1)

old_fact_anchor = '''  const bttsKing = [...rows].sort((a, b) => b.wins - a.wins || b.points - a.points)[0];
  const seasonFacts: PublicSeasonFact[] = ['''
new_fact_anchor = '''  const bttsKing = [...rows].sort((a, b) => b.wins - a.wins || b.points - a.points)[0];
  const biggestOddsWinner = [...playerInsights].filter((item) => item.biggestWinningOdds !== null).sort((a, b) => Number(b.biggestWinningOdds) - Number(a.biggestWinningOdds))[0];
  const longestBttsStreak = [...playerInsights].sort((a, b) => b.bestStreak - a.bestStreak || a.name.localeCompare(b.name))[0];
  const longestWinlessRun = [...playerInsights].sort((a, b) => b.longestWinlessStreak - a.longestWinlessStreak || a.name.localeCompare(b.name))[0];
  const bestAverageWinningOdds = [...playerInsights].filter((item) => item.averageWinningOdds !== null).sort((a, b) => Number(b.averageWinningOdds) - Number(a.averageWinningOdds))[0];
  const seasonFacts: PublicSeasonFact[] = ['''
if 'const biggestOddsWinner =' not in public_data:
    if old_fact_anchor not in public_data:
        raise SystemExit("Season fact leader anchor not found")
    public_data = public_data.replace(old_fact_anchor, new_fact_anchor, 1)

old_facts_end = '''    { label: "DRAW MAGNET", value: drawMagnet?.draws ? drawMagnet.name : "—", detail: drawMagnet?.draws ? `${drawMagnet.draws} selected games ended level` : "No trend yet" },
  ];'''
new_facts_end = '''    { label: "DRAW MAGNET", value: drawMagnet?.draws ? drawMagnet.name : "—", detail: drawMagnet?.draws ? `${drawMagnet.draws} selected games ended level` : "No trend yet" },
    { label: "BIGGEST ODDS WINNER", value: biggestOddsWinner?.biggestWinningOdds != null ? biggestOddsWinner.name : "—", detail: biggestOddsWinner?.biggestWinningOdds != null ? `${biggestOddsWinner.biggestWinningOdds.toFixed(2)}/1 winning BTTS price` : "Waiting for priced winners" },
    { label: "LONGEST BTTS STREAK", value: longestBttsStreak?.bestStreak ? longestBttsStreak.name : "—", detail: longestBttsStreak?.bestStreak ? `${longestBttsStreak.bestStreak} consecutive BTTS wins` : "No streak yet" },
    { label: "LONGEST WINLESS RUN", value: longestWinlessRun?.longestWinlessStreak ? longestWinlessRun.name : "—", detail: longestWinlessRun?.longestWinlessStreak ? `${longestWinlessRun.longestWinlessStreak} consecutive non-winning picks` : "No run yet" },
    { label: "VALUE HUNTER", value: bestAverageWinningOdds?.averageWinningOdds != null ? bestAverageWinningOdds.name : "—", detail: bestAverageWinningOdds?.averageWinningOdds != null ? `${bestAverageWinningOdds.averageWinningOdds.toFixed(2)}/1 average winning odds` : "Waiting for priced winners" },
  ];'''
if 'BIGGEST ODDS WINNER' not in public_data:
    if old_facts_end not in public_data:
        raise SystemExit("Season facts end anchor not found")
    public_data = public_data.replace(old_facts_end, new_facts_end, 1)

# -----------------------------
# Public/player presentation
# -----------------------------
old_public_details = '''                <div className="playerStatHeadline"><span>CURRENT BTTS STREAK</span><b>{row.currentStreak}</b></div>
                <div className="playerStatHeadline"><span>BEST BTTS STREAK</span><b>{row.bestStreak}</b></div>
                <div><span>TOTAL GOALS</span><b>{row.goals}</b></div>'''
new_public_details = '''                <div className="playerStatHeadline"><span>CURRENT BTTS STREAK</span><b>{row.currentStreak}</b></div>
                <div className="playerStatHeadline"><span>BEST BTTS STREAK</span><b>{row.bestStreak}</b></div>
                <div><span>AVG SELECTED ODDS</span><b>{row.averageSelectedOdds == null ? "—" : `${row.averageSelectedOdds.toFixed(2)}/1`}</b></div>
                <div><span>AVG WINNING ODDS</span><b>{row.averageWinningOdds == null ? "—" : `${row.averageWinningOdds.toFixed(2)}/1`}</b></div>
                <div><span>BIGGEST WINNING ODDS</span><b>{row.biggestWinningOdds == null ? "—" : `${row.biggestWinningOdds.toFixed(2)}/1`}</b></div>
                <div><span>LONGEST WINLESS RUN</span><b>{row.longestWinlessStreak}</b></div>
                <div><span>TOTAL GOALS</span><b>{row.goals}</b></div>'''
if 'AVG SELECTED ODDS' not in public:
    if old_public_details not in public:
        raise SystemExit("Public expanded stats anchor not found")
    public = public.replace(old_public_details, new_public_details, 1)

# -----------------------------
# Logged-in League Table
# -----------------------------
old_perf_head = '''  const playerPerformance=(memberId:string)=>{
    const scored=predictions.filter(p=>p.member_id===memberId&&p.points_awarded!==null).sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime());'''
new_perf_head = '''  const oddsRatio=(value:string|null|undefined)=>{if(!value)return null;const m=value.trim().match(/^(-?\\d+(?:\\.\\d+)?)\\s*\\/\\s*(\\d+(?:\\.\\d+)?)$/);if(!m)return null;const n=Number(m[1]),d=Number(m[2]);return Number.isFinite(n)&&Number.isFinite(d)&&d!==0?n/d:null};
  const playerPerformance=(memberId:string)=>{
    const selected=predictions.filter(p=>p.member_id===memberId);
    const scored=selected.filter(p=>p.points_awarded!==null).sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime());'''
if 'const oddsRatio=' not in league:
    if old_perf_head not in league:
        raise SystemExit("Logged-in playerPerformance head anchor not found")
    league = league.replace(old_perf_head, new_perf_head, 1)

old_perf_tail = '''    let current=0;for(let i=scored.length-1;i>=0;i--){if(scored[i].points_awarded!==3)break;current+=1}
    return {strikeRate:scored.length?(wins/scored.length)*100:0,pointsPerPick:scored.length?points/scored.length:0,currentStreak:current,bestStreak:best};
  };'''
new_perf_tail = '''    let current=0;for(let i=scored.length-1;i>=0;i--){if(scored[i].points_awarded!==3)break;current+=1}
    let longestWinless=0,runWinless=0;for(const pick of scored){if(pick.points_awarded===3){runWinless=0}else{runWinless+=1;longestWinless=Math.max(longestWinless,runWinless)}}
    const selectedOdds=selected.map(p=>oddsRatio(fixtures.find(f=>f.id===p.fixture_id)?.odds_fractional)).filter((v):v is number=>v!==null);
    const winningOdds=scored.filter(p=>p.points_awarded===3).map(p=>oddsRatio(fixtures.find(f=>f.id===p.fixture_id)?.odds_fractional)).filter((v):v is number=>v!==null);
    return {strikeRate:scored.length?(wins/scored.length)*100:0,pointsPerPick:scored.length?points/scored.length:0,currentStreak:current,bestStreak:best,longestWinlessStreak:longestWinless,averageSelectedOdds:selectedOdds.length?selectedOdds.reduce((s,v)=>s+v,0)/selectedOdds.length:null,averageWinningOdds:winningOdds.length?winningOdds.reduce((s,v)=>s+v,0)/winningOdds.length:null,biggestWinningOdds:winningOdds.length?Math.max(...winningOdds):null};
  };
  const performanceRows=standings.map(s=>({name:s.name,...playerPerformance(s.id)}));
  const biggestOddsWinner=[...performanceRows].filter(r=>r.biggestWinningOdds!==null).sort((a,b)=>Number(b.biggestWinningOdds)-Number(a.biggestWinningOdds))[0];
  const longestBttsStreak=[...performanceRows].sort((a,b)=>b.bestStreak-a.bestStreak||a.name.localeCompare(b.name))[0];
  const longestWinlessRun=[...performanceRows].sort((a,b)=>b.longestWinlessStreak-a.longestWinlessStreak||a.name.localeCompare(b.name))[0];
  const valueHunter=[...performanceRows].filter(r=>r.averageWinningOdds!==null).sort((a,b)=>Number(b.averageWinningOdds)-Number(a.averageWinningOdds))[0];'''
if 'const performanceRows=' not in league:
    if old_perf_tail not in league:
        raise SystemExit("Logged-in playerPerformance tail anchor not found")
    league = league.replace(old_perf_tail, new_perf_tail, 1)

old_logged_details = '''<div className="playerStatHeadline"><span>CURRENT BTTS STREAK</span><b>{perf.currentStreak}</b></div><div className="playerStatHeadline"><span>BEST BTTS STREAK</span><b>{perf.bestStreak}</b></div><div><span>TOTAL GOALS</span><b>{r.goals}</b></div>'''
new_logged_details = '''<div className="playerStatHeadline"><span>CURRENT BTTS STREAK</span><b>{perf.currentStreak}</b></div><div className="playerStatHeadline"><span>BEST BTTS STREAK</span><b>{perf.bestStreak}</b></div><div><span>AVG SELECTED ODDS</span><b>{perf.averageSelectedOdds==null?"—":`${perf.averageSelectedOdds.toFixed(2)}/1`}</b></div><div><span>AVG WINNING ODDS</span><b>{perf.averageWinningOdds==null?"—":`${perf.averageWinningOdds.toFixed(2)}/1`}</b></div><div><span>BIGGEST WINNING ODDS</span><b>{perf.biggestWinningOdds==null?"—":`${perf.biggestWinningOdds.toFixed(2)}/1`}</b></div><div><span>LONGEST WINLESS RUN</span><b>{perf.longestWinlessStreak}</b></div><div><span>TOTAL GOALS</span><b>{r.goals}</b></div>'''
if 'perf.averageSelectedOdds' not in league:
    if old_logged_details not in league:
        raise SystemExit("Logged-in expanded stats anchor not found")
    league = league.replace(old_logged_details, new_logged_details, 1)

records_markup = '''<div className={publicStyles.statItem}><span>BIGGEST ODDS WINNER</span><strong>{biggestOddsWinner?.name??"—"}</strong><small>{biggestOddsWinner?.biggestWinningOdds==null?"Waiting for priced winners":`${biggestOddsWinner.biggestWinningOdds.toFixed(2)}/1 winning BTTS price`}</small></div><div className={publicStyles.statItem}><span>LONGEST BTTS STREAK</span><strong>{longestBttsStreak?.bestStreak?longestBttsStreak.name:"—"}</strong><small>{longestBttsStreak?.bestStreak?`${longestBttsStreak.bestStreak} consecutive BTTS wins`:"No streak yet"}</small></div><div className={publicStyles.statItem}><span>LONGEST WINLESS RUN</span><strong>{longestWinlessRun?.longestWinlessStreak?longestWinlessRun.name:"—"}</strong><small>{longestWinlessRun?.longestWinlessStreak?`${longestWinlessRun.longestWinlessStreak} consecutive non-winning picks`:"No run yet"}</small></div><div className={publicStyles.statItem}><span>VALUE HUNTER</span><strong>{valueHunter?.name??"—"}</strong><small>{valueHunter?.averageWinningOdds==null?"Waiting for priced winners":`${valueHunter.averageWinningOdds.toFixed(2)}/1 average winning odds`}</small></div>'''
if 'biggestOddsWinner?.biggestWinningOdds' not in league:
    details_start = league.find('<details className="leagueMoreStats">')
    if details_start < 0:
        raise SystemExit("Logged-in More league stats block not found")
    details_close = league.find('</div></details>', details_start)
    if details_close < 0:
        raise SystemExit("Logged-in More league stats closing block not found")
    league = league[:details_close] + records_markup + league[details_close:]

public_path.write_text(public)
public_data_path.write_text(public_data)
league_path.write_text(league)
print("Applied extended current-season odds and streak statistics")
