from pathlib import Path
import re

page=Path('app/page.tsx')
p=page.read_text()
old='''    const seasonAdjustments = allAdjustments.filter((adjustment) => {\n      if (!leagueMemberIds.has(adjustment.member_id) || !gameweekIds.has(adjustment.gameweek_id)) return false;\n      if (adjustment.source !== "automatic") return true;\n      return !scored.some((prediction) => prediction.member_id === adjustment.member_id && prediction.gameweek_id === adjustment.gameweek_id);\n    });'''
new='''    const seasonAdjustments = allAdjustments.filter((adjustment) => {\n      if (!leagueMemberIds.has(adjustment.member_id) || !gameweekIds.has(adjustment.gameweek_id)) return false;\n      const hasScoredPrediction = scored.some((prediction) => prediction.member_id === adjustment.member_id && prediction.gameweek_id === adjustment.gameweek_id);\n      const isMissedSelection = adjustment.reason.trim().toLowerCase() === "missed selection";\n      if (hasScoredPrediction && isMissedSelection) return false;\n      return true;\n    });'''
if old not in p: raise SystemExit('Could not locate season adjustment guard')
p=p.replace(old,new,1)
page.write_text(p)

league=Path('app/LeagueApp.tsx')
s=league.read_text()
s=re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.4.9.6";', s, count=1)
s=re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "15 Aug 2026";', s, count=1)
old='''      if (a.source === "automatic" && scored) continue;'''
new='''      if (scored && a.reason.trim().toLowerCase() === "missed selection") continue;'''
if old not in s: raise SystemExit('Could not locate standings missed-pick guard')
s=s.replace(old,new,1)
old='''  const currentPoints=predictions.reduce((sum,p)=>sum+(p.points_awarded??0),0)+allAdjustments.filter(a=>a.gameweek_id===gameweek?.id && !(a.source==="automatic"&&predictions.some(p=>p.member_id===a.member_id&&p.gameweek_id===a.gameweek_id&&p.points_awarded!=null))).reduce((sum,a)=>sum+a.points,0);'''
new='''  const currentPoints=predictions.reduce((sum,p)=>sum+(p.points_awarded??0),0)+allAdjustments.filter(a=>a.gameweek_id===gameweek?.id && !(a.reason.trim().toLowerCase()==="missed selection"&&predictions.some(p=>p.member_id===a.member_id&&p.gameweek_id===a.gameweek_id&&p.points_awarded!=null))).reduce((sum,a)=>sum+a.points,0);'''
if old in s: s=s.replace(old,new,1)
needle='const releases=[\n    {version:"1.4.9.5"'
replacement='const releases=[\n    {version:"1.4.9.6",date:"15 Aug 2026",summary:"Missed-selection scoring guard corrected",changes:["League totals now suppress any Missed selection adjustment whenever that player already has a valid scored prediction for the same gameweek, regardless of how the adjustment source was labelled","The invalid GW2 Missed selection adjustment affecting DTB was removed from the live data","Dashboard standings, full league tables, season history and shared table totals now use the same corrected rule","Manual score adjustments for other reasons remain fully additive"]},\n    {version:"1.4.9.5"'
if needle not in s: raise SystemExit('Could not locate v1.4.9.5 release entry')
s=s.replace(needle,replacement,1)
league.write_text(s)
