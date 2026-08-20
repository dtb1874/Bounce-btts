from pathlib import Path
import re

league_path = Path("app/LeagueApp.tsx")
public_path = Path("app/PublicLeagueTable.tsx")
public_data_path = Path("lib/public-table.ts")
globals_path = Path("app/globals.css")
release_css_path = Path("app/release.module.css")

league = league_path.read_text()
public = public_path.read_text()
public_data = public_data_path.read_text()
globals_css = globals_path.read_text()
release_css = release_css_path.read_text()


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f"{label} anchor not found")
    return text.replace(old, new, 1)

# -----------------------------------------------------------------------------
# Shared public data enhancements used by both public stats display and drilldown.
# -----------------------------------------------------------------------------
public_data = replace_once(
    public_data,
    '''export type PublicSeasonFact = {
  label: string;
  value: string;
  detail: string;
};''',
    '''export type PublicSeasonFact = {
  label: string;
  value: string;
  detail: string;
  breakdown?: string[];
};''',
    "PublicSeasonFact breakdown",
)

public_data = replace_once(
    public_data,
    '  mostPickedTeamCount: number;\n',
    '  mostPickedTeamCount: number;\n  repeatTeamWins: number;\n  repeatTeamLosses: number;\n',
    "PublicPlayerInsight repeat W/L fields",
)

team_calc_anchor = '''    const mostPickedTeam = mostPickedTeamNames.length ? mostPickedTeamNames.join(", ") : "No repeat team yet";
    const mostPickedTeamCount = mostPickedTeamNames.length ? mostPickedTeamCountRaw : 0;'''
team_calc_replacement = '''    const mostPickedTeam = mostPickedTeamNames.length ? mostPickedTeamNames.join(", ") : "No repeat team yet";
    const mostPickedTeamCount = mostPickedTeamNames.length ? mostPickedTeamCountRaw : 0;
    const repeatTeamPrimary = mostPickedTeamNames[0] ?? "";
    const repeatTeamFinished = repeatTeamPrimary
      ? memberPredictions.filter((prediction) => {
          if (prediction.points_awarded === null) return false;
          const fixture = fixtureById.get(prediction.fixture_id);
          return fixture?.home_team?.trim() === repeatTeamPrimary || fixture?.away_team?.trim() === repeatTeamPrimary;
        })
      : [];
    const repeatTeamWins = repeatTeamFinished.filter((prediction) => prediction.points_awarded === 3).length;
    const repeatTeamLosses = repeatTeamFinished.length - repeatTeamWins;'''
if 'const repeatTeamPrimary = mostPickedTeamNames[0]' not in public_data:
    if team_calc_anchor not in public_data:
        raise SystemExit("Public repeat-team calculation anchor not found")
    public_data = public_data.replace(team_calc_anchor, team_calc_replacement, 1)

public_data = replace_once(
    public_data,
    '      mostPickedTeam,\n      mostPickedTeamCount,\n',
    '      mostPickedTeam,\n      mostPickedTeamCount,\n      repeatTeamWins,\n      repeatTeamLosses,\n',
    "Public repeat-team return fields",
)

old_public_team_fact = '''  seasonFacts.push({
    label: leagueMostPickedTeams.length > 1 ? "MOST PICKED TEAMS" : "MOST PICKED TEAM",
    value: leagueMostPickedTeams.length ? leagueMostPickedTeams.join(", ") : "No repeat team yet",
    detail: leagueMostPickedTeams.length ? `${leagueMostPickedCount} league selections` : "A team must appear in at least 2 selections",
  });'''
