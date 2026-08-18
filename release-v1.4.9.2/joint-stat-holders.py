from pathlib import Path
import re

public_data_path = Path("lib/public-table.ts")
public_view_path = Path("app/PublicLeagueTable.tsx")
league_path = Path("app/LeagueApp.tsx")
globals_path = Path("app/globals.css")

public_data = public_data_path.read_text()
public_view = public_view_path.read_text()
league = league_path.read_text()
globals = globals_path.read_text()

# Public/read-only stats: replace single-winner sorting with genuine joint holders.
public_pattern = re.compile(r"  const goalMagnet = .*?\n\n  const namedProfiles", re.S)
public_replacement = '''  const jointTop = <T extends { name: string }>(items: T[], score: (item: T) => number | null | undefined) => {
    const scored = items.map((item) => ({ item, score: Number(score(item) ?? 0) })).filter((row) => Number.isFinite(row.score) && row.score > 0);
    if (!scored.length) return { names: [] as string[], score: 0 };
    const top = Math.max(...scored.map((row) => row.score));
    return { names: scored.filter((row) => row.score === top).map((row) => row.item.name).sort((a, b) => a.localeCompare(b)), score: top };
  };
  const goalMagnet = jointTop(playerInsights, (item) => item.goals);
  const homeHunter = jointTop(playerInsights, (item) => item.homeWins);
  const awayHunter = jointTop(playerInsights, (item) => item.awayWins);
  const drawMagnet = jointTop(playerInsights, (item) => item.draws);
  const bttsKing = jointTop(rows, (item) => item.wins);
  const biggestOddsWinner = jointTop(playerInsights, (item) => item.biggestWinningOdds);
  const longestBttsStreak = jointTop(playerInsights, (item) => item.bestStreak);
  const longestWinlessRun = jointTop(playerInsights, (item) => item.longestWinlessStreak);
  const bestAverageWinningOdds = jointTop(playerInsights, (item) => item.averageWinningOdds);
  const fact = (single: string, plural: string, record: { names: string[]; score: number }, detail: (score: number) => string, empty: string): PublicSeasonFact => ({
    label: record.names.length > 1 ? plural : single,
    value: record.names.length ? record.names.join(", ") : "—",
    detail: record.names.length ? detail(record.score) : empty,
  });
  const seasonFacts: PublicSeasonFact[] = [
    fact("GOAL MAGNET", "GOAL MAGNETS", goalMagnet, (score) => `${score} goals in finished picks`, "Waiting for finished picks"),
    fact("BTTS KING", "BTTS KINGS", bttsKing, (score) => `${score} BTTS wins`, "No BTTS wins yet"),
    fact("HOME-WIN HUNTER", "HOME-WIN HUNTERS", homeHunter, (score) => `${score} selected games ended home wins`, "No trend yet"),
    fact("AWAY-WIN HUNTER", "AWAY-WIN HUNTERS", awayHunter, (score) => `${score} selected games ended away wins`, "No trend yet"),
    fact("DRAW MAGNET", "DRAW MAGNETS", drawMagnet, (score) => `${score} selected games ended level`, "No trend yet"),
    fact("BIGGEST ODDS WINNER", "BIGGEST ODDS WINNERS", biggestOddsWinner, (score) => `${score.toFixed(2)}/1 winning BTTS price`, "Waiting for priced winners"),
    fact("LONGEST BTTS STREAK", "LONGEST BTTS STREAKS", longestBttsStreak, (score) => `${score} consecutive BTTS wins`, "No streak yet"),
    fact("LONGEST WINLESS RUN", "LONGEST WINLESS RUNS", longestWinlessRun, (score) => `${score} consecutive non-winning picks`, "No run yet"),
    fact("VALUE HUNTER", "VALUE HUNTERS", bestAverageWinningOdds, (score) => `${score.toFixed(2)}/1 average winning odds`, "Waiting for priced winners"),
  ];

  const namedProfiles'''
public_data, count = public_pattern.subn(public_replacement, public_data, count=1)
if count != 1:
    raise SystemExit("Public season fact block not found")

# Public card: compact typography only when a value contains multiple names.
public_view = public_view.replace(
    '<strong>{fact.value}</strong>',
    '<strong className={fact.value.includes(", ") ? "jointStatValue" : undefined}>{fact.value}</strong>'
)

