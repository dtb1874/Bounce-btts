from pathlib import Path
import re

# Fix the server-selected gameweek. A future gameweek must not become the default
# merely because the previous gameweek has locked; it becomes default only once
# its opens_at has actually been reached.
page=Path('app/page.tsx')
p=page.read_text()
old='''  const gameweek =\n    seasonGameweeks.find((item) => item.status === "open" && (!item.opens_at || item.opens_at <= nowIso) && item.locks_at > nowIso) ??\n    seasonGameweeks.find((item) => item.locks_at > nowIso) ??\n    seasonGameweeks[seasonGameweeks.length - 1] ??\n    null;'''
new='''  const openedGameweeks = seasonGameweeks.filter((item) => !item.opens_at || item.opens_at <= nowIso);\n  const gameweek =\n    openedGameweeks.find((item) => item.status === "open" && item.locks_at > nowIso) ??\n    openedGameweeks[openedGameweeks.length - 1] ??\n    seasonGameweeks.find((item) => !item.opens_at || item.opens_at <= nowIso) ??\n    seasonGameweeks[0] ??\n    null;'''
if old not in p:
    raise SystemExit('Could not locate default gameweek selection')
p=p.replace(old,new,1)
page.write_text(p)

league=Path('app/LeagueApp.tsx')
s=league.read_text()
s=re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.4.9.5";', s, count=1)
s=re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "15 Aug 2026";', s, count=1)
needle='const releases=[\n    {version:"1.4.9.4"'
replacement='const releases=[\n    {version:"1.4.9.5",date:"15 Aug 2026",summary:"Dashboard gameweek default corrected",changes:["Opening the app now defaults to the latest gameweek whose opening time has actually been reached","A future gameweek no longer becomes the Dashboard default simply because the previous gameweek has locked","GW3 will therefore become the default automatically only once GW3 is open; users can still manually view other gameweeks with the selector"]},\n    {version:"1.4.9.4"'
if needle not in s:
    raise SystemExit('Could not locate v1.4.9.4 release entry')
s=s.replace(needle,replacement,1)
league.write_text(s)
