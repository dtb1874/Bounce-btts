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

# An automatic missed-pick penalty is superseded if that player/gameweek later has
# a genuinely scored prediction. Manual/admin adjustments remain additive.
old='''    const seasonAdjustments = allAdjustments.filter((adjustment) => leagueMemberIds.has(adjustment.member_id) && gameweekIds.has(adjustment.gameweek_id));'''
new='''    const seasonAdjustments = allAdjustments.filter((adjustment) => {\n      if (!leagueMemberIds.has(adjustment.member_id) || !gameweekIds.has(adjustment.gameweek_id)) return false;\n      if (adjustment.source !== "automatic") return true;\n      return !scored.some((prediction) => prediction.member_id === adjustment.member_id && prediction.gameweek_id === adjustment.gameweek_id);\n    });'''
if old not in p:
    raise SystemExit('Could not locate season adjustment calculation')
p=p.replace(old,new,1)
page.write_text(p)

league=Path('app/LeagueApp.tsx')
s=league.read_text()
s=re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.4.9.5";', s, count=1)
s=re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "15 Aug 2026";', s, count=1)

old='''    for (const a of adjustments) {\n      const row = rows.get(a.member_id); if (!row) continue;\n      const scored = predictions.some(p => p.member_id === a.member_id && p.gameweek_id === a.gameweek_id && p.points_awarded != null);\n      if (!scored) row.played += 1;\n      row.points += a.points;\n    }'''
new='''    for (const a of adjustments) {\n      const row = rows.get(a.member_id); if (!row) continue;\n      const scored = predictions.some(p => p.member_id === a.member_id && p.gameweek_id === a.gameweek_id && p.points_awarded != null);\n      if (a.source === "automatic" && scored) continue;\n      if (!scored) row.played += 1;\n      row.points += a.points;\n    }'''
if old not in s:
    raise SystemExit('Could not locate standings adjustment calculation')
s=s.replace(old,new,1)

old='''  const currentPoints=predictions.reduce((sum,p)=>sum+(p.points_awarded??0),0)+allAdjustments.filter(a=>a.gameweek_id===gameweek?.id).reduce((sum,a)=>sum+a.points,0);'''
new='''  const currentPoints=predictions.reduce((sum,p)=>sum+(p.points_awarded??0),0)+allAdjustments.filter(a=>a.gameweek_id===gameweek?.id && !(a.source==="automatic"&&predictions.some(p=>p.member_id===a.member_id&&p.gameweek_id===a.gameweek_id&&p.points_awarded!=null))).reduce((sum,a)=>sum+a.points,0);'''
if old in s:
    s=s.replace(old,new,1)

needle='const releases=[\n    {version:"1.4.9.4"'
replacement='const releases=[\n    {version:"1.4.9.5",date:"15 Aug 2026",summary:"Dashboard gameweek default and stale penalty scoring corrected",changes:["Opening the app now defaults to the latest gameweek whose opening time has actually been reached","A future gameweek no longer becomes the Dashboard default simply because the previous gameweek has locked","Automatic missed-pick penalties are now ignored if that player has a scored prediction for the same gameweek, preventing a valid later result from being double-counted with an old -1 penalty","Manual/admin score adjustments remain additive and are not suppressed","League standings, season-history totals and Dashboard gameweek points now use the corrected adjustment logic"]},\n    {version:"1.4.9.4"'
if needle not in s:
    raise SystemExit('Could not locate v1.4.9.4 release entry')
s=s.replace(needle,replacement,1)
league.write_text(s)
