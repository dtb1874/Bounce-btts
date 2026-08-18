from pathlib import Path

public_path = Path("app/PublicLeagueTable.tsx")
public_data_path = Path("lib/public-table.ts")
league_path = Path("app/LeagueApp.tsx")
globals_path = Path("app/globals.css")

public = public_path.read_text()
public_data = public_data_path.read_text()
league = league_path.read_text()
globals = globals_path.read_text()

# Public data: enrich player stats without changing scoring or stored data.
old_type = '''export type PublicPlayerInsight = {
  id: string;
  name: string;
  goals: number;
  averageGoals: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  favouriteCompetition: string;
};'''
new_type = '''export type PublicPlayerInsight = {
  id: string;
  name: string;
  goals: number;
  averageGoals: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  favouriteCompetition: string;
  strikeRate: number;
  pointsPerPick: number;
  currentStreak: number;
  bestStreak: number;
};'''
if new_type not in public_data:
    if old_type not in public_data:
        raise SystemExit("PublicPlayerInsight type anchor not found")
    public_data = public_data.replace(old_type, new_type, 1)

map_anchor = '  const playerInsights: PublicPlayerInsight[] = rows.map((row) => {\n    const memberPredictions = predictions.filter((prediction) => prediction.member_id === row.id);'
map_replace = '''  const gameweekNumberById = new Map((gameweeks ?? []).map((gameweek) => [gameweek.id, gameweek.number]));
  const playerInsights: PublicPlayerInsight[] = rows.map((row) => {
    const memberPredictions = predictions.filter((prediction) => prediction.member_id === row.id);
    const scoredPredictions = memberPredictions
      .filter((prediction) => prediction.points_awarded !== null)
      .sort((a, b) => (gameweekNumberById.get(a.gameweek_id) ?? 0) - (gameweekNumberById.get(b.gameweek_id) ?? 0));
    const scoredPoints = scoredPredictions.reduce((sum, prediction) => sum + Number(prediction.points_awarded ?? 0), 0);
    let bestStreak = 0;
    let runningStreak = 0;
    for (const prediction of scoredPredictions) {
      if (prediction.points_awarded === 3) {
        runningStreak += 1;
        bestStreak = Math.max(bestStreak, runningStreak);
      } else {
        runningStreak = 0;
      }
    }
    let currentStreak = 0;
    for (let index = scoredPredictions.length - 1; index >= 0; index -= 1) {
      if (scoredPredictions[index].points_awarded !== 3) break;
      currentStreak += 1;
    }'''
if 'const gameweekNumberById = new Map' not in public_data:
    if map_anchor not in public_data:
        raise SystemExit("Public player insight map anchor not found")
    public_data = public_data.replace(map_anchor, map_replace, 1)

return_anchor = '''      favouriteCompetition,
    };'''
return_replace = '''      favouriteCompetition,
      strikeRate: scoredPredictions.length ? (scoredPredictions.filter((prediction) => prediction.points_awarded === 3).length / scoredPredictions.length) * 100 : 0,
      pointsPerPick: scoredPredictions.length ? scoredPoints / scoredPredictions.length : 0,
      currentStreak,
      bestStreak,
    };'''
if 'strikeRate: scoredPredictions.length' not in public_data:
    if return_anchor not in public_data:
        raise SystemExit("Public player insight return anchor not found")
    public_data = public_data.replace(return_anchor, return_replace, 1)

# Public presentation: preserve every existing fact, but put the secondary facts behind one clean disclosure.
public = public.replace('<h3>Player Tendencies</h3>', '<h3>Player Stats</h3>')
public = public.replace('Tap a player to expand stats', 'Tap a player to expand stats')

