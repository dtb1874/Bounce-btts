from pathlib import Path
import re

public_data_path = Path("lib/public-table.ts")
public_view_path = Path("app/PublicLeagueTable.tsx")
league_path = Path("app/LeagueApp.tsx")

public_data = public_data_path.read_text()
public_view = public_view_path.read_text()
league = league_path.read_text()

# Public data needs team names for the selected fixtures.
public_data = public_data.replace(
    '  favouriteCompetition: string;\n',
    '  favouriteCompetition: string;\n  mostPickedTeam: string;\n  mostPickedTeamCount: number;\n',
    1,
) if 'mostPickedTeam: string;' not in public_data else public_data

public_data = public_data.replace(
    '  competition: string | null;\n',
    '  competition: string | null;\n  home_team: string;\n  away_team: string;\n',
    1,
) if '  home_team: string;' not in public_data else public_data

public_data = public_data.replace(
    '.select("id,competition,home_score,away_score")',
    '.select("id,competition,home_team,away_team,home_score,away_score")',
    1,
)

favourite_anchor = '''    const favouriteCompetition = [...competitions.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "—";'''
team_calc = '''    const favouriteCompetition = [...competitions.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "—";
    const teamCounts = new Map<string, number>();
    memberPredictions.forEach((prediction) => {
      const fixture = fixtureById.get(prediction.fixture_id);
      for (const team of [fixture?.home_team, fixture?.away_team]) {
        const name = team?.trim();
        if (name) teamCounts.set(name, (teamCounts.get(name) ?? 0) + 1);
      }
    });
    const mostPickedTeamCountRaw = teamCounts.size ? Math.max(...teamCounts.values()) : 0;
    const mostPickedTeamNames = mostPickedTeamCountRaw >= 2
      ? [...teamCounts.entries()].filter(([, count]) => count === mostPickedTeamCountRaw).map(([name]) => name).sort((a, b) => a.localeCompare(b))
      : [];
    const mostPickedTeam = mostPickedTeamNames.length ? mostPickedTeamNames.join(", ") : "No repeat team yet";
    const mostPickedTeamCount = mostPickedTeamNames.length ? mostPickedTeamCountRaw : 0;'''
if 'const mostPickedTeamCountRaw' not in public_data:
    if favourite_anchor not in public_data:
        raise SystemExit("Public favourite competition anchor not found")
    public_data = public_data.replace(favourite_anchor, team_calc, 1)

return_anchor = '      favouriteCompetition,\n'
if '      mostPickedTeam,\n' not in public_data:
    if return_anchor not in public_data:
        raise SystemExit("Public player return anchor not found")
    public_data = public_data.replace(return_anchor, return_anchor + '      mostPickedTeam,\n      mostPickedTeamCount,\n', 1)

# Public player card: add the repeated-team tendency beside the existing competition tendency.
public_card_anchor = '<div className={styles.playerCompetition}><span>MOST PICKED COMPETITION</span><b>{row.favouriteCompetition}</b></div>'
public_card_replace = public_card_anchor + '<div className={styles.playerCompetition}><span>MOST PICKED TEAM</span><b>{row.mostPickedTeamCount >= 2 ? `${row.mostPickedTeam} · ${row.mostPickedTeamCount} picks` : row.mostPickedTeam}</b></div>'
if 'row.mostPickedTeamCount >= 2' not in public_view:
    if public_card_anchor not in public_view:
        raise SystemExit("Public player card competition anchor not found")
    public_view = public_view.replace(public_card_anchor, public_card_replace, 1)

