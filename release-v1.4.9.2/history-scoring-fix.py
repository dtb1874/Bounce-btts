from pathlib import Path

league_path = Path("app/LeagueApp.tsx")
league = league_path.read_text()

old_legacy = '''      oneSided:Math.max(0,row.points-(3*row.wins)+row.losses),
      zeroZeroCount:row.losses,
      points:row.points
'''
new_legacy = '''      oneSided:row.scoreNil,
      zeroZeroCount:row.losses,
      points:(2*row.wins)-row.losses
'''
if old_legacy not in league:
    raise SystemExit("Historic standings scoring anchor not found")
league = league.replace(old_legacy,new_legacy,1)

old_week = 'const rows=selectedHistorical.weekly.map((player)=>({name:player.name,code:player.weeklyResultCodes[index],points:player.weeklyAwardedPoints[index]})).filter((row)=>row.code!=null);'
new_week = 'const rows=selectedHistorical.weekly.map((player)=>{const code=player.weeklyResultCodes[index];return {name:player.name,code,points:code===1?2:code===0?0:-1}}).filter((row)=>row.code!=null);'
if old_week not in league:
    raise SystemExit("Historic weekly scoring anchor not found")
league = league.replace(old_week,new_week,1)

old_form = 'results:player.weeklyResultCodes.map((code,index)=>({week:index+1,code,points:player.weeklyAwardedPoints[index]})).filter((row)=>row.code!=null&&row.week>=historicFromWeek&&row.week<=historicToWeek)'
new_form = 'results:player.weeklyResultCodes.map((code,index)=>({week:index+1,code,points:code===1?2:code===0?0:-1})).filter((row)=>row.code!=null&&row.week>=historicFromWeek&&row.week<=historicToWeek)'
if old_form not in league:
    raise SystemExit("Historic form scoring anchor not found")
league = league.replace(old_form,new_form,1)

league_path.write_text(league)
print("Applied historic 2/0/-1 scoring to standings and weekly archive")
