from pathlib import Path
import re

path = Path('app/LeagueApp.tsx')
text = path.read_text()

old = 'const isOpen = Boolean(!isReadOnly && gameweek && (isAdmin || (gameweek.status === "open" && (!gameweek.opens_at || new Date(gameweek.opens_at).getTime() <= now) && new Date(gameweek.locks_at).getTime() > now)));'
new = 'const isCurrentPickGameweek = Boolean(initialGameweek && gameweek?.id === initialGameweek.id);\n  const isOpen = Boolean(!isReadOnly && isCurrentPickGameweek && gameweek && gameweek.status === "open" && (!gameweek.opens_at || new Date(gameweek.opens_at).getTime() <= now) && new Date(gameweek.locks_at).getTime() > now);'
if old not in text:
    raise SystemExit('Could not locate normal pick-open logic')
text = text.replace(old, new, 1)

text = re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.4.7.9";', text, count=1)
text = re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "15 Aug 2026";', text, count=1)

needle = 'const releases=[\n    {version:"1.4.7.8"'
replacement = 'const releases=[\n    {version:"1.4.7.9",date:"15 Aug 2026",summary:"Future-gameweek member pick lock",changes:["Dashboard and Make My Pick now only accept normal picks for the actual current gameweek","Admins follow the same normal gameweek open/lock rules as members outside Admin > Selections","Future-week picks remain deliberately available through Admin > Selections only, preventing accidental early selections"]},\n    {version:"1.4.7.8"'
if needle not in text:
    raise SystemExit('Could not locate v1.4.7.8 release history entry')
text = text.replace(needle, replacement, 1)
path.write_text(text)
