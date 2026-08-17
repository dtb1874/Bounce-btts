from pathlib import Path
import re

league_path = Path("app/LeagueApp.tsx")
page_path = Path("app/page.tsx")
login_path = Path("app/login/page.tsx")
public_table_path = Path("app/PublicLeagueTable.tsx")
globals_path = Path("app/globals.css")

league = league_path.read_text()
page = page_path.read_text()
login = login_path.read_text()
public_table = public_table_path.read_text()
globals = globals_path.read_text()

old_type = 'type Gameweek = { id: string; number: number; status: "open" | "locked" | "complete"; opens_at: string | null; locks_at: string; season_id: string | null };'
new_type = 'type Gameweek = { id: string; number: number; status: "open" | "locked" | "complete"; opens_at: string | null; locks_at: string; season_id: string | null; selection_rule_mode?: "exact_time" | "any_kickoff"; selection_weekday?: number; selection_time?: string };'
if new_type not in league:
    if old_type not in league:
        raise SystemExit("Gameweek type anchor not found")
    league = league.replace(old_type, new_type, 1)

old_component = '''function GameweekAdmin({gameweek,notice,onChanged}:{gameweek:Gameweek|null;notice:(m:string)=>void;onChanged:()=>void}){const [status,setStatus]=useState(gameweek?.status??"open");const [deadline,setDeadline]=useState(gameweek?new Date(gameweek.locks_at).toISOString().slice(0,16):"");useEffect(()=>{setStatus(gameweek?.status??"open");setDeadline(gameweek?new Date(gameweek.locks_at).toISOString().slice(0,16):"")},[gameweek?.id]);async function save(){if(!gameweek)return;const r=await fetch("/api/admin/gameweek",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({id:gameweek.id,status,locksAt:new Date(deadline).toISOString()})});const j=await r.json();notice(r.ok?"Gameweek updated":j.error);if(r.ok)onChanged()}return <div><div className={styles.formGrid}><label className={styles.field}>Status <Help text="Open accepts normal member picks; Locked closes them; Complete marks the gameweek finished."/><select value={status} onChange={e=>setStatus(e.target.value as any)}><option value="open">Open</option><option value="locked">Locked</option><option value="complete">Complete</option></select></label><label className={styles.field}>Deadline <Help text="Normal league deadline is Friday at 17:00 UK time unless you deliberately change it."/><input type="datetime-local" value={deadline} onChange={e=>setDeadline(e.target.value)}/></label></div><button className={styles.primary} onClick={save}>Save current gameweek</button></div>}'''

