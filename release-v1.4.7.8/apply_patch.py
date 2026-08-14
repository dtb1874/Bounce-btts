from pathlib import Path
import re

path = Path('app/LeagueApp.tsx')
text = path.read_text()
text = re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.4.7.8";', text, count=1)
text = re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "14 Aug 2026";', text, count=1)
needle = 'const releases=[\n    {version:"1.4.7.7"'
replacement = 'const releases=[\n    {version:"1.4.7.8",date:"14 Aug 2026",summary:"English League One / League Two share order corrected",changes:["Weekly picks share now places English League One above English League Two when kickoff times match","English competition hierarchy is now Premier League, Championship, League One, League Two","No scoring, odds calculation or fixture data behaviour changed"]},\n    {version:"1.4.7.7"'
if needle not in text:
    raise SystemExit('Could not locate v1.4.7.7 release history entry')
text = text.replace(needle, replacement, 1)
path.write_text(text)