new_public_team_fact = '''  const leagueMostPickedBreakdown = leagueMostPickedTeams.flatMap((team) => {
    const memberCounts = new Map<string, number>();
    predictions.forEach((prediction) => {
      const fixture = fixtureById.get(prediction.fixture_id);
      if (fixture?.home_team?.trim() === team || fixture?.away_team?.trim() === team) {
        memberCounts.set(prediction.member_id, (memberCounts.get(prediction.member_id) ?? 0) + 1);
      }
    });
    return [...memberCounts.entries()]
      .sort((a, b) => b[1] - a[1] || String((profiles ?? []).find((profile) => profile.id === a[0])?.display_name ?? "").localeCompare(String((profiles ?? []).find((profile) => profile.id === b[0])?.display_name ?? "")))
      .map(([memberId, count]) => {
        const name = (profiles ?? []).find((profile) => profile.id === memberId)?.display_name ?? "Member";
        return `${team} · ${name} · ${count} pick${count === 1 ? "" : "s"}`;
      });
  });
  seasonFacts.push({
    label: leagueMostPickedTeams.length > 1 ? "MOST PICKED TEAMS" : "MOST PICKED TEAM",
    value: leagueMostPickedTeams.length ? leagueMostPickedTeams.join(", ") : "No repeat team yet",
    detail: leagueMostPickedTeams.length ? `${leagueMostPickedCount} league selections` : "A team must appear in at least 2 selections",
    breakdown: leagueMostPickedBreakdown,
  });'''
if 'const leagueMostPickedBreakdown = leagueMostPickedTeams.flatMap' not in public_data:
    if old_public_team_fact not in public_data:
        raise SystemExit("Public Most Picked Team fact anchor not found")
    public_data = public_data.replace(old_public_team_fact, new_public_team_fact, 1)

# -----------------------------------------------------------------------------
# Public League Stats: joint Form Leader, BTTS joint leader, Creature of Habit,
# dropdown marker and Most Picked Team supporting detail.
# -----------------------------------------------------------------------------
public_state_anchor = '  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);\n'
public_state_insert = '''  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const topFormPoints = formRows.length ? Math.max(...formRows.map((row) => row.total)) : 0;
  const formLeaderNames = topFormPoints > 0 ? formRows.filter((row) => row.total === topFormPoints).map((row) => row.name).sort((a, b) => a.localeCompare(b)) : [];
  const topBttsWins = rows.length ? Math.max(...rows.map((row) => row.wins)) : 0;
  const bttsLeaderNames = topBttsWins > 0 ? rows.filter((row) => row.wins === topBttsWins).map((row) => row.name).sort((a, b) => a.localeCompare(b)) : [];
  const creatureCandidates = playerInsights
    .filter((row) => row.mostPickedTeamCount >= 2)
    .map((row) => ({
      name: row.name,
      team: row.mostPickedTeam.split(", ")[0] ?? row.mostPickedTeam,
      count: row.mostPickedTeamCount,
      wins: row.repeatTeamWins,
      losses: row.repeatTeamLosses,
    }));
  const creatureTop = creatureCandidates.length ? Math.max(...creatureCandidates.map((row) => row.count)) : 0;
  const creatureLeaders = creatureCandidates.filter((row) => row.count === creatureTop).sort((a, b) => a.name.localeCompare(b.name));
'''
if 'const creatureCandidates = playerInsights' not in public:
    if public_state_anchor not in public:
        raise SystemExit("Public stats state anchor not found")
    public = public.replace(public_state_anchor, public_state_insert, 1)

old_public_form = '<div className={styles.statItem}><span>FORM LEADER</span><strong>{formRows[0]?.name ?? "—"}</strong><small>{formRows[0] ? `${formRows[0].total} pts across current form` : "Waiting for scored weeks"}</small></div>'
new_public_form = '''<div className={styles.statItem}><span>{formLeaderNames.length > 1 ? "FORM LEADERS" : "FORM LEADER"}</span><strong className={formLeaderNames.length > 1 ? "jointStatValue" : undefined}>{formLeaderNames.length ? formLeaderNames.join(", ") : "—"}</strong><small>{formLeaderNames.length ? `${topFormPoints} pts across current form` : "Waiting for scored weeks"}</small></div>
          <div className={styles.statItem}><span>{bttsLeaderNames.length > 1 ? "BTTS LEADERS" : "BTTS LEADER"}</span><strong className={bttsLeaderNames.length > 1 ? "jointStatValue" : undefined}>{bttsLeaderNames.length ? bttsLeaderNames.join(", ") : "—"}</strong><small>{bttsLeaderNames.length ? `${topBttsWins} BTTS wins` : "No BTTS wins yet"}</small></div>
          <div className={styles.statItem}><span>CREATURE OF HABIT</span><strong className={creatureLeaders.length > 1 ? "jointStatValue" : undefined}>{creatureLeaders.length ? creatureLeaders.map((row) => `${row.name} — ${row.team}, ${row.count} picks`).join(" / ") : "—"}</strong><small>{creatureLeaders.length ? `${creatureLeaders.map((row) => `${row.wins}W · ${row.losses}L`).join(" / ")} · Most repeat selections of the same team` : "Most repeat selections of the same team"}</small></div>'''
