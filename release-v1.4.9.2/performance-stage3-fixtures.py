from pathlib import Path

page_path = Path("app/page.tsx")
league_path = Path("app/LeagueApp.tsx")
page = page_path.read_text()
league = league_path.read_text()

# Stage 3 runs after Stage 2. The broad two-week Fixtures feed is not needed for normal startup.
old_fixture_block = '''  // The general Fixtures page is deliberately broader than Make My Pick.
  // Load every fixture stored for the current calendar week and the following week,
  // regardless of gameweek, eligibility, kick-off day/time, or club exclusions.
  const now = new Date();
  const currentWeekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const mondayOffset = (currentWeekStart.getUTCDay() + 6) % 7;
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - mondayOffset);
  const followingWeekEnd = new Date(currentWeekStart);
  followingWeekEnd.setUTCDate(followingWeekEnd.getUTCDate() + 14);

'''
if old_fixture_block not in page:
    raise SystemExit("Stage 3 fixture date-range anchor not found")
page = page.replace(old_fixture_block, "", 1)

old_all_fixtures = '''  const allFixturesPromise = supabase
    .from("fixtures")
    .select("*")
    .gte("kickoff_at", currentWeekStart.toISOString())
    .lt("kickoff_at", followingWeekEnd.toISOString())
    .order("kickoff_at")
    .order("competition")
    .order("home_team");

'''
if old_all_fixtures not in page:
    raise SystemExit("Stage 3 broad fixtures query anchor not found")
page = page.replace(old_all_fixtures, "", 1)

old_wait = '''  const [currentFixturesResponse, allFixtureResponse, predictionResponse, adjustmentResponse] = await Promise.all([
    currentFixturesPromise,
    allFixturesPromise,
    predictionsPromise,
    adjustmentsPromise,
  ]);

  const fixtures = currentFixturesResponse.data ?? [];
  const allFixtures = allFixtureResponse.data ?? [];
'''
new_wait = '''  const [currentFixturesResponse, predictionResponse, adjustmentResponse] = await Promise.all([
    currentFixturesPromise,
    predictionsPromise,
    adjustmentsPromise,
  ]);

  const fixtures = currentFixturesResponse.data ?? [];
'''
if old_wait not in page:
    raise SystemExit("Stage 3 startup Promise.all anchor not found")
page = page.replace(old_wait, new_wait, 1)
page = page.replace('      initialAllFixtures={allFixtures}\n', '', 1)

# Client props/state: request broad fixtures only the first time the Fixtures section is opened.
league = league.replace('  initialAllFixtures: Fixture[];\n', '', 1)
old_destructure = '  const { initialProfile, initialProfiles, initialGameweek, initialGameweeks, initialFixtures, initialAllFixtures, initialPredictions, initialAdjustments, seasonLabel, entryFee } = props;'
new_destructure = '  const { initialProfile, initialProfiles, initialGameweek, initialGameweeks, initialFixtures, initialPredictions, initialAdjustments, seasonLabel, entryFee } = props;'
if old_destructure not in league:
    raise SystemExit("Stage 3 LeagueApp props anchor not found")
league = league.replace(old_destructure, new_destructure, 1)

old_state = '  const [allFixtures,setAllFixtures] = useState(initialAllFixtures);\n'
new_state = '''  const [allFixtures,setAllFixtures] = useState<Fixture[]>([]);
  const [fixturesRequested,setFixturesRequested] = useState(false);
  const [fixturesLoading,setFixturesLoading] = useState(false);
  const [fixturesLoadError,setFixturesLoadError] = useState("");
  useEffect(()=>{
    if(view!=="fixtures"||fixturesRequested)return;
    setFixturesRequested(true);
    setFixturesLoading(true);
    setFixturesLoadError("");
    void (async()=>{
      try{
        const response=await fetch("/api/fixture-browser",{headers:{authorization:`Bearer ${await token()}`}});
        if(!response.ok)throw new Error("fixture load failed");
        const data=await response.json();
        setAllFixtures(Array.isArray(data?.fixtures)?data.fixtures:[]);
      }catch{
        setFixturesLoadError("Fixtures could not be loaded.");
      }finally{
        setFixturesLoading(false);
      }
    })();
  },[view,fixturesRequested]);
'''
if old_state not in league:
    raise SystemExit("Stage 3 allFixtures state anchor not found")
league = league.replace(old_state, new_state, 1)

old_render = '{view==="fixtures" && <FixturesPage fixtures={dedupeFixtures(allFixtures)}/>}'
new_render = '''{view==="fixtures" && (fixturesLoading
          ? <div className={styles.notice}>Loading fixtures…</div>
          : fixturesLoadError
            ? <div className={styles.notice}>{fixturesLoadError} <button type="button" onClick={()=>setFixturesRequested(false)}>Retry</button></div>
            : <FixturesPage fixtures={dedupeFixtures(allFixtures)}/>)}'''
if old_render not in league:
    raise SystemExit("Stage 3 Fixtures render anchor not found")
league = league.replace(old_render, new_render, 1)

page_path.write_text(page)
league_path.write_text(league)
print("Applied Stage 3 on-demand general Fixtures loading")