old_stats = '''        <div className={styles.statCluster}>
          <div className={styles.statItem}><span>LEAGUE LEADER</span><strong>{rows[0]?.name ?? "—"}</strong><small>{rows[0] ? `${rows[0].points} pts` : "No scores yet"}</small></div>
          <div className={styles.statItem}><span>SEASON POT</span><strong>£{prizePot.toFixed(0)}</strong><small>{rows.length} active players</small></div>
          <div className={styles.statItem}><span>GOALS IN PICKS</span><strong>{leagueGoals}</strong><small>Finished selected fixtures</small></div>
          <div className={styles.statItem}><span>FINISHED PICKS</span><strong>{finishedPicks}</strong><small>{recordedSelections} selections recorded</small></div>
          {seasonFacts.map((fact) => <div className={styles.statItem} key={fact.label}><span>{fact.label}</span><strong>{fact.value}</strong><small>{fact.detail}</small></div>)}
        </div>'''
new_stats = '''        <div className={styles.statCluster}>
          <div className={styles.statItem}><span>LEAGUE LEADER</span><strong>{rows[0]?.name ?? "—"}</strong><small>{rows[0] ? `${rows[0].points} pts` : "No scores yet"}</small></div>
          <div className={styles.statItem}><span>SEASON POT</span><strong>£{prizePot.toFixed(0)}</strong><small>{rows.length} active players</small></div>
          <div className={styles.statItem}><span>LEAGUE STRIKE RATE</span><strong>{finishedPicks ? `${((rows.reduce((sum,row)=>sum+row.wins,0)/finishedPicks)*100).toFixed(1)}%` : "—"}</strong><small>{rows.reduce((sum,row)=>sum+row.wins,0)} BTTS wins</small></div>
          <div className={styles.statItem}><span>FORM LEADER</span><strong>{formRows[0]?.name ?? "—"}</strong><small>{formRows[0] ? `${formRows[0].total} pts across current form` : "Waiting for scored weeks"}</small></div>
          <div className={styles.statItem}><span>GOALS IN PICKS</span><strong>{leagueGoals}</strong><small>Finished selected fixtures</small></div>
          <div className={styles.statItem}><span>FINISHED PICKS</span><strong>{finishedPicks}</strong><small>{recordedSelections} selections recorded</small></div>
        </div>
        <details className="leagueMoreStats"><summary>More league stats <span>{seasonFacts.length}</span></summary><div className={styles.statCluster}>{seasonFacts.map((fact) => <div className={styles.statItem} key={fact.label}><span>{fact.label}</span><strong>{fact.value}</strong><small>{fact.detail}</small></div>)}</div></details>'''
if 'LEAGUE STRIKE RATE' not in public:
    if old_stats not in public:
        raise SystemExit("Public League Stats anchor not found")
    public = public.replace(old_stats, new_stats, 1)

old_details = '''              {open && <div className={styles.playerDetails}>
                <div><span>TOTAL GOALS</span><b>{row.goals}</b></div>
                <div><span>AVG GOALS / PICK</span><b>{row.averageGoals ? row.averageGoals.toFixed(1) : "—"}</b></div>
                <div><span>RESULT SPLIT</span><b>{row.homeWins}H · {row.draws}D · {row.awayWins}A</b></div>
                <div className={styles.playerCompetition}><span>MOST PICKED COMPETITION</span><b>{row.favouriteCompetition}</b></div>
              </div>}'''
new_details = '''              {open && <div className={styles.playerDetails}>
                <div className="playerStatHeadline"><span>STRIKE RATE</span><b>{row.strikeRate ? `${row.strikeRate.toFixed(1)}%` : "0.0%"}</b></div>
                <div className="playerStatHeadline"><span>POINTS / PICK</span><b>{row.pointsPerPick.toFixed(2)}</b></div>
                <div className="playerStatHeadline"><span>CURRENT BTTS STREAK</span><b>{row.currentStreak}</b></div>
                <div className="playerStatHeadline"><span>BEST BTTS STREAK</span><b>{row.bestStreak}</b></div>
                <div><span>TOTAL GOALS</span><b>{row.goals}</b></div>
                <div><span>AVG GOALS / PICK</span><b>{row.averageGoals ? row.averageGoals.toFixed(1) : "—"}</b></div>
                <div><span>RESULT SPLIT</span><b>{row.homeWins}H · {row.draws}D · {row.awayWins}A</b></div>
                <div className={styles.playerCompetition}><span>MOST PICKED COMPETITION</span><b>{row.favouriteCompetition}</b></div>
              </div>}'''