if 'CREATURE OF HABIT' not in public:
    if old_public_form not in public:
        raise SystemExit("Public Form Leader card anchor not found")
    public = public.replace(old_public_form, new_public_form, 1)

public = public.replace(
    '<summary>More league stats <span>{seasonFacts.length}</span></summary>',
    '<summary>More league stats <span className="leagueMoreStatsChevron" aria-hidden="true">⌄</span></summary>',
    1,
)

old_public_fact_map = '{seasonFacts.map((fact) => <div className={styles.statItem} key={fact.label}><span>{fact.label}</span><strong className={fact.value.includes(", ") ? "jointStatValue" : undefined}>{fact.value}</strong><small>{fact.detail}</small></div>)}'
new_public_fact_map = '''{seasonFacts.map((fact) => fact.label.startsWith("MOST PICKED TEAM") ? <details className={`${styles.statItem} leagueStatDrilldown`} key={fact.label}><summary><span>{fact.label}</span><strong className={fact.value.includes(", ") ? "jointStatValue" : undefined}>{fact.value}</strong><small>{fact.detail}</small><b aria-hidden="true">⌄</b></summary>{fact.breakdown?.length ? <div className="leagueStatBreakdown">{fact.breakdown.map((line) => <div key={line}>{line}</div>)}</div> : null}</details> : <div className={styles.statItem} key={fact.label}><span>{fact.label}</span><strong className={fact.value.includes(", ") ? "jointStatValue" : undefined}>{fact.value}</strong><small>{fact.detail}</small></div>)}'''
if 'leagueStatDrilldown' not in public:
    if old_public_fact_map not in public:
        raise SystemExit("Public facts map anchor not found")
    public = public.replace(old_public_fact_map, new_public_fact_map, 1)

# -----------------------------------------------------------------------------
# Logged-in League Stats: mirror the same headline stats and calculations.
# -----------------------------------------------------------------------------
league = replace_once(
    league,
    'function LeagueTable({standings,seasonLabel,gameweek,entryFee,fixtures,predictions}:{standings:Standing[];seasonLabel:string;gameweek:Gameweek|null;entryFee:number;fixtures:Fixture[];predictions:Prediction[]}){',
    'function LeagueTable({standings,seasonLabel,gameweek,entryFee,fixtures,predictions,gameweeks,adjustments}:{standings:Standing[];seasonLabel:string;gameweek:Gameweek|null;entryFee:number;fixtures:Fixture[];predictions:Prediction[];gameweeks:Gameweek[];adjustments:ScoreAdjustment[]}){',
    "LeagueTable props",
)

league = replace_once(
    league,
    'gameweek={gameweek??null} entryFee={entryFee} fixtures={fixtures} predictions={predictions}/>',
    'gameweek={gameweek??null} entryFee={entryFee} fixtures={fixtures} predictions={predictions} gameweeks={initialGameweeks} adjustments={adjustments}/>',
    "LeagueTable invocation",
)