# Public League Stats: count team appearances across every current-season selection.
public_league_anchor = '\n\n  const namedProfiles'
public_league_code = '''
  const leagueTeamCounts = new Map<string, number>();
  predictions.forEach((prediction) => {
    const fixture = fixtureById.get(prediction.fixture_id);
    for (const team of [fixture?.home_team, fixture?.away_team]) {
      const name = team?.trim();
      if (name) leagueTeamCounts.set(name, (leagueTeamCounts.get(name) ?? 0) + 1);
    }
  });
  const leagueMostPickedCount = leagueTeamCounts.size ? Math.max(...leagueTeamCounts.values()) : 0;
  const leagueMostPickedTeams = leagueMostPickedCount >= 2
    ? [...leagueTeamCounts.entries()].filter(([, count]) => count === leagueMostPickedCount).map(([name]) => name).sort((a, b) => a.localeCompare(b))
    : [];
  seasonFacts.push({
    label: leagueMostPickedTeams.length > 1 ? "MOST PICKED TEAMS" : "MOST PICKED TEAM",
    value: leagueMostPickedTeams.length ? leagueMostPickedTeams.join(", ") : "No repeat team yet",
    detail: leagueMostPickedTeams.length ? `${leagueMostPickedCount} league selections` : "A team must appear in at least 2 selections",
  });
'''
if 'const leagueMostPickedCount = leagueTeamCounts.size' not in public_data:
    if public_league_anchor not in public_data:
        raise SystemExit("Public league team insertion anchor not found")
    public_data = public_data.replace(public_league_anchor, '\n' + public_league_code + public_league_anchor, 1)

# Logged-in player cards: same repeated-team calculation using the fixture data already loaded in LeagueTable.
perf_pattern = re.compile(r'(  const playerPerformance=\(memberId:string\)=>\{.*?\n  \};)', re.S)
logged_helper = '''
  const mostPickedTeamsFor=(memberId:string)=>{
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
if 'const mostPickedTeamsFor=' not in league:
    league, count = perf_pattern.subn(r'\1' + logged_helper, league, count=1)
    if count != 1:
        raise SystemExit("Logged-in player performance helper anchor not found")

league = league.replace(
    'const perf=playerPerformance(r.id);return <div className={publicStyles.playerDetails}>',
    'const perf=playerPerformance(r.id);const team=mostPickedTeamsFor(r.id);return <div className={publicStyles.playerDetails}>',
    1,
) if 'const team=mostPickedTeamsFor(r.id)' not in league else league

logged_card_anchor = '<div className={publicStyles.playerCompetition}><span>MOST PICKED COMPETITION</span><b>{r.favourite}</b></div>'
logged_card_replace = logged_card_anchor + '<div className={publicStyles.playerCompetition}><span>MOST PICKED TEAM</span><b>{team.count>=2?`${team.label} · ${team.count} picks`:team.label}</b></div>'
if 'team.count>=2?' not in league:
    if logged_card_anchor not in league:
        raise SystemExit("Logged-in player card competition anchor not found")
    league = league.replace(logged_card_anchor, logged_card_replace, 1)

# Logged-in League Stats: append the same current-season team record after the joint-holder facts are built.
facts_pattern = re.compile(r'(  const facts=\[fact\("GOAL MAGNET".*?\)\];)', re.S)
logged_league_code = '''
  const leaguePickedTeamCounts=new Map<string,number>();
  for(const pick of predictions){const fixture=fixtures.find(f=>f.id===pick.fixture_id);if(!fixture)continue;for(const raw of [fixture.home_team,fixture.away_team]){const name=raw?.trim();if(name)leaguePickedTeamCounts.set(name,(leaguePickedTeamCounts.get(name)??0)+1)}}
  const leaguePickedTeamTop=leaguePickedTeamCounts.size?Math.max(...leaguePickedTeamCounts.values()):0;
  const leaguePickedTeamNames=leaguePickedTeamTop>=2?[...leaguePickedTeamCounts.entries()].filter(([,count])=>count===leaguePickedTeamTop).map(([name])=>name).sort((a,b)=>a.localeCompare(b)):[];
  facts.push({label:leaguePickedTeamNames.length>1?"MOST PICKED TEAMS":"MOST PICKED TEAM",value:leaguePickedTeamNames.length?leaguePickedTeamNames.join(", "):"No repeat team yet",detail:leaguePickedTeamNames.length?`${leaguePickedTeamTop} league selections`:"A team must appear in at least 2 selections"});'''
if 'const leaguePickedTeamTop=' not in league:
    league, count = facts_pattern.subn(r'\1' + logged_league_code, league, count=1)
    if count != 1:
        raise SystemExit("Logged-in league facts anchor not found")

public_data_path.write_text(public_data)
public_view_path.write_text(public_view)
league_path.write_text(league)
print("Applied Most Picked Team stats for players and league")