if 'CURRENT BTTS STREAK' not in public:
    if old_details not in public:
        raise SystemExit("Public player details anchor not found")
    public = public.replace(old_details, new_details, 1)

# Logged-in table is generated by apply_patch.py earlier in the build. Add the same hierarchy and metrics here.
league = league.replace('<h3>Player Tendencies</h3>', '<h3>Player Stats</h3>')

state_anchor = '  const [expandedPlayer,setExpandedPlayer]=useState<string|null>(null);\n  const prizePot=standings.length*entryFee;'
state_replace = '''  const [expandedPlayer,setExpandedPlayer]=useState<string|null>(null);
  const prizePot=standings.length*entryFee;
  const scoredPredictions=predictions.filter(p=>p.points_awarded!==null);
  const leagueStrikeRate=scoredPredictions.length?(scoredPredictions.filter(p=>p.points_awarded===3).length/scoredPredictions.length)*100:0;
  const bttsLeader=[...standings].sort((a,b)=>b.wins-a.wins||b.points-a.points)[0];
  const playerPerformance=(memberId:string)=>{
    const scored=predictions.filter(p=>p.member_id===memberId&&p.points_awarded!==null).sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime());
    const wins=scored.filter(p=>p.points_awarded===3).length;
    const points=scored.reduce((sum,p)=>sum+Number(p.points_awarded??0),0);
    let best=0,running=0;
    for(const pick of scored){if(pick.points_awarded===3){running+=1;best=Math.max(best,running)}else running=0}
    let current=0;for(let i=scored.length-1;i>=0;i--){if(scored[i].points_awarded!==3)break;current+=1}
    return {strikeRate:scored.length?(wins/scored.length)*100:0,pointsPerPick:scored.length?points/scored.length:0,currentStreak:current,bestStreak:best};
  };'''
if 'const playerPerformance=' not in league:
    if state_anchor not in league:
        raise SystemExit("Logged-in LeagueTable state anchor not found")
    league = league.replace(state_anchor, state_replace, 1)

old_logged_stats = '''<div className={publicStyles.statCluster}><div className={publicStyles.statItem}><span>LEAGUE LEADER</span><strong>{standings[0]?.name??"—"}</strong><small>{standings[0]?`${standings[0].points} pts`:"No scores yet"}</small></div><div className={publicStyles.statItem}><span>SEASON POT</span><strong>£{prizePot.toFixed(0)}</strong><small>{standings.length} active players</small></div><div className={publicStyles.statItem}><span>GOALS IN PICKS</span><strong>{leagueGoals}</strong><small>Finished selected fixtures</small></div><div className={publicStyles.statItem}><span>FINISHED PICKS</span><strong>{completed.length}</strong><small>{predictions.length} selections recorded</small></div>{facts.map(f=><div className={publicStyles.statItem} key={f.label}><span>{f.label}</span><strong>{f.value}</strong><small>{f.detail}</small></div>)}</div>'''
new_logged_stats = '''<div className={publicStyles.statCluster}><div className={publicStyles.statItem}><span>LEAGUE LEADER</span><strong>{standings[0]?.name??"—"}</strong><small>{standings[0]?`${standings[0].points} pts`:"No scores yet"}</small></div><div className={publicStyles.statItem}><span>SEASON POT</span><strong>£{prizePot.toFixed(0)}</strong><small>{standings.length} active players</small></div><div className={publicStyles.statItem}><span>LEAGUE STRIKE RATE</span><strong>{scoredPredictions.length?`${leagueStrikeRate.toFixed(1)}%`:"—"}</strong><small>{scoredPredictions.filter(p=>p.points_awarded===3).length} BTTS wins</small></div><div className={publicStyles.statItem}><span>BTTS LEADER</span><strong>{bttsLeader?.name??"—"}</strong><small>{bttsLeader?`${bttsLeader.wins} BTTS wins`:"No wins yet"}</small></div><div className={publicStyles.statItem}><span>GOALS IN PICKS</span><strong>{leagueGoals}</strong><small>Finished selected fixtures</small></div><div className={publicStyles.statItem}><span>FINISHED PICKS</span><strong>{completed.length}</strong><small>{predictions.length} selections recorded</small></div></div><details className="leagueMoreStats"><summary>More league stats <span>{facts.length}</span></summary><div className={publicStyles.statCluster}>{facts.map(f=><div className={publicStyles.statItem} key={f.label}><span>{f.label}</span><strong>{f.value}</strong><small>{f.detail}</small></div>)}</div></details>'''
if 'BTTS LEADER' not in league:
    if old_logged_stats not in league:
        raise SystemExit("Logged-in League Stats anchor not found")
    league = league.replace(old_logged_stats, new_logged_stats, 1)