logged_stats_anchor = '  const bttsLeader=[...standings].sort((a,b)=>b.wins-a.wins||b.points-a.points)[0];\n'
logged_stats_insert = '''  const bttsLeader=[...standings].sort((a,b)=>b.wins-a.wins||b.points-a.points)[0];
  const scoredGameweekIdsForForm=new Set([...predictions.filter(p=>p.points_awarded!==null).map(p=>p.gameweek_id),...adjustments.map(a=>a.gameweek_id)]);
  const recentFormGameweeks=[...gameweeks].filter(g=>scoredGameweekIdsForForm.has(g.id)).sort((a,b)=>b.number-a.number).slice(0,6).reverse();
  const formRowsForStats=standings.map(row=>({name:row.name,total:recentFormGameweeks.reduce((sum,g)=>sum+predictions.filter(p=>p.member_id===row.id&&p.gameweek_id===g.id&&p.points_awarded!==null).reduce((s,p)=>s+Number(p.points_awarded??0),0)+adjustments.filter(a=>a.member_id===row.id&&a.gameweek_id===g.id).reduce((s,a)=>s+Number(a.points),0),0)}));
  const topFormPoints=formRowsForStats.length?Math.max(...formRowsForStats.map(row=>row.total)):0;
  const formLeaderNames=topFormPoints>0?formRowsForStats.filter(row=>row.total===topFormPoints).map(row=>row.name).sort((a,b)=>a.localeCompare(b)):[];
  const topBttsWins=standings.length?Math.max(...standings.map(row=>row.wins)):0;
  const bttsLeaderNames=topBttsWins>0?standings.filter(row=>row.wins===topBttsWins).map(row=>row.name).sort((a,b)=>a.localeCompare(b)):[];
'''
if 'const formRowsForStats=' not in league:
    if logged_stats_anchor not in league:
        raise SystemExit("Logged-in stats helper anchor not found")
    league = league.replace(logged_stats_anchor, logged_stats_insert, 1)

# Extend the existing per-player repeated-team helper into Creature of Habit W/L data.
helper_anchor = '''  const mostPickedTeamsFor=(memberId:string)=>{
    const counts=new Map<string,number>();
    for(const pick of predictions.filter(p=>p.member_id===memberId)){
      const fixture=fixtures.find(f=>f.id===pick.fixture_id);
      if(!fixture)continue;
      for(const raw of [fixture.home_team,fixture.away_team]){const name=raw?.trim();if(name)counts.set(name,(counts.get(name)??0)+1)}
    }
    const top=counts.size?Math.max(...counts.values()):0;
    if(top<2)return {label:"No repeat team yet",count:0};
    const names=[...counts.entries()].filter(([,count])=>count===top).map(([name])=>name).sort((a,b)=>a.localeCompare(b));
    return {label:names.join(", "),count:top};
  };'''
helper_replacement = helper_anchor + '''
  const creatureRows=standings.map(row=>{const repeat=mostPickedTeamsFor(row.id);const team=repeat.count>=2?(repeat.label.split(", ")[0]??repeat.label):"";const finished=team?predictions.filter(p=>p.member_id===row.id&&p.points_awarded!==null).filter(p=>{const fixture=fixtures.find(f=>f.id===p.fixture_id);return fixture?.home_team?.trim()===team||fixture?.away_team?.trim()===team}):[];const wins=finished.filter(p=>p.points_awarded===3).length;return {name:row.name,team,count:repeat.count,wins,losses:finished.length-wins}}).filter(row=>row.count>=2);
  const creatureTop=creatureRows.length?Math.max(...creatureRows.map(row=>row.count)):0;
  const creatureLeaders=creatureRows.filter(row=>row.count===creatureTop).sort((a,b)=>a.name.localeCompare(b.name));'''
if 'const creatureRows=standings.map' not in league:
    if helper_anchor not in league:
        raise SystemExit("Logged-in Most Picked Team helper anchor not found")
    league = league.replace(helper_anchor, helper_replacement, 1)

old_logged_btts_card = '<div className={publicStyles.statItem}><span>BTTS LEADER</span><strong>{bttsLeader?.name??"—"}</strong><small>{bttsLeader?`${bttsLeader.wins} BTTS wins`:"No wins yet"}</small></div>'
new_logged_btts_cards = '''<div className={publicStyles.statItem}><span>{formLeaderNames.length>1?"FORM LEADERS":"FORM LEADER"}</span><strong className={formLeaderNames.length>1?"jointStatValue":undefined}>{formLeaderNames.length?formLeaderNames.join(", "):"—"}</strong><small>{formLeaderNames.length?`${topFormPoints} pts across current form`:"Waiting for scored weeks"}</small></div><div className={publicStyles.statItem}><span>{bttsLeaderNames.length>1?"BTTS LEADERS":"BTTS LEADER"}</span><strong className={bttsLeaderNames.length>1?"jointStatValue":undefined}>{bttsLeaderNames.length?bttsLeaderNames.join(", "):"—"}</strong><small>{bttsLeaderNames.length?`${topBttsWins} BTTS wins`:"No BTTS wins yet"}</small></div><div className={publicStyles.statItem}><span>CREATURE OF HABIT</span><strong className={creatureLeaders.length>1?"jointStatValue":undefined}>{creatureLeaders.length?creatureLeaders.map(row=>`${row.name} — ${row.team}, ${row.count} picks`).join(" / "):"—"}</strong><small>{creatureLeaders.length?`${creatureLeaders.map(row=>`${row.wins}W · ${row.losses}L`).join(" / ")} · Most repeat selections of the same team`:"Most repeat selections of the same team"}</small></div>'''
if 'CREATURE OF HABIT' not in league:
    if old_logged_btts_card not in league:
        raise SystemExit("Logged-in BTTS leader card anchor not found")
    league = league.replace(old_logged_btts_card, new_logged_btts_cards, 1)