new_component = '''function GameweekAdmin({gameweek,notice,onChanged}:{gameweek:Gameweek|null;notice:(m:string)=>void;onChanged:()=>void}){
  const localValue=(value:string|null|undefined)=>value?new Date(value).toLocaleString("sv-SE",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).replace(" ","T"):"";
  const [status,setStatus]=useState(gameweek?.status??"open");
  const [deadline,setDeadline]=useState(localValue(gameweek?.locks_at));
  const [opensAt,setOpensAt]=useState(localValue(gameweek?.opens_at));
  const [selectionRuleMode,setSelectionRuleMode]=useState<"exact_time"|"any_kickoff">(gameweek?.selection_rule_mode??"exact_time");
  const [selectionWeekday,setSelectionWeekday]=useState(gameweek?.selection_weekday??6);
  const [selectionTime,setSelectionTime]=useState((gameweek?.selection_time??"15:00").slice(0,5));
  useEffect(()=>{
    setStatus(gameweek?.status??"open");setDeadline(localValue(gameweek?.locks_at));setOpensAt(localValue(gameweek?.opens_at));
    setSelectionRuleMode(gameweek?.selection_rule_mode??"exact_time");setSelectionWeekday(gameweek?.selection_weekday??6);setSelectionTime((gameweek?.selection_time??"15:00").slice(0,5));
  },[gameweek?.id,gameweek?.status,gameweek?.locks_at,gameweek?.opens_at,gameweek?.selection_rule_mode,gameweek?.selection_weekday,gameweek?.selection_time]);
  async function save(){
    if(!gameweek||!deadline)return;
    const r=await fetch("/api/admin/gameweek",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({
      id:gameweek.id,status,locksAt:new Date(deadline).toISOString(),opensAt:opensAt?new Date(opensAt).toISOString():null,
      selectionRuleMode,selectionWeekday,selectionTime
    })});
    const j=await r.json();notice(r.ok?`Gameweek ${gameweek.number} settings updated`:j.error);if(r.ok)onChanged();
  }
  if(!gameweek)return <div className={styles.notice}>Create or select a gameweek first.</div>;
  const weekdays=[[1,"Monday"],[2,"Tuesday"],[3,"Wednesday"],[4,"Thursday"],[5,"Friday"],[6,"Saturday"],[7,"Sunday"]] as const;
  const cardStyle={border:"1px solid rgba(112,66,77,.55)",borderRadius:14,padding:16,background:"linear-gradient(145deg,rgba(25,20,27,.95),rgba(13,14,18,.98))",minWidth:0} as const;
  return <div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,alignItems:"stretch"}}>
      <section style={cardStyle}>
        <div className={styles.title}>GAMEWEEK CONTROL</div>
        <p className={styles.subtle}>Control whether GW {gameweek.number} is available, locked or complete and set its selection deadline.</p>
        <div className={styles.formGrid} style={{gridTemplateColumns:"1fr"}}>
          <label className={styles.field}>Status <Help text="Open accepts normal member picks; Locked closes them; Complete marks the gameweek finished."/><select value={status} onChange={e=>setStatus(e.target.value as any)}><option value="open">Open</option><option value="locked">Locked</option><option value="complete">Complete</option></select></label>
          <label className={styles.field}>Deadline <Help text="The final date and time members can submit or change their selection."/><input type="datetime-local" value={deadline} onChange={e=>setDeadline(e.target.value)}/></label>
        </div>
      </section>
      <section style={cardStyle}>
        <div className={styles.title}>GAMEWEEK MECHANICS</div>
        <p className={styles.subtle}>Override when this gameweek opens and which UK fixtures are authorised for selection.</p>
        <div className={styles.formGrid} style={{gridTemplateColumns:"1fr"}}>
          <label className={styles.field}>Opens <Help text="Set this earlier when you want to open a round ahead of the normal schedule."/><input type="datetime-local" value={opensAt} onChange={e=>setOpensAt(e.target.value)}/></label>
          <label className={styles.field}>Eligible fixture day<select value={selectionWeekday} onChange={e=>setSelectionWeekday(Number(e.target.value))}>{weekdays.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
          <label className={styles.field}>Fixture rule<select value={selectionRuleMode} onChange={e=>setSelectionRuleMode(e.target.value as "exact_time"|"any_kickoff")}><option value="exact_time">Exact UK kick-off time</option><option value="any_kickoff">Any UK kick-off on selected day</option></select></label>
          {selectionRuleMode==="exact_time"&&<label className={styles.field}>Eligible kick-off time <Help text="Normal rounds use 15:00. Midweek rounds can use 19:45, 20:00 or another UK time."/><input type="time" value={selectionTime} onChange={e=>setSelectionTime(e.target.value)}/></label>}
        </div>
      </section>
    </div>
    <div className={styles.buttonRow} style={{marginTop:16}}><button className={styles.primary} onClick={save}>Save Gameweek {gameweek.number} settings</button></div>
  </div>
}'''

if new_component not in league:
    if old_component not in league:
        raise SystemExit("GameweekAdmin anchor not found")
    league = league.replace(old_component, new_component, 1)

old_query = '.select("id,number,status,opens_at,locks_at,season_id")'
new_query = '.select("id,number,status,opens_at,locks_at,season_id,selection_rule_mode,selection_weekday,selection_time")'
if new_query not in page:
    if old_query not in page:
        raise SystemExit("Gameweek query anchor not found")
    page = page.replace(old_query, new_query, 1)

# Crest asset hotfix: use a versioned URL so existing iOS/browser caches cannot keep the legacy crest.
old_crest = "/assets/hearts-crest.png"
new_crest = "/assets/hearts-crest.png?v=gold-crest-20260817-1945"
league = league.replace(old_crest, new_crest)
login = login.replace(old_crest, new_crest)
public_table = public_table.replace(old_crest, new_crest)

