from pathlib import Path

path = Path("release-v1.4.9.2/extended-season-stats.py")
text = path.read_text()
start_marker = "old_more_stats_close = '''"
end_marker = "public_path.write_text(public)"

start = text.find(start_marker)
end = text.find(end_marker)
if start < 0 or end < 0 or end <= start:
    raise SystemExit("Extended stats preparation markers not found")

replacement = r'''records_markup = '''<div className={publicStyles.statItem}><span>BIGGEST ODDS WINNER</span><strong>{biggestOddsWinner?.name??"—"}</strong><small>{biggestOddsWinner?.biggestWinningOdds==null?"Waiting for priced winners":`${biggestOddsWinner.biggestWinningOdds.toFixed(2)}/1 winning BTTS price`}</small></div><div className={publicStyles.statItem}><span>LONGEST BTTS STREAK</span><strong>{longestBttsStreak?.bestStreak?longestBttsStreak.name:"—"}</strong><small>{longestBttsStreak?.bestStreak?`${longestBttsStreak.bestStreak} consecutive BTTS wins`:"No streak yet"}</small></div><div className={publicStyles.statItem}><span>LONGEST WINLESS RUN</span><strong>{longestWinlessRun?.longestWinlessStreak?longestWinlessRun.name:"—"}</strong><small>{longestWinlessRun?.longestWinlessStreak?`${longestWinlessRun.longestWinlessStreak} consecutive non-winning picks`:"No run yet"}</small></div><div className={publicStyles.statItem}><span>VALUE HUNTER</span><strong>{valueHunter?.name??"—"}</strong><small>{valueHunter?.averageWinningOdds==null?"Waiting for priced winners":`${valueHunter.averageWinningOdds.toFixed(2)}/1 average winning odds`}</small></div>'''
if 'biggestOddsWinner?.biggestWinningOdds' not in league:
    details_start = league.find('<details className="leagueMoreStats">')
    if details_start < 0:
        raise SystemExit("Logged-in More league stats block not found")
    details_close = league.find('</div></details>', details_start)
    if details_close < 0:
        raise SystemExit("Logged-in More league stats closing block not found")
    league = league[:details_close] + records_markup + league[details_close:]

'''

text = text[:start] + replacement + text[end:]
path.write_text(text)
print("Prepared resilient extended season stats patch")