# Most Picked Team member breakdown for the signed-in surface.
logged_team_anchor = '''  facts.push({label:leaguePickedTeamNames.length>1?"MOST PICKED TEAMS":"MOST PICKED TEAM",value:leaguePickedTeamNames.length?leaguePickedTeamNames.join(", "):"No repeat team yet",detail:leaguePickedTeamNames.length?`${leaguePickedTeamTop} league selections`:"A team must appear in at least 2 selections"});'''
logged_team_replacement = logged_team_anchor + '''
  const leaguePickedTeamBreakdown=leaguePickedTeamNames.flatMap(team=>{const memberCounts=new Map<string,number>();for(const pick of predictions){const fixture=fixtures.find(f=>f.id===pick.fixture_id);if(fixture?.home_team?.trim()===team||fixture?.away_team?.trim()===team)memberCounts.set(pick.member_id,(memberCounts.get(pick.member_id)??0)+1)}return [...memberCounts.entries()].sort((a,b)=>b[1]-a[1]||(standings.find(s=>s.id===a[0])?.name??"").localeCompare(standings.find(s=>s.id===b[0])?.name??"")).map(([memberId,count])=>`${team} · ${standings.find(s=>s.id===memberId)?.name??"Member"} · ${count} pick${count===1?"":"s"}`)});'''
if 'const leaguePickedTeamBreakdown=' not in league:
    if logged_team_anchor not in league:
        raise SystemExit("Logged-in Most Picked Team fact anchor not found")
    league = league.replace(logged_team_anchor, logged_team_replacement, 1)

league = league.replace(
    '<summary>More league stats <span>{facts.length}</span></summary>',
    '<summary>More league stats <span className="leagueMoreStatsChevron" aria-hidden="true">⌄</span></summary>',
    1,
)

old_logged_fact_map = '{facts.map(f=><div className={publicStyles.statItem} key={f.label}><span>{f.label}</span><strong className={f.value.includes(", ")?"jointStatValue":undefined}>{f.value}</strong><small>{f.detail}</small></div>)}'
new_logged_fact_map = '''{facts.map(f=>f.label.startsWith("MOST PICKED TEAM")?<details className={`${publicStyles.statItem} leagueStatDrilldown`} key={f.label}><summary><span>{f.label}</span><strong className={f.value.includes(", ")?"jointStatValue":undefined}>{f.value}</strong><small>{f.detail}</small><b aria-hidden="true">⌄</b></summary>{leaguePickedTeamBreakdown.length?<div className="leagueStatBreakdown">{leaguePickedTeamBreakdown.map(line=><div key={line}>{line}</div>)}</div>:null}</details>:<div className={publicStyles.statItem} key={f.label}><span>{f.label}</span><strong className={f.value.includes(", ")?"jointStatValue":undefined}>{f.value}</strong><small>{f.detail}</small></div>)}'''
if 'leaguePickedTeamBreakdown.map' not in league:
    if old_logged_fact_map not in league:
        raise SystemExit("Logged-in facts map anchor not found")
    league = league.replace(old_logged_fact_map, new_logged_fact_map, 1)

