from pathlib import Path

api_path = Path("lib/api-football.ts")
route_path = Path("app/api/admin/provider-sync/route.ts")
league_path = Path("app/LeagueApp.tsx")
globals_path = Path("app/globals.css")

api = api_path.read_text()
route = route_path.read_text()
league = league_path.read_text()
globals = globals_path.read_text()

# Dedicated selected-fixture odds-only refresh.
anchor = '''function sameInstant(a: unknown, b: unknown) {'''
helper = '''export async function runSelectedOddsRefresh(gameweekId: string) {
  const admin = createAdminClient();
  const tracker: Tracker = { used: 0, limit: null, remaining: null };
  const { data: predictions, error: predictionsError } = await admin.from("predictions").select("fixture_id").eq("gameweek_id", gameweekId).not("fixture_id", "is", null);
  if (predictionsError) throw predictionsError;
  const fixtureIds = [...new Set((predictions ?? []).map((row: any) => String(row.fixture_id)).filter(Boolean))];
  if (!fixtureIds.length) return { checked: 0, updated: 0, unavailable: 0, requestsUsed: 0 };
  const { data: fixtures, error: fixturesError } = await admin.from("fixtures").select("id,provider_fixture_id,status").in("id", fixtureIds).in("status", ["NS", "TBD"]);
  if (fixturesError) throw fixturesError;
  const betId = await bttsBetId(tracker);
  if (!betId) throw new Error("BTTS odds market could not be found.");
  let checked = 0, updated = 0, unavailable = 0;
  for (const fixture of fixtures ?? []) {
    const providerId = String(fixture.provider_fixture_id ?? "").trim();
    if (!/^\\d+$/.test(providerId)) { unavailable += 1; continue; }
    if (tracker.remaining !== null && tracker.remaining <= 8) break;
    if (tracker.used >= 75) break;
    const result = await fixtureOdds(providerId, betId, tracker);
    checked += 1;
    const oddsPatch = result.odds
      ? { odds_fractional: result.odds, odds_bookmaker: result.bookmaker, odds_checked_at: new Date().toISOString() }
      : { odds_checked_at: new Date().toISOString() };
    const { error } = await admin.from("fixtures").update(oddsPatch).eq("id", fixture.id);
    if (error) throw error;
    if (result.odds) updated += 1; else unavailable += 1;
  }
  return { checked, updated, unavailable, requestsUsed: tracker.used };
}

'''
if 'export async function runSelectedOddsRefresh' not in api:
    if anchor not in api:
        raise SystemExit("Odds-only helper anchor not found")
    api = api.replace(anchor, helper + anchor, 1)

old_import = 'import { runFootballImport } from "@/lib/api-football";'
new_import = 'import { runFootballImport, runSelectedOddsRefresh } from "@/lib/api-football";'
if new_import not in route:
    if old_import not in route:
        raise SystemExit("Provider sync import anchor not found")
    route = route.replace(old_import, new_import, 1)

old_body = '''    const gameweekIds = Array.isArray(body?.gameweekIds)
      ? body.gameweekIds.filter((value: unknown): value is string => typeof value === "string" && value.length > 0)
      : undefined;

    return NextResponse.json(await runFootballImport("admin", gameweekIds));'''
new_body = '''    const gameweekIds = Array.isArray(body?.gameweekIds)
      ? body.gameweekIds.filter((value: unknown): value is string => typeof value === "string" && value.length > 0)
      : undefined;
    if (body?.oddsOnly === true) {
      const gameweekId = gameweekIds?.[0];
      if (!gameweekId) return NextResponse.json({ error: "A gameweek is required for odds refresh." }, { status: 400 });
      return NextResponse.json(await runSelectedOddsRefresh(gameweekId));
    }

    return NextResponse.json(await runFootballImport("admin", gameweekIds));'''
if new_body not in route:
    if old_body not in route:
        raise SystemExit("Provider sync body anchor not found")
    route = route.replace(old_body, new_body, 1)

# Parent state/function so dashboard updates immediately without a page reload.
state_anchor = '''  const [liveRefreshing,setLiveRefreshing] = useState(false);
  const liveRefreshBusyRef=useRef(false);'''
state_new = '''  const [liveRefreshing,setLiveRefreshing] = useState(false);
  const [oddsRefreshing,setOddsRefreshing] = useState(false);
  const liveRefreshBusyRef=useRef(false);'''
if state_new not in league:
    if state_anchor not in league:
        raise SystemExit("Odds refresh state anchor not found")
    league = league.replace(state_anchor, state_new, 1)

