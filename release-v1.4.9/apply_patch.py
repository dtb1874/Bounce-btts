from pathlib import Path
import re

league=Path('app/LeagueApp.tsx')
s=league.read_text()
s=re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.4.9";', s, count=1)
s=re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "15 Aug 2026";', s, count=1)

# Live refresh state alongside the existing clock state.
needle='''  const [now,setNow] = useState(Date.now());\n  const [alertsCount,setAlertsCount] = useState(0);'''
replacement='''  const [now,setNow] = useState(Date.now());\n  const [liveRefreshing,setLiveRefreshing] = useState(false);\n  const liveRefreshBusyRef=useRef(false);\n  const [alertsCount,setAlertsCount] = useState(0);'''
if needle not in s: raise SystemExit('Could not locate live refresh state insertion point')
s=s.replace(needle,replacement,1)

# Add batched provider refresh on top of the lightweight Supabase reload.
needle='''  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()),30000); return () => clearInterval(t); },[]);\n  useEffect(() => { if (!gameweek?.id) return; const t = window.setInterval(() => refreshLiveData(true),45000); return () => clearInterval(t); },[gameweek?.id]);'''
replacement='''  async function fastLiveRefresh(manual=false) {\n    if(!gameweek?.id||liveRefreshBusyRef.current)return;\n    liveRefreshBusyRef.current=true;setLiveRefreshing(true);\n    try{\n      const r=await fetch(`/api/live-results?gameweekId=${encodeURIComponent(gameweek.id)}`,{headers:{authorization:`Bearer ${await token()}`},cache:"no-store"});\n      const j=await r.json();\n      if(!r.ok)throw new Error(j.error??"Could not refresh live scores");\n      await refreshLiveData(true);\n      if(manual)notice(j.providerFixtures?`Live scores refreshed · ${j.updated??0} updated`:"Live scores checked");\n    }catch(e){if(manual)notice(e instanceof Error?e.message:"Could not refresh live scores")}finally{liveRefreshBusyRef.current=false;setLiveRefreshing(false)}\n  }\n\n  const livePollActive=useMemo(()=>{\n    if(!gameweek?.id||!currentPredictions.length)return false;\n    const t=now;\n    return currentFixtures.some(f=>{\n      if(!selectedFixtureIds.has(f.id)||finishedStatuses.includes(f.status))return false;\n      const kickoff=new Date(f.kickoff_at).getTime();\n      return kickoff<=t+10*60*1000&&kickoff>=t-4*60*60*1000;\n    });\n  },[gameweek?.id,currentPredictions.length,currentFixtures,selectedFixtureIds,now]);\n\n  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()),30000); return () => clearInterval(t); },[]);\n  useEffect(() => { if (!gameweek?.id) return; const t = window.setInterval(() => refreshLiveData(true),45000); return () => clearInterval(t); },[gameweek?.id]);\n  useEffect(() => {\n    if(!livePollActive)return;\n    void fastLiveRefresh(false);\n    const t=window.setInterval(()=>void fastLiveRefresh(false),15000);\n    return()=>window.clearInterval(t);\n  },[livePollActive,gameweek?.id]);'''
if needle not in s: raise SystemExit('Could not locate refresh effects')
s=s.replace(needle,replacement,1)