# -----------------------------------------------------------------------------
# League History: make Full weekly archive independently collapsible.
# -----------------------------------------------------------------------------
archive_state_anchor = '  const [historicArchiveOpen,setHistoricArchiveOpen]=useState(false);\n  const [openHistoricWeek,setOpenHistoricWeek]=useState<number|null>(null);\n'
archive_state_replacement = '  const [historicArchiveOpen,setHistoricArchiveOpen]=useState(false);\n  const [historicWeeklyListOpen,setHistoricWeeklyListOpen]=useState(false);\n  const [openHistoricWeek,setOpenHistoricWeek]=useState<number|null>(null);\n'
if 'historicWeeklyListOpen' not in league:
    if archive_state_anchor not in league:
        raise SystemExit("History weekly list state anchor not found")
    league = league.replace(archive_state_anchor, archive_state_replacement, 1)

league = league.replace(
    '    setHistoricArchiveOpen(false);\n    setOpenHistoricWeek(null);',
    '    setHistoricArchiveOpen(false);\n    setHistoricWeeklyListOpen(false);\n    setOpenHistoricWeek(null);',
    1,
)

old_archive_heading = '<div className="historicGwArchiveHeading"><div><span>ALL GAMEWEEKS</span><h3>Full weekly archive</h3></div><small>Tap a gameweek to expand results</small></div>'
new_archive_heading = '<button type="button" className="historicGwArchiveHeading historicGwArchiveHeadingButton" aria-expanded={historicWeeklyListOpen} onClick={()=>{setHistoricWeeklyListOpen(v=>!v);setOpenHistoricWeek(null)}}><div><span>ALL GAMEWEEKS</span><h3>Full weekly archive</h3></div><div className="historicWeeklyHeadingMeta"><small>{historicWeeklyListOpen?"Tap a gameweek to expand results":"Tap to expand archive"}</small><b aria-hidden="true">{historicWeeklyListOpen?"−":"+"}</b></div></button>'
league = replace_once(league, old_archive_heading, new_archive_heading, "History full weekly archive heading")

league = replace_once(
    league,
    '<div className="historicGwArchiveList">',
    '<div className={`historicGwArchiveList ${historicWeeklyListOpen?"historicWeeklyListOpen":"historicWeeklyListCollapsed"}`}>',
    "History weekly archive list class",
)

# -----------------------------------------------------------------------------
# Expandable honours trophy for every signed-in user on Dashboard and History.
# Dynamic archived winners are added automatically from seasonHistory.
# -----------------------------------------------------------------------------
league = replace_once(
    league,
    '  gameweek,gameweeks,profiles,fixtures,predictions,allPredictions,allAdjustments,adjustment,myFixture,standings,entryFee,seasonLabel,isOpen,role,myId,alertsCount,setView,onLiveRefresh,liveRefreshing\n}:{',
    '  gameweek,gameweeks,profiles,fixtures,predictions,allPredictions,allAdjustments,adjustment,myFixture,standings,entryFee,seasonLabel,seasonHistory,isOpen,role,myId,alertsCount,setView,onLiveRefresh,liveRefreshing\n}:{',
    "Dashboard destructuring seasonHistory",
)

league = replace_once(
    league,
    '  seasonLabel:string;\n  isOpen:boolean;',
    '  seasonLabel:string;\n  seasonHistory:SeasonHistory[];\n  isOpen:boolean;',
    "Dashboard seasonHistory prop type",
)

league = replace_once(
    league,
    'entryFee={entryFee} seasonLabel={seasonLabel} isOpen={isOpen}',
    'entryFee={entryFee} seasonLabel={seasonLabel} seasonHistory={seasonHistory} isOpen={isOpen}',
    "Dashboard invocation seasonHistory",
)

status_anchor = '''  const statusText = !gameweek ? "No gameweek selected" :
    gameweek.status==="complete" ? "Gameweek complete" :
    isOpen ? "Selections open" : "Selections closed";
'''
status_replacement = status_anchor + '''  const [honoursOpen,setHonoursOpen]=useState(false);
  const dashboardDynamicHonours=seasonHistory.filter(season=>!season.isCurrent&&season.standings[0]).map(season=>({season:season.label,winner:season.standings[0].name}));
  const dashboardHonours=[...rollOfHonour,...dashboardDynamicHonours.filter(row=>!rollOfHonour.some(existing=>existing.season===row.season))].sort((a,b)=>b.season.localeCompare(a.season));
'''
if 'const dashboardDynamicHonours=' not in league:
    if status_anchor not in league:
        raise SystemExit("Dashboard honours state anchor not found")
    league = league.replace(status_anchor, status_replacement, 1)

