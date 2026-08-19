from pathlib import Path
import re

page_path = Path("app/page.tsx")
league_path = Path("app/LeagueApp.tsx")
page = page_path.read_text()
league = league_path.read_text()

# Home page: only load settings, seasons and profiles up front. Historical memberships/gameweeks move behind /api/history.
old_first_reads = '''  // These reads do not depend on each other, so wait for them together rather than serially.
  const [settingsResponse, seasonsResponse, membershipsResponse, gameweeksResponse, profilesResponse] = await Promise.all([
    supabase.from("league_settings").select("*").eq("id", true).maybeSingle(),
    supabase.from("seasons").select("id,label,is_current,starts_at,ends_at").order("starts_at", { ascending: false }),
    supabase.from("season_memberships").select("season_id,profile_id,active,display_name_snapshot"),
    supabase.from("gameweeks").select("id,number,status,opens_at,locks_at,season_id").order("number", { ascending: true }),
    supabase.from("profiles").select("id,username,display_name,role,active,slot_number").eq("approved", true).order("slot_number"),
  ]);

  const settings = settingsResponse.data;
  const seasons = seasonsResponse.data;
  const seasonMemberships = membershipsResponse.data;
  const allGameweeks = gameweeksResponse.data;
  const profiles = profilesResponse.data;

  const currentSeason = (seasons ?? []).find((season) => season.is_current) ?? null;
  const seasonGameweeks = (allGameweeks ?? []).filter((gameweek) => gameweek.season_id === currentSeason?.id);'''
new_first_reads = '''  // Initial render only needs current-season data. Historical data is fetched on demand from /api/history.
  const [settingsResponse, seasonsResponse, profilesResponse] = await Promise.all([
    supabase.from("league_settings").select("*").eq("id", true).maybeSingle(),
    supabase.from("seasons").select("id,label,is_current,starts_at,ends_at").order("starts_at", { ascending: false }),
    supabase.from("profiles").select("id,username,display_name,role,active,slot_number").eq("approved", true).order("slot_number"),
  ]);

  const settings = settingsResponse.data;
  const seasons = seasonsResponse.data;
  const profiles = profilesResponse.data;

  const currentSeason = (seasons ?? []).find((season) => season.is_current) ?? null;
  const gameweeksResponse = currentSeason?.id
    ? await supabase.from("gameweeks").select("id,number,status,opens_at,locks_at,season_id").eq("season_id", currentSeason.id).order("number", { ascending: true })
    : { data: [] };
  const seasonGameweeks = gameweeksResponse.data ?? [];'''
if old_first_reads not in page:
    raise SystemExit("Stage 2 initial-read anchor not found")
page = page.replace(old_first_reads, new_first_reads, 1)

page = page.replace('  const allGameweekIds = (allGameweeks ?? []).map((item) => item.id);\n', '', 1)
page = page.replace('  const predictionsPromise = allGameweekIds.length\n', '  const predictionsPromise = currentGameweekIds.length\n', 1)
page = page.replace('        .in("gameweek_id", allGameweekIds)\n', '        .in("gameweek_id", currentGameweekIds)\n', 1)
page = page.replace('  const adjustmentsPromise = allGameweekIds.length\n', '  const adjustmentsPromise = currentGameweekIds.length\n', 1)
page = page.replace('        .in("gameweek_id", allGameweekIds)\n', '        .in("gameweek_id", currentGameweekIds)\n', 1)

# Historical standings reconstruction is no longer part of every authenticated page load.
page, removed = re.subn(r'\n  const seasonHistory = \(seasons \?\? \[\]\)\.map\(\(season\) => \{.*?\n  \}\);\n\n  return \(', '\n\n  return (', page, count=1, flags=re.S)
if removed != 1:
    raise SystemExit("Stage 2 seasonHistory reconstruction block not found")
page = page.replace('      seasonHistory={seasonHistory}\n', '', 1)

# Client: dynamic archived seasons are requested once, only when League History is opened.
league = league.replace('  seasonHistory: SeasonHistory[];\n', '', 1)
old_destructure = '  const { initialProfile, initialProfiles, initialGameweek, initialGameweeks, initialFixtures, initialAllFixtures, initialPredictions, initialAdjustments, seasonLabel, entryFee, seasonHistory } = props;'
new_destructure = '  const { initialProfile, initialProfiles, initialGameweek, initialGameweeks, initialFixtures, initialAllFixtures, initialPredictions, initialAdjustments, seasonLabel, entryFee } = props;'
if old_destructure not in league:
    raise SystemExit("Stage 2 LeagueApp props anchor not found")
league = league.replace(old_destructure, new_destructure, 1)

view_anchor = '  const [view,setView] = useState<View>("dashboard");\n'
view_insert = '''  const [view,setView] = useState<View>("dashboard");
  const [seasonHistory,setSeasonHistory] = useState<SeasonHistory[]>([]);
  const [historyRequested,setHistoryRequested] = useState(false);
  useEffect(()=>{
    if(view!=="history"||historyRequested)return;
    setHistoryRequested(true);
    void (async()=>{
      try{
        const response=await fetch("/api/history",{headers:{authorization:`Bearer ${await token()}`}});
        if(!response.ok)return;
        const data=await response.json();
        setSeasonHistory(Array.isArray(data?.seasonHistory)?data.seasonHistory:[]);
      }catch{}
    })();
  },[view,historyRequested]);
'''
if view_anchor not in league:
    raise SystemExit("Stage 2 view-state anchor not found")
league = league.replace(view_anchor, view_insert, 1)

page_path.write_text(page)
league_path.write_text(league)
print("Applied Stage 2 on-demand League History loading")