# Wire Dashboard callback/state.
needle='''        {view==="dashboard" && <Dashboard gameweek={gameweek??null} gameweeks={initialGameweeks} profiles={profiles} fixtures={currentFixtures} predictions={currentPredictions} allPredictions={predictions} allAdjustments={adjustments} adjustment={selectedAdjustment} myFixture={selectedFixture} standings={standings} entryFee={entryFee} seasonLabel={seasonLabel} isOpen={isOpen} role={effectiveRole} myId={viewerProfile.id} alertsCount={alertsCount} setView={setView}/>}'''
replacement='''        {view==="dashboard" && <Dashboard gameweek={gameweek??null} gameweeks={initialGameweeks} profiles={profiles} fixtures={currentFixtures} predictions={currentPredictions} allPredictions={predictions} allAdjustments={adjustments} adjustment={selectedAdjustment} myFixture={selectedFixture} standings={standings} entryFee={entryFee} seasonLabel={seasonLabel} isOpen={isOpen} role={effectiveRole} myId={viewerProfile.id} alertsCount={alertsCount} setView={setView} onLiveRefresh={()=>fastLiveRefresh(true)} liveRefreshing={liveRefreshing}/>}'''
if needle not in s: raise SystemExit('Could not locate Dashboard render')
s=s.replace(needle,replacement,1)

# Dashboard props.
needle='''  gameweek,gameweeks,profiles,fixtures,predictions,allPredictions,allAdjustments,adjustment,myFixture,standings,entryFee,seasonLabel,isOpen,role,myId,alertsCount,setView\n}:{'''
replacement='''  gameweek,gameweeks,profiles,fixtures,predictions,allPredictions,allAdjustments,adjustment,myFixture,standings,entryFee,seasonLabel,isOpen,role,myId,alertsCount,setView,onLiveRefresh,liveRefreshing\n}:{'''
if needle not in s: raise SystemExit('Could not locate Dashboard argument list')
s=s.replace(needle,replacement,1)
needle='''  setView:(v:View)=>void;\n}){'''
replacement='''  setView:(v:View)=>void;\n  onLiveRefresh:()=>void;\n  liveRefreshing:boolean;\n}){'''
if needle not in s: raise SystemExit('Could not locate Dashboard prop types')
s=s.replace(needle,replacement,1)

# Fill the empty fourth action slot in Weekly Picks with an admin-only quick refresh.
needle='''              {isAdmin&&<button type="button" className="adminReminderButton adminReminderHeaderButton" onClick={remindMissingPicks} disabled={!isOpen||!missingPicks.length} aria-label={missingPicks.length?`Remind ${missingPicks.length} missing picks via WhatsApp`:"All picks are in"}>{missingPicks.length?"Remind Picks":"All Picks In ✓"}</button>}\n            </div>'''
replacement='''              {isAdmin&&<button type="button" className="adminReminderButton adminReminderHeaderButton" onClick={remindMissingPicks} disabled={!isOpen||!missingPicks.length} aria-label={missingPicks.length?`Remind ${missingPicks.length} missing picks via WhatsApp`:"All picks are in"}>{missingPicks.length?"Remind Picks":"All Picks In ✓"}</button>}\n              {isAdmin&&<button type="button" className="adminReminderButton adminLiveRefreshButton" onClick={onLiveRefresh} disabled={liveRefreshing}>{liveRefreshing?"Refreshing…":"↻ Refresh"}</button>}\n            </div>'''
if needle not in s: raise SystemExit('Could not locate weekly action buttons')
s=s.replace(needle,replacement,1)