old_trophy = '''      <div className={`${styles.dashboardArt} mobileControlTrophy`} aria-hidden="true">
        <img src="/assets/hearts-crest.png" alt=""/>
        <img src="/assets/bounce-cup.png" alt=""/>
      </div>
    </div>'''
new_trophy = '''      <button type="button" className={`${styles.dashboardArt} mobileControlTrophy honoursTrophyButton`} aria-label={honoursOpen?"Hide Roll of Honour":"Show Roll of Honour"} aria-expanded={honoursOpen} onClick={()=>setHonoursOpen(v=>!v)}>
        <img src="/assets/hearts-crest.png" alt="" aria-hidden="true"/>
        <img src="/assets/bounce-cup.png" alt="" aria-hidden="true"/>
      </button>
    </div>
    {honoursOpen&&<div className="dashboardHonoursPanel"><div className="dashboardHonoursHead"><span>BOUNCE CHAMPIONS</span><strong>Roll of Honour</strong></div><div className="dashboardHonoursGrid">{dashboardHonours.map((row,index)=><div className="dashboardHonourRow" key={row.season}><span>{row.season}</span><strong>{row.winner}</strong><small>{index===0?"Reigning champion":"Bounce champion"}</small></div>)}</div></div>}'''
league = replace_once(league, old_trophy, new_trophy, "Dashboard expandable trophy")

old_history_honours = '''  const reigningChampion = rollOfHonour[rollOfHonour.length-1];
  const honourRows = [...rollOfHonour].reverse();
  const [id,setId]=useState(seasons[0]?.id??"");'''
new_history_honours = '''  const dynamicHonours=archivedDynamic.filter(season=>season.standings[0]).map(season=>({season:season.label,winner:season.standings[0].name}));
  const combinedHonours=[...rollOfHonour,...dynamicHonours.filter(row=>!rollOfHonour.some(existing=>existing.season===row.season))];
  const honourRows=[...combinedHonours].sort((a,b)=>b.season.localeCompare(a.season));
  const reigningChampion = honourRows[0];
  const [historyHonoursOpen,setHistoryHonoursOpen]=useState(false);
  const [id,setId]=useState(seasons[0]?.id??"");'''
league = replace_once(league, old_history_honours, new_history_honours, "History dynamic honours")

history_hero_old = '''      <img src="/assets/bounce-cup.png" alt="" aria-hidden="true"/>
    </div>
    <div className={styles.historyStatsBand}>'''
history_hero_new = '''      <button type="button" className="historyHonoursTrophyButton" aria-label={historyHonoursOpen?"Hide Roll of Honour":"Show Roll of Honour"} aria-expanded={historyHonoursOpen} onClick={()=>setHistoryHonoursOpen(v=>!v)}><img src="/assets/bounce-cup.png" alt="" aria-hidden="true"/></button>
    </div>
    <div className={styles.historyStatsBand}>'''
league = replace_once(league, history_hero_old, history_hero_new, "History trophy button")

league = replace_once(
    league,
    '<div className={`${styles.panel} ${styles.honourPanel}`}>',
    '<div className={`${styles.panel} ${styles.honourPanel} ${historyHonoursOpen?"historyHonoursOpen":"historyHonoursCollapsed"}`}>',
    "History honours collapse class",
)