function_anchor = '''  const livePollActive=useMemo(()=>{'''
function_code = '''  async function refreshSelectedOdds() {
    if(!gameweek?.id||oddsRefreshing)return;
    setOddsRefreshing(true);
    try{
      const r=await fetch("/api/admin/provider-sync",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({gameweekIds:[gameweek.id],oddsOnly:true})});
      const j=await r.json();
      if(!r.ok)throw new Error(j.error??"Could not refresh odds");
      await refreshLiveData(true);
      notice(`Odds checked · ${j.updated??0} updated${j.unavailable?` · ${j.unavailable} unavailable`:""}`);
    }catch(e){notice(e instanceof Error?e.message:"Could not refresh odds")}finally{setOddsRefreshing(false)}
  }

'''
if 'async function refreshSelectedOdds()' not in league:
    if function_anchor not in league:
        raise SystemExit("Odds refresh function anchor not found")
    league = league.replace(function_anchor, function_code + function_anchor, 1)

old_dashboard_call = '''onLiveRefresh={()=>fastLiveRefresh(true)} liveRefreshing={liveRefreshing}/>'''
new_dashboard_call = '''onLiveRefresh={()=>fastLiveRefresh(true)} liveRefreshing={liveRefreshing} onOddsRefresh={refreshSelectedOdds} oddsRefreshing={oddsRefreshing}/>'''
if new_dashboard_call not in league:
    if old_dashboard_call not in league:
        raise SystemExit("Dashboard odds props call anchor not found")
    league = league.replace(old_dashboard_call, new_dashboard_call, 1)

old_sig = '''gameweek,gameweeks,profiles,fixtures,predictions,allPredictions,allAdjustments,adjustment,myFixture,standings,entryFee,seasonLabel,isOpen,role,myId,alertsCount,setView,onLiveRefresh,liveRefreshing
}:{'''
new_sig = '''gameweek,gameweeks,profiles,fixtures,predictions,allPredictions,allAdjustments,adjustment,myFixture,standings,entryFee,seasonLabel,isOpen,role,myId,alertsCount,setView,onLiveRefresh,liveRefreshing,onOddsRefresh,oddsRefreshing
}:{'''
if new_sig not in league:
    if old_sig not in league:
        raise SystemExit("Dashboard odds signature anchor not found")
    league = league.replace(old_sig, new_sig, 1)

type_anchor = '''  onLiveRefresh:()=>void;
  liveRefreshing:boolean;'''
type_new = '''  onLiveRefresh:()=>void;
  liveRefreshing:boolean;
  onOddsRefresh:()=>void;
  oddsRefreshing:boolean;'''
if type_new not in league:
    if type_anchor not in league:
        raise SystemExit("Dashboard odds type anchor not found")
    league = league.replace(type_anchor, type_new, 1)

# apply_patch.py has already reordered/styled this action row before this script executes.
action_anchor = '''              <button type="button" className="dashboardGoldAction dashboardAdminAction" onClick={onLiveRefresh} disabled={liveRefreshing}>{liveRefreshing?"Refreshing…":"Fixture refresh"}</button>'''
action_new = '''              <button type="button" className="dashboardGoldAction dashboardAdminAction" onClick={onLiveRefresh} disabled={liveRefreshing}>{liveRefreshing?"Refreshing…":"Fixture refresh"}</button>
              {isAdmin&&<button type="button" className="dashboardGoldAction dashboardAdminAction" onClick={onOddsRefresh} disabled={oddsRefreshing||!gameweek}>{oddsRefreshing?"Checking…":"Odds refresh"}</button>}'''
if action_new not in league:
    if action_anchor not in league:
        raise SystemExit("Dashboard odds button anchor not found")
    league = league.replace(action_anchor, action_new, 1)

css_marker = '/* admin-odds-checker-20260818 */'
if css_marker not in globals:
    globals += '''

/* admin-odds-checker-20260818 */
.adminDashboard .weeklyPicksPanel .dashboardActionGrid{grid-template-columns:repeat(6,minmax(0,1fr))!important}
@media(max-width:650px){
  .adminDashboard .weeklyPicksPanel .dashboardActionGrid{grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:3px!important}
  .adminDashboard .weeklyPicksPanel .dashboardGoldAction{font-size:7.4px!important;padding:3px 2px!important}
}
'''

api_path.write_text(api)
route_path.write_text(route)
league_path.write_text(league)
globals_path.write_text(globals)
print("Applied admin-only selected-fixture odds checker button")