old_logged_details = '''{open&&<div className={publicStyles.playerDetails}><div><span>TOTAL GOALS</span><b>{r.goals}</b></div><div><span>AVG GOALS / PICK</span><b>{r.average?r.average.toFixed(1):"—"}</b></div><div><span>RESULT SPLIT</span><b>{r.home}H · {r.draws}D · {r.away}A</b></div><div className={publicStyles.playerCompetition}><span>MOST PICKED COMPETITION</span><b>{r.favourite}</b></div></div>}'''
new_logged_details = '''{open&&(()=>{const perf=playerPerformance(r.id);return <div className={publicStyles.playerDetails}><div className="playerStatHeadline"><span>STRIKE RATE</span><b>{perf.strikeRate.toFixed(1)}%</b></div><div className="playerStatHeadline"><span>POINTS / PICK</span><b>{perf.pointsPerPick.toFixed(2)}</b></div><div className="playerStatHeadline"><span>CURRENT BTTS STREAK</span><b>{perf.currentStreak}</b></div><div className="playerStatHeadline"><span>BEST BTTS STREAK</span><b>{perf.bestStreak}</b></div><div><span>TOTAL GOALS</span><b>{r.goals}</b></div><div><span>AVG GOALS / PICK</span><b>{r.average?r.average.toFixed(1):"—"}</b></div><div><span>RESULT SPLIT</span><b>{r.home}H · {r.draws}D · {r.away}A</b></div><div className={publicStyles.playerCompetition}><span>MOST PICKED COMPETITION</span><b>{r.favourite}</b></div></div>})()}'''
if 'perf.currentStreak' not in league:
    if old_logged_details not in league:
        raise SystemExit("Logged-in player details anchor not found")
    league = league.replace(old_logged_details, new_logged_details, 1)

css_marker='/* player-stats-presentation-20260818 */'
if css_marker not in globals:
    globals += '''

/* player-stats-presentation-20260818 */
.leagueMoreStats{margin-top:10px;border-top:1px solid rgba(216,183,111,.12);padding-top:8px}
.leagueMoreStats>summary{display:flex;align-items:center;justify-content:space-between;gap:10px;list-style:none;cursor:pointer;padding:8px 4px;color:#c6b7a8;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.leagueMoreStats>summary::-webkit-details-marker{display:none}
.leagueMoreStats>summary span{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border:1px solid rgba(216,183,111,.2);border-radius:999px;color:#d8b76f;font-size:9px}
.leagueMoreStats[open]>summary{color:#ead9c4}
.leagueMoreStats[open] .statCluster{margin-top:4px}
.playerStatHeadline{background:rgba(113,31,49,.12);border-color:rgba(216,183,111,.18)!important}
.playerStatHeadline b{color:#efd08b!important;font-size:14px!important}
@media(max-width:650px){.leagueMoreStats{margin-top:7px}.leagueMoreStats>summary{padding:7px 2px;font-size:9px}.playerStatHeadline b{font-size:12px!important}}
'''

public_path.write_text(public)
public_data_path.write_text(public_data)
league_path.write_text(league)
globals_path.write_text(globals)
print("Applied structured League Stats and expanded Player Stats presentation")