# Dashboard cleanup hotfix: presentation only. No scoring, refresh or selection logic changes.
old_hero = '''<header className={styles.hero}><div><h1>BOUNCE</h1><h2>— BTTS LEAGUE —</h2><p>EDINBURGH · HEART OF MIDLOTHIAN · EST 2024</p></div><div className={styles.gwCard}><label>Season {seasonLabel}</label><div className={styles.gwRow}><button disabled={initialGameweeks.findIndex(g=>g.id===gameweekId)<=0} onClick={()=>{const i=initialGameweeks.findIndex(g=>g.id===gameweekId);if(i>0)setGameweekId(initialGameweeks[i-1].id)}}>‹</button><select value={gameweek?.id??""} onChange={e=>setGameweekId(e.target.value)}>{initialGameweeks.map(g=><option key={g.id} value={g.id}>GW {g.number}</option>)}</select><button disabled={initialGameweeks.findIndex(g=>g.id===gameweekId)>=initialGameweeks.length-1} onClick={()=>{const i=initialGameweeks.findIndex(g=>g.id===gameweekId);if(i>=0&&i<initialGameweeks.length-1)setGameweekId(initialGameweeks[i+1].id)}}>›</button></div><small>{gameweekStatusText(gameweek??null,now)}</small>{isDemo&&<div className={styles.demoSwitch}><button className={demoPerspective==="member"?styles.active:""} onClick={()=>{setDemoPerspective("member");setView("dashboard")}}>Member View</button><button className={demoPerspective==="admin"?styles.active:""} onClick={()=>{setDemoPerspective("admin");setView("dashboard")}}>Admin View</button></div>}</div></header>'''
new_hero = '''<header className={`${styles.hero} dashboardBrandHero`}><div className="dashboardBrandLockup"><img className="dashboardBrandCrest" src="/assets/hearts-crest.png?v=gold-crest-20260817-1945" alt=""/><div><p className="dashboardBrandEyebrow">EST 2024 · SEASON {seasonLabel}</p><h1>BOUNCE</h1><h2>BTTS LEAGUE</h2></div></div><div className={`${styles.gwCard} dashboardGwCompact`}><label>Gameweek</label><div className={styles.gwRow}><button disabled={initialGameweeks.findIndex(g=>g.id===gameweekId)<=0} onClick={()=>{const i=initialGameweeks.findIndex(g=>g.id===gameweekId);if(i>0)setGameweekId(initialGameweeks[i-1].id)}}>‹</button><select value={gameweek?.id??""} onChange={e=>setGameweekId(e.target.value)}>{initialGameweeks.map(g=><option key={g.id} value={g.id}>GW {g.number}</option>)}</select><button disabled={initialGameweeks.findIndex(g=>g.id===gameweekId)>=initialGameweeks.length-1} onClick={()=>{const i=initialGameweeks.findIndex(g=>g.id===gameweekId);if(i>=0&&i<initialGameweeks.length-1)setGameweekId(initialGameweeks[i+1].id)}}>›</button></div><small>{gameweekStatusText(gameweek??null,now)}</small>{isDemo&&<div className={styles.demoSwitch}><button className={demoPerspective==="member"?styles.active:""} onClick={()=>{setDemoPerspective("member");setView("dashboard")}}>Member View</button><button className={demoPerspective==="admin"?styles.active:""} onClick={()=>{setDemoPerspective("admin");setView("dashboard")}}>Admin View</button></div>}</div></header>'''
if new_hero not in league:
    if old_hero not in league:
        raise SystemExit("Dashboard hero anchor not found")
    league = league.replace(old_hero, new_hero, 1)

# Remove redundant Your Pick dashboard card only; Make My Pick remains untouched.
if 'mobilePickPanel' in league:
    league, removed_pick_panel = re.subn(
        r'\n\s*<article className=\{`\$\{styles\.panel\} \$\{styles\.pickPanel\} mobilePickPanel`\}>.*?</article>\n\n\s*(<article id="weekly-picks")',
        r'\n\n        \1',
        league,
        count=1,
        flags=re.S,
    )
    if removed_pick_panel != 1:
        raise SystemExit("Your Pick dashboard card anchor not found")