# -----------------------------------------------------------------------------
# CSS for new controls. Preserve existing maroon/gold language and mobile sizing.
# -----------------------------------------------------------------------------
css_marker = '/* recent-updates-1.6.3-20260820 */'
if css_marker not in globals_css:
    globals_css += r'''

/* recent-updates-1.6.3-20260820 */
.leagueMoreStatsChevron{display:inline-block!important;font-size:16px!important;line-height:1!important;transition:transform .18s ease;color:#d8b76f}
.leagueMoreStats[open] .leagueMoreStatsChevron{transform:rotate(180deg)}
.leagueStatDrilldown{padding:0!important;overflow:hidden}
.leagueStatDrilldown>summary{list-style:none;cursor:pointer;padding:13px 16px;display:grid;grid-template-columns:1fr auto;gap:4px 8px;align-content:center;min-height:100%}
.leagueStatDrilldown>summary::-webkit-details-marker{display:none}
.leagueStatDrilldown>summary>span,.leagueStatDrilldown>summary>strong,.leagueStatDrilldown>summary>small{grid-column:1}
.leagueStatDrilldown>summary>b{grid-column:2;grid-row:1/4;align-self:center;color:#d8b76f;font-size:18px;transition:transform .18s ease}
.leagueStatDrilldown[open]>summary>b{transform:rotate(180deg)}
.leagueStatBreakdown{border-top:1px solid rgba(216,183,111,.14);padding:8px 16px 12px;display:grid;gap:6px;color:#cbbdaf;font-size:10px;line-height:1.3}
.historicGwArchiveHeadingButton{width:100%;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}
.historicGwArchiveHeadingButton:hover{background:rgba(113,31,49,.08)}
.historicWeeklyHeadingMeta{display:flex;align-items:center;gap:10px;text-align:right}
.historicWeeklyHeadingMeta b{color:#d8b76f;font-size:20px;font-weight:500}
.historicWeeklyListCollapsed{display:none!important}
.honoursTrophyButton{border:0;background:transparent;padding:0;cursor:pointer;pointer-events:auto!important}
.dashboardHonoursPanel{margin:10px 0 12px;border:1px solid rgba(216,183,111,.24);border-radius:14px;background:linear-gradient(145deg,rgba(39,15,24,.97),rgba(18,12,17,.98));overflow:hidden}
.dashboardHonoursHead{padding:12px 14px 9px;border-bottom:1px solid rgba(216,183,111,.13);display:flex;align-items:end;justify-content:space-between;gap:10px}
.dashboardHonoursHead span{color:#d8b76f;font-size:8px;font-weight:900;letter-spacing:.14em}
.dashboardHonoursHead strong{color:#f1e7dc;font-size:16px}
.dashboardHonoursGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.dashboardHonourRow{min-width:0;padding:11px 13px;border-right:1px solid rgba(216,183,111,.10);border-bottom:1px solid rgba(216,183,111,.10)}
.dashboardHonourRow span{display:block;color:#d8b76f;font-size:8px;font-weight:900;letter-spacing:.09em}
.dashboardHonourRow strong{display:block;margin-top:4px;color:#f1e7dc;font-size:clamp(11px,2.5vw,16px);line-height:1.05;overflow-wrap:anywhere}
.dashboardHonourRow small{display:block;margin-top:4px;color:#998a80;font-size:8px}
.historyHonoursTrophyButton{border:0;background:transparent;padding:0;cursor:pointer;display:block}
.historyHonoursTrophyButton img{display:block;width:100%;height:100%;object-fit:contain}
.historyHonoursCollapsed{display:none!important}
.historyHonoursOpen .honourCard strong{font-size:clamp(11px,2.4vw,17px)!important;line-height:1.05!important;white-space:normal!important;overflow-wrap:anywhere}
@media(max-width:650px){
  .leagueStatDrilldown>summary{padding:11px 10px}
  .leagueStatBreakdown{padding:7px 10px 10px;font-size:9px}
  .historicWeeklyHeadingMeta small{max-width:115px}
  .dashboardHonoursPanel{margin:8px 6px 10px}
  .dashboardHonoursGrid{grid-template-columns:1fr 1fr}
  .dashboardHonourRow strong{font-size:clamp(10px,3.3vw,14px)}
  .historyHonoursTrophyButton{width:70px;height:82px}
}
'''

# Keep module CSS compatible with the Dashboard trophy being a button rather than a div.
module_marker = '/* recent-updates-1.6.3-module-20260820 */'
if module_marker not in release_css:
    release_css += r'''

/* recent-updates-1.6.3-module-20260820 */
@media(max-width:650px){
  .dashboardArt.mobileControlTrophy.honoursTrophyButton{pointer-events:auto!important;cursor:pointer!important}
}
'''

league_path.write_text(league)
public_path.write_text(public)
public_data_path.write_text(public_data)
globals_path.write_text(globals_css)
release_css_path.write_text(release_css)
print("Applied v1.6.3 recent stats, history and honours updates")
