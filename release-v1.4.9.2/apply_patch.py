from pathlib import Path
import re

league=Path('app/LeagueApp.tsx')
s=league.read_text()
s=re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.4.9.2";', s, count=1)
s=re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "15 Aug 2026";', s, count=1)

old='picks={picks.filter(p=>p.fixture).map(p=>({player:p.profile.display_name,homeTeam:p.fixture!.home_team,awayTeam:p.fixture!.away_team,competition:competitionDisplayName(p.fixture!),kickoffAt:p.fixture!.kickoff_at,odds:p.fixture!.odds_fractional}))}'
new='picks={picks.filter(p=>p.fixture).map(p=>({player:p.profile.display_name,homeTeam:p.fixture!.home_team,awayTeam:p.fixture!.away_team,competition:competitionDisplayName(p.fixture!),kickoffAt:p.fixture!.kickoff_at,odds:p.fixture!.odds_fractional,status:p.fixture!.status,homeScore:p.fixture!.home_score,awayScore:p.fixture!.away_score,elapsed:p.fixture!.live_elapsed??null}))}'
if old not in s: raise SystemExit('Could not locate weekly share picks mapping')
s=s.replace(old,new,1)

needle='const releases=[\n    {version:"1.4.9.1"'
replacement='const releases=[\n    {version:"1.4.9.2",date:"15 Aug 2026",summary:"Shared weekly picks now reflect live scoring",changes:["Share Weekly Picks now uses the same current live score, match status and elapsed-minute data visible on the Dashboard","Live matches are shown in the shared image with score and minute, for example 1–1 · 67′","Half-time and finished fixtures display HT / FT states cleanly in the shared image","The share image reflects the latest in-app live refresh rather than only static fixture and odds information"]},\n    {version:"1.4.9.1"'
if needle not in s: raise SystemExit('Could not locate v1.4.9.1 release entry')
s=s.replace(needle,replacement,1)
league.write_text(s)