# Logged-in table: replace single-holder base facts with the same joint-holder rule.
league_pattern = re.compile(
    r"  const goalKing=\[\.\.\.insights\].*?\n  const facts=\[.*?\];",
    re.S,
)
league_replacement = '''  const jointRecord=(items:any[],score:(item:any)=>number|null|undefined)=>{const scored=items.map(item=>({item,score:Number(score(item)??0)})).filter(row=>Number.isFinite(row.score)&&row.score>0);if(!scored.length)return {names:[] as string[],score:0};const top=Math.max(...scored.map(row=>row.score));return {names:scored.filter(row=>row.score===top).map(row=>String(row.item.name)).sort((a,b)=>a.localeCompare(b)),score:top}};
  const goalKing=jointRecord(insights,r=>r.goals);const homeHunter=jointRecord(insights,r=>r.home);const awayHunter=jointRecord(insights,r=>r.away);const drawMagnet=jointRecord(insights,r=>r.draws);const bttsKings=jointRecord(insights,r=>r.wins);const leagueGoals=completed.reduce((sum,x)=>sum+Number(x.fixture.home_score??0)+Number(x.fixture.away_score??0),0);
  const biggestOddsWinners=jointRecord(performanceRows,r=>r.biggestWinningOdds);const longestBttsStreaks=jointRecord(performanceRows,r=>r.bestStreak);const longestWinlessRuns=jointRecord(performanceRows,r=>r.longestWinlessStreak);const valueHunters=jointRecord(performanceRows,r=>r.averageWinningOdds);
  const fact=(single:string,plural:string,record:{names:string[];score:number},detail:(score:number)=>string,empty:string)=>({label:record.names.length>1?plural:single,value:record.names.length?record.names.join(", "):"—",detail:record.names.length?detail(record.score):empty});
  const facts=[fact("GOAL MAGNET","GOAL MAGNETS",goalKing,score=>`${score} goals in finished picks`,"Waiting for finished picks"),fact("BTTS KING","BTTS KINGS",bttsKings,score=>`${score} BTTS wins`,"No BTTS wins yet"),fact("HOME-WIN HUNTER","HOME-WIN HUNTERS",homeHunter,score=>`${score} selected matches ended home wins`,"No trend yet"),fact("AWAY-WIN HUNTER","AWAY-WIN HUNTERS",awayHunter,score=>`${score} selected matches ended away wins`,"No trend yet"),fact("DRAW MAGNET","DRAW MAGNETS",drawMagnet,score=>`${score} selected matches ended level`,"No trend yet"),fact("BIGGEST ODDS WINNER","BIGGEST ODDS WINNERS",biggestOddsWinners,score=>`${score.toFixed(2)}/1 winning BTTS price`,"Waiting for priced winners"),fact("LONGEST BTTS STREAK","LONGEST BTTS STREAKS",longestBttsStreaks,score=>`${score} consecutive BTTS wins`,"No streak yet"),fact("LONGEST WINLESS RUN","LONGEST WINLESS RUNS",longestWinlessRuns,score=>`${score} consecutive non-winning picks`,"No run yet"),fact("VALUE HUNTER","VALUE HUNTERS",valueHunters,score=>`${score.toFixed(2)}/1 average winning odds`,"Waiting for priced winners")];'''
league, count = league_pattern.subn(league_replacement, league, count=1)
if count != 1:
    raise SystemExit("Logged-in base fact block not found")

# Remove the four separately rendered extended-record cards; they now live in facts[] with tie handling.
league = re.sub(
    r'<div className=\{publicStyles\.statItem\}><span>BIGGEST ODDS WINNER</span>.*?<div className=\{publicStyles\.statItem\}><span>VALUE HUNTER</span>.*?</div>',
    '',
    league,
    count=1,
    flags=re.S,
)

# Compact joint-holder names in logged-in More League Stats too.
league = league.replace(
    '<strong>{f.value}</strong>',
    '<strong className={f.value.includes(", ")?"jointStatValue":undefined}>{f.value}</strong>'
)

if '/* joint-stat-holder-typography-20260818 */' not in globals:
    globals += '''\n\n/* joint-stat-holder-typography-20260818 */\n.jointStatValue{font-size:clamp(10px,1.45vw,13px)!important;line-height:1.15!important;white-space:normal!important;overflow-wrap:anywhere;word-break:normal}\n@media(max-width:650px){.jointStatValue{font-size:10px!important;line-height:1.12!important}}\n'''

public_data_path.write_text(public_data)
public_view_path.write_text(public_view)
league_path.write_text(league)
globals_path.write_text(globals)
print("Applied joint-holder league stats and compact tied-name presentation")
