from pathlib import Path

league_path = Path("app/LeagueApp.tsx")
page_path = Path("app/page.tsx")
login_path = Path("app/login/page.tsx")
public_table_path = Path("app/PublicLeagueTable.tsx")

league = league_path.read_text()
page = page_path.read_text()
login = login_path.read_text()
public_table = public_table_path.read_text()

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

league_path.write_text(league)
page_path.write_text(page)
login_path.write_text(login)
public_table_path.write_text(public_table)
print("Applied v1.4.9.2 gameweek admin cards + crest cache-bust hotfix")