old_heading = '<div><div className={styles.title}>GAMEWEEK PICKS & LIVE RESULTS</div><h3>Everyone at a glance</h3></div>'
new_heading = '<div className="weeklyPicksHeading"><h3>Everyone at a glance</h3><div className={styles.title}>GAMEWEEK PICKS & LIVE RESULTS</div></div>'
if new_heading not in league:
    if old_heading not in league:
        raise SystemExit("Everyone at a glance heading anchor not found")
    league = league.replace(old_heading, new_heading, 1)

old_actions = '''              <button type="button" className="dashboardGoldAction" onClick={onLiveRefresh} disabled={liveRefreshing}>{liveRefreshing?"Refreshing…":"Fixture refresh"}</button>
              <button type="button" className="dashboardGoldAction" onClick={()=>setView("combined")}>Combined results</button>
              <WeeklyPicksShareButton disabled={!gameweek} gameweekNumber={gameweek?.number??0} seasonLabel={seasonLabel} picks={picks.filter(p=>p.fixture).map(p=>({player:p.profile.display_name,homeTeam:p.fixture!.home_team,awayTeam:p.fixture!.away_team,competition:competitionDisplayName(p.fixture!),kickoffAt:p.fixture!.kickoff_at,odds:p.fixture!.odds_fractional,status:p.fixture!.status,homeScore:p.fixture!.home_score,awayScore:p.fixture!.away_score,elapsed:p.fixture!.live_elapsed??null}))}/>
              <CombinedShareButton disabled={!gameweek} gameweekNumber={gameweek?.number??0} seasonLabel={seasonLabel} picks={picks.filter(p=>p.fixture).map(p=>({player:p.profile.display_name,homeTeam:p.fixture!.home_team,awayTeam:p.fixture!.away_team,competition:competitionDisplayName(p.fixture!),kickoffAt:p.fixture!.kickoff_at,odds:p.fixture!.odds_fractional,status:p.fixture!.status,homeScore:p.fixture!.home_score,awayScore:p.fixture!.away_score,elapsed:p.fixture!.live_elapsed??null}))} standings={standings}/>
              {isAdmin&&<button type="button" className="dashboardGoldAction" onClick={remindMissingPicks} disabled={!isOpen||!missingPicks.length} aria-label={missingPicks.length?`Remind ${missingPicks.length} missing picks via WhatsApp`:"All picks are in"}>{missingPicks.length?"Remind Picks":"All Picks In ✓"}</button>}'''
new_actions = '''              <button type="button" className="dashboardGoldAction dashboardAdminAction" onClick={onLiveRefresh} disabled={liveRefreshing}>{liveRefreshing?"Refreshing…":"Fixture refresh"}</button>
              <WeeklyPicksShareButton disabled={!gameweek} gameweekNumber={gameweek?.number??0} seasonLabel={seasonLabel} picks={picks.filter(p=>p.fixture).map(p=>({player:p.profile.display_name,homeTeam:p.fixture!.home_team,awayTeam:p.fixture!.away_team,competition:competitionDisplayName(p.fixture!),kickoffAt:p.fixture!.kickoff_at,odds:p.fixture!.odds_fractional,status:p.fixture!.status,homeScore:p.fixture!.home_score,awayScore:p.fixture!.away_score,elapsed:p.fixture!.live_elapsed??null}))}/>
              <button type="button" className="dashboardGoldAction" onClick={()=>setView("combined")}>Combined results</button>
              <CombinedShareButton disabled={!gameweek} gameweekNumber={gameweek?.number??0} seasonLabel={seasonLabel} picks={picks.filter(p=>p.fixture).map(p=>({player:p.profile.display_name,homeTeam:p.fixture!.home_team,awayTeam:p.fixture!.away_team,competition:competitionDisplayName(p.fixture!),kickoffAt:p.fixture!.kickoff_at,odds:p.fixture!.odds_fractional,status:p.fixture!.status,homeScore:p.fixture!.home_score,awayScore:p.fixture!.away_score,elapsed:p.fixture!.live_elapsed??null}))} standings={standings}/>
              {isAdmin&&<button type="button" className="dashboardGoldAction dashboardAdminAction" onClick={remindMissingPicks} disabled={!isOpen||!missingPicks.length} aria-label={missingPicks.length?`Remind ${missingPicks.length} missing picks via WhatsApp`:"All picks are in"}>{missingPicks.length?"Remind Picks":"All Picks In ✓"}</button>}'''