# Make Admin > Fixtures Quick results refresh use the same batched live path; full refresh remains provider-sync.
old='''function FixturesAdmin({gameweek,nextGameweek,notice,onChanged}:{gameweek:Gameweek|null;nextGameweek:Gameweek|null;notice:(m:string)=>void;onChanged:()=>void}){const [busy,setBusy]=useState("");const [form,setForm]=useState({competition:"Scottish Premiership",country:"Scotland",homeTeam:"",awayTeam:"",kickoffLocal:"",oddsFractional:""});async function sync(gw:Gameweek|null,mode:"results"|"full"){if(!gw)return;setBusy(mode);const r=await fetch("/api/admin/provider-sync",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({gameweekIds:[gw.id],mode})});const j=await r.json();notice(r.ok?(mode==="results"?`Results refresh complete · ${j.fixturesUpdated??0} updated`:`Full refresh complete · ${j.fixturesAdded??0} added, ${j.fixturesUpdated??0} updated, ${j.oddsUpdated??0} odds`):j.error);setBusy("");if(r.ok)onChanged()}'''
new='''function FixturesAdmin({gameweek,nextGameweek,notice,onChanged}:{gameweek:Gameweek|null;nextGameweek:Gameweek|null;notice:(m:string)=>void;onChanged:()=>void}){const [busy,setBusy]=useState("");const [form,setForm]=useState({competition:"Scottish Premiership",country:"Scotland",homeTeam:"",awayTeam:"",kickoffLocal:"",oddsFractional:""});async function sync(gw:Gameweek|null,mode:"results"|"full"){if(!gw)return;setBusy(mode);const auth={authorization:`Bearer ${await token()}`};const r=mode==="results"?await fetch(`/api/live-results?gameweekId=${encodeURIComponent(gw.id)}`,{headers:auth,cache:"no-store"}):await fetch("/api/admin/provider-sync",{method:"POST",headers:{"content-type":"application/json",...auth},body:JSON.stringify({gameweekIds:[gw.id],mode})});const j=await r.json();notice(r.ok?(mode==="results"?`Live refresh complete · ${j.updated??0} updated`:`Full refresh complete · ${j.fixturesAdded??0} added, ${j.fixturesUpdated??0} updated, ${j.oddsUpdated??0} odds`):j.error);setBusy("");if(r.ok)onChanged()}'''
if old not in s: raise SystemExit('Could not locate FixturesAdmin sync function')
s=s.replace(old,new,1)
s=s.replace('Quick results refresh asks the live provider-sync route for results mode, while Full fixture & odds refresh performs the full catalogue update.', 'Quick live refresh uses the same batched live-score path as the Dashboard, while Full fixture & odds refresh performs the heavier catalogue update.',1)
s=s.replace('Use Quick during match time. Use Full when you need new fixtures, kickoff changes or refreshed BTTS odds.', 'Use Quick Live during match time. It refreshes only selected fixtures in batches. Use Full when you need new fixtures, kickoff changes or refreshed BTTS odds.',1)
s=s.replace('busy==="results"?"Refreshing results…":"Quick results refresh"', 'busy==="results"?"Refreshing live scores…":"Quick live refresh"',1)

# Release history.
needle='const releases=[\n    {version:"1.4.8.4"'
replacement='const releases=[\n    {version:"1.4.9",date:"15 Aug 2026",summary:"Near-live score refresh and batched provider updates",changes:["Current-gameweek selected fixtures now use a dedicated batched API-Football refresh path instead of one provider request per fixture","During live match windows the app automatically checks selected fixtures every 15 seconds, with API responses centrally cached for 15 seconds to reduce duplicate provider usage","The admin Dashboard Weekly Picks action cluster now includes an immediate Refresh control for live scores","Admin → Fixtures Quick results refresh now uses the same fast batched live-score path; the heavier Full fixture & odds refresh remains separate","Finished matches still persist final scores and award points through the existing scoring rules, while the scheduled sync remains as a safety net"]},\n    {version:"1.4.8.4"'
if needle not in s: raise SystemExit('Could not locate v1.4.8.4 release entry')
s=s.replace(needle,replacement,1)
league.write_text(s)

css=Path('app/globals.css')
g=css.read_text()
marker='/* v1.4.9 live score refresh */'
if marker not in g:
    g += r'''

/* v1.4.9 live score refresh */
.adminLiveRefreshButton{min-width:112px;min-height:40px;padding:7px 10px;background:linear-gradient(180deg,#7d2941,#5e182d)}
.adminLiveRefreshButton:disabled{opacity:.55;cursor:wait}
@media(max-width:650px){
  .weeklyPicksPanel .adminLiveRefreshButton{width:99px!important;min-width:99px!important;max-width:99px!important;min-height:38px!important;padding:6px 7px!important;font-size:10px!important;line-height:1.05!important}
}
'''
    css.write_text(g)