if new_actions not in league:
    if old_actions not in league:
        raise SystemExit("Dashboard action row anchor not found")
    league = league.replace(old_actions, new_actions, 1)

old_pick_row = '''              return <div className={`${styles.pickListRow} ${isAdmin&&!prediction?"adminMissingPickRow":""}`} key={profile.id}>
                <div className={styles.playerCell}><span className={styles.avatar}>{initials(profile.display_name)}</span><strong>{profile.display_name}</strong></div>
                <div className={styles.fixtureCell}>{fixture?<><strong>{fixture.home_team} v {fixture.away_team}</strong><small>{competitionDisplayName(fixture)} · {fixture.odds_fractional??"—"}</small></>:<span>Awaiting selection</span>}</div>
                <div className={styles.liveCell}>{fixture?.home_score!=null?<strong>{fixture.home_score}-{fixture.away_score}</strong>:<strong>—</strong>}<small>{fixture?fixtureStatusLabel(fixture):"PENDING"}</small></div>'''
new_pick_row = '''              return <div className={`${styles.pickListRow} dashboardSnapshotRow ${isAdmin&&!prediction?"adminMissingPickRow":""}`} key={profile.id}>
                <div className={styles.playerCell}><span className={styles.avatar}>{initials(profile.display_name)}</span><strong>{profile.display_name}</strong></div>
                <div className={`${styles.fixtureCell} dashboardSnapshotFixture`}>{fixture?<><small className="dashboardCompetition">{competitionDisplayName(fixture)}</small><strong>{fixture.home_team} v {fixture.away_team}</strong><small>BTTS {fixture.odds_fractional??"—"}</small></>:<span>Awaiting selection</span>}</div>
                <div className={`${styles.liveCell} dashboardSnapshotLive`}>{fixture?.home_score!=null?<strong>{fixture.home_score}-{fixture.away_score}</strong>:<strong>—</strong>}<small>{fixture?fixtureStatusLabel(fixture):"PENDING"}</small></div>'''
if new_pick_row not in league:
    if old_pick_row not in league:
        raise SystemExit("Dashboard player snapshot anchor not found")
    league = league.replace(old_pick_row, new_pick_row, 1)

css_marker = "/* dashboard-cleanup-hotfix-20260817 */"
if css_marker not in globals:
    globals += r'''

/* dashboard-cleanup-hotfix-20260817 */
.dashboardBrandHero{
  min-height:138px!important;
  padding:18px 24px 11px!important;
  align-items:flex-end!important;
}
.dashboardBrandLockup{display:flex;align-items:center;gap:14px;min-width:0}
.dashboardBrandCrest{width:70px;height:74px;object-fit:contain;filter:drop-shadow(0 5px 13px rgba(0,0,0,.38));flex:0 0 auto}
.dashboardBrandLockup h1{font-size:38px!important;line-height:.94!important;letter-spacing:.075em!important}
.dashboardBrandLockup h2{margin-top:5px!important;font-size:16px!important;letter-spacing:.18em!important}
.dashboardBrandEyebrow{margin:0 0 5px!important;color:#c9bba9!important;font-size:9px!important;letter-spacing:.14em!important}
.dashboardGwCompact{
  min-width:184px!important;width:184px!important;
  padding:8px 9px!important;border-radius:10px!important;
  margin-bottom:-1px!important;transform:translateY(5px);
}
.dashboardGwCompact label{font-size:8px!important;letter-spacing:.1em!important}
.dashboardGwCompact [class*="gwRow"]{gap:5px!important;margin-top:4px!important}
.dashboardGwCompact [class*="gwRow"] select,.dashboardGwCompact [class*="gwRow"] button{padding:5px 6px!important;min-height:30px!important}
.dashboardGwCompact small{margin-top:4px!important;font-size:9px!important;line-height:1.15!important}

.weeklyPicksPanel [class*="panelHeading"]{display:grid!important;grid-template-columns:1fr!important;gap:8px!important;align-items:start!important}
.weeklyPicksHeading{min-width:0}
.weeklyPicksHeading h3{margin:0 0 4px!important;font-size:20px!important;color:#f1e7dc!important}
.weeklyPicksHeading [class*="title"]{margin:0!important;font-size:9px!important;color:#bda58e!important;letter-spacing:.12em!important}
.weeklyPicksPanel .dashboardActionGrid{
  width:100%!important;max-width:none!important;
  display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;
  gap:6px!important;
}
.weeklyPicksPanel .dashboardGoldAction{
  width:100%!important;min-width:0!important;height:36px!important;min-height:36px!important;
  padding:4px 6px!important;border-radius:8px!important;font-size:9.5px!important;line-height:1.05!important;
}
.weeklyPicksPanel .dashboardActionGrid>button:nth-child(4){
  font-weight:950!important;
  background:linear-gradient(180deg,#f7dda0,#d9ac54 60%,#ba7f29)!important;
  border-color:#ffe4a6!important;
  box-shadow:0 5px 14px rgba(200,151,55,.26)!important;
}
.weeklyPicksPanel .dashboardAdminAction{
  background:linear-gradient(180deg,#44363a,#30272b)!important;
  color:#dfc89f!important;border-color:#755c55!important;
  box-shadow:none!important;
}
.dashboardSnapshotRow{min-height:58px!important;padding-top:7px!important;padding-bottom:7px!important}
.dashboardSnapshotFixture{display:flex!important;flex-direction:column!important;gap:2px!important;min-width:0!important}
.dashboardSnapshotFixture .dashboardCompetition{order:0!important;color:#c4a77f!important;font-size:9px!important;font-weight:900!important;letter-spacing:.05em!important;text-transform:uppercase!important}
.dashboardSnapshotFixture strong{order:1!important;font-size:12px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
.dashboardSnapshotFixture small:not(.dashboardCompetition){order:2!important;font-size:9px!important;color:#99918b!important}
.dashboardSnapshotLive strong{font-size:16px!important;line-height:1!important}
.dashboardSnapshotLive small{font-size:9px!important}

@media(max-width:650px){
  .dashboardBrandHero{
    min-height:112px!important;padding:11px 10px 6px!important;
    display:grid!important;grid-template-columns:minmax(0,1fr) 142px!important;
    gap:8px!important;align-items:end!important;
  }
  .dashboardBrandLockup{gap:8px!important;align-self:end!important}
  .dashboardBrandCrest{width:46px!important;height:50px!important}
  .dashboardBrandLockup h1{font-size:25px!important;letter-spacing:.065em!important}
  .dashboardBrandLockup h2{font-size:10px!important;letter-spacing:.14em!important;margin-top:3px!important}
  .dashboardBrandEyebrow{font-size:7px!important;letter-spacing:.08em!important;margin-bottom:3px!important;white-space:nowrap!important}
  .dashboardGwCompact{width:142px!important;min-width:142px!important;padding:6px!important;transform:translateY(3px)!important;margin:0!important}
  .dashboardGwCompact [class*="gwRow"]{gap:3px!important;margin-top:3px!important}
  .dashboardGwCompact [class*="gwRow"] select,.dashboardGwCompact [class*="gwRow"] button{padding:4px!important;min-height:27px!important;font-size:10px!important}
  .dashboardGwCompact small{font-size:7px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
  .weeklyPicksPanel .dashboardActionGrid{grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:4px!important;width:100%!important}
  .weeklyPicksPanel .dashboardGoldAction{width:100%!important;height:34px!important;min-height:34px!important;padding:3px 3px!important;font-size:8px!important;border-radius:7px!important;white-space:normal!important}
  .weeklyPicksHeading h3{font-size:18px!important}
  .dashboardSnapshotRow{min-height:54px!important;gap:6px!important;padding:6px 0!important}
  .dashboardSnapshotRow [class*="playerCell"] strong{font-size:11px!important}
  .dashboardSnapshotFixture strong{font-size:10.5px!important}
  .dashboardSnapshotFixture .dashboardCompetition,.dashboardSnapshotFixture small:not(.dashboardCompetition){font-size:7.5px!important}
  .dashboardSnapshotLive strong{font-size:14px!important}
}
'''

league_path.write_text(league)
page_path.write_text(page)
login_path.write_text(login)
public_table_path.write_text(public_table)
globals_path.write_text(globals)
print("Applied v1.4.9.2 gameweek/admin/crest + compact dashboard hotfix")
