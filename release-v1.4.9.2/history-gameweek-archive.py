from pathlib import Path

league_path = Path("app/LeagueApp.tsx")
globals_path = Path("app/globals.css")
league = league_path.read_text()
globals = globals_path.read_text()

state_anchor = '  const selectedWinner = selected?.standings[0];\n'
state_insert = '''  const selectedWinner = selected?.standings[0];
  const selectedHistorical = historicalSeasons.find((season)=>season.season===selected?.label);
  const [historicArchiveOpen,setHistoricArchiveOpen]=useState(false);
  const [openHistoricWeek,setOpenHistoricWeek]=useState<number|null>(null);
  const [historicFormPlayer,setHistoricFormPlayer]=useState("");
  const [historicFormRange,setHistoricFormRange]=useState<6|12|18>(6);
  useEffect(()=>{setHistoricArchiveOpen(false);setOpenHistoricWeek(null);setHistoricFormPlayer("")},[id]);
  const historicalWeeks = selectedHistorical ? Array.from({length:selectedHistorical.weeks},(_,index)=>{
    const rows=selectedHistorical.weekly.map((player)=>({name:player.name,code:player.weeklyResultCodes[index],points:player.weeklyAwardedPoints[index]})).filter((row)=>row.code!=null);
    return {number:index+1,rows,wins:rows.filter((row)=>row.code===1).length,scoreNil:rows.filter((row)=>row.code===0).length,losses:rows.filter((row)=>row.code===-1).length};
  }) : [];
  const historicFormNames=selectedHistorical?.weekly.map((player)=>player.name)??[];
  const historicFormName=historicFormPlayer||historicFormNames[0]||"";
  const historicFormRow=selectedHistorical?.weekly.find((player)=>player.name===historicFormName);
  const historicRecentResults=historicFormRow?historicFormRow.weeklyResultCodes.map((code,index)=>({week:index+1,code,points:historicFormRow.weeklyAwardedPoints[index]})).filter((row)=>row.code!=null).slice(-historicFormRange):[];
'''
if 'const historicalWeeks = selectedHistorical' not in league:
    if state_anchor not in league:
        raise SystemExit("History state anchor not found")
    league = league.replace(state_anchor,state_insert,1)

archive_anchor = '''    {selected&&<div className={`${styles.panel} ${styles.table} ${styles.fullLeagueTable} ${styles.historyTableShell}`}>
      <div className={`${styles.tableRow} ${styles.header}`} style={{gridTemplateColumns:"55px minmax(180px,1fr) repeat(5,70px)"}}>
        <span>POS</span><span>PLAYER</span><span>P</span><span>W</span><span>S-N</span><span>0-0</span><span>PTS</span>
      </div>
      {selected.standings.map((row,index)=><div className={`${styles.tableRow} ${index===0?styles.leader:""} ${index<3?styles.tableRowTopThree:""}`} style={{gridTemplateColumns:"55px minmax(180px,1fr) repeat(5,70px)"}} key={row.id}>
        <span className={styles.positionCell}>{index===0?"🏆":index===1?"🥈":index===2?"🥉":index+1}</span><strong>{row.name}</strong><span>{row.played}</span><span>{row.wins}</span><span>{row.oneSided??Math.max(0,row.points-(3*row.wins)+row.zeroZeroCount)}</span><span>{row.zeroZeroCount}</span><b>{row.points}</b>
      </div>)}
    </div>}
'''
archive_insert = archive_anchor + '''    {selectedHistorical&&<div className={`historicGwArchive ${historicArchiveOpen?"historicGwArchiveOpen":""}`}>
      <button type="button" className="historicGwArchiveToggle" aria-expanded={historicArchiveOpen} onClick={()=>{setHistoricArchiveOpen(v=>!v);setOpenHistoricWeek(null)}}>
        <div><span>GAMEWEEK RESULTS</span><h3>Form & week-by-week archive</h3></div>
        <div className="historicGwArchiveToggleMeta"><small>{selectedHistorical.weeks} archived gameweeks</small><b aria-hidden="true">{historicArchiveOpen?"−":"+"}</b></div>
      </button>
      {historicArchiveOpen&&<div className="historicGwArchiveBody">
        <section className="historicFormViewer">
          <div className="historicFormViewerHead"><div><span>RECENT FORM</span><h4>Quick result lookup</h4></div><small>Choose a player and range</small></div>
          <div className="historicFormControls">
            <label><span>Player</span><select value={historicFormName} onChange={e=>setHistoricFormPlayer(e.target.value)}>{historicFormNames.map((name)=><option key={name} value={name}>{name}</option>)}</select></label>
            <div className="historicFormRanges" aria-label="Historical form range">{([6,12,18] as const).map((range)=><button type="button" key={range} className={historicFormRange===range?"historicFormRangeActive":""} onClick={()=>setHistoricFormRange(range)}>{range}</button>)}</div>
          </div>
          <div className="historicFormStrip">
            {historicRecentResults.map((row)=><div className="historicFormResult" key={`${historicFormName}-${row.week}`}>
              <small>GW {row.week}</small>
              <span className={row.code===1?"historicGwWin":row.code===0?"historicGwScoreNil":"historicGwLoss"}>{row.code===1?"BTTS":row.code===0?"S-N":"0-0"}</span>
              <b>{row.points==null?"—":row.points>0?`+${row.points}`:row.points}</b>
            </div>)}
          </div>
        </section>
        <div className="historicGwArchiveHeading"><div><span>ALL GAMEWEEKS</span><h3>Full weekly archive</h3></div><small>Tap a gameweek to expand results</small></div>
        <div className="historicGwArchiveList">
          {historicalWeeks.map((week)=>{
            const open=openHistoricWeek===week.number;
            return <article className={`historicGwItem ${open?"historicGwItemOpen":""}`} key={week.number}>
              <button type="button" className="historicGwSummary" aria-expanded={open} onClick={()=>setOpenHistoricWeek(open?null:week.number)}>
                <strong>GW {week.number}</strong>
                <span>{week.rows.length} players · {week.wins} BTTS · {week.scoreNil} score-nil · {week.losses} 0-0</span>
                <b aria-hidden="true">{open?"−":"+"}</b>
              </button>
              {open&&<div className="historicGwResults">
                <div className="historicGwResultHead"><span>PLAYER</span><span>OUTCOME</span><span>PTS</span></div>
                {week.rows.map((row)=><div className="historicGwResultRow" key={`${week.number}-${row.name}`}>
                  <strong>{row.name}</strong>
                  <span className={row.code===1?"historicGwWin":row.code===0?"historicGwScoreNil":"historicGwLoss"}>{row.code===1?"BTTS":row.code===0?"SCORE-NIL":"0-0"}</span>
                  <b>{row.points==null?"—":row.points>0?`+${row.points}`:row.points}</b>
                </div>)}
              </div>}
            </article>
          })}
        </div>
      </div>}
    </div>}
'''
if 'historicGwArchive' not in league:
    if archive_anchor not in league:
        raise SystemExit("History table anchor not found")
    league = league.replace(archive_anchor,archive_insert,1)

css_marker='/* historic-gameweek-archive-20260818 */'
if css_marker not in globals:
    globals += '''

/* historic-gameweek-archive-20260818 */
.historicGwArchive{margin-top:14px;border:1px solid rgba(216,183,111,.18);border-radius:14px;background:linear-gradient(145deg,rgba(35,15,22,.94),rgba(15,12,16,.96));overflow:hidden}
.historicGwArchiveToggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 18px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}
.historicGwArchiveToggle:hover{background:rgba(113,31,49,.10)}
.historicGwArchiveToggle span,.historicGwArchiveHeading span,.historicFormViewerHead span{display:block;color:#d8b76f;font-size:10px;font-weight:800;letter-spacing:.14em}
.historicGwArchiveToggle h3,.historicGwArchiveHeading h3{margin:3px 0 0;color:#f1e7dc;font-size:18px}
.historicGwArchiveToggleMeta{display:flex;align-items:center;gap:12px;color:#94877c}
.historicGwArchiveToggleMeta small{font-size:10px}
.historicGwArchiveToggleMeta b{color:#d8b76f;font-size:20px;font-weight:500}
.historicGwArchiveBody{border-top:1px solid rgba(216,183,111,.14)}
.historicFormViewer{margin:12px 12px 4px;padding:14px;border:1px solid rgba(216,183,111,.14);border-radius:12px;background:rgba(255,255,255,.025)}
.historicFormViewerHead{display:flex;align-items:end;justify-content:space-between;gap:10px;margin-bottom:10px}
.historicFormViewerHead h4{margin:3px 0 0;color:#f1e7dc;font-size:16px}
.historicFormViewerHead small{color:#8f8278;font-size:9px}
.historicFormControls{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:12px}
.historicFormControls label{display:flex;flex-direction:column;gap:5px;min-width:190px;color:#8f8278;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.historicFormControls select{width:100%;border:1px solid rgba(216,183,111,.22);border-radius:8px;background:#171116;color:#eee2d6;padding:8px 10px;font-size:12px}
.historicFormRanges{display:flex;gap:5px}
.historicFormRanges button{min-width:38px;border:1px solid rgba(216,183,111,.18);border-radius:8px;background:transparent;color:#ad9d90;padding:8px;font-size:11px;font-weight:800;cursor:pointer}
.historicFormRanges button.historicFormRangeActive{background:rgba(113,31,49,.38);border-color:rgba(216,183,111,.42);color:#efd08b}
.historicFormStrip{display:flex;justify-content:flex-end;gap:7px;overflow-x:auto;padding:3px 0 2px}
.historicFormResult{flex:0 0 62px;display:grid;gap:5px;justify-items:center}
.historicFormResult small{color:#8d8177;font-size:9px;font-weight:700}
.historicFormResult>span{width:48px;padding:5px 2px;border-radius:999px;text-align:center;font-size:8px;font-weight:900;letter-spacing:.03em}
.historicFormResult>b{color:#e9cf96;font-size:11px}
.historicGwArchiveHeading{display:flex;align-items:end;justify-content:space-between;gap:12px;padding:14px 18px 10px;border-top:1px solid rgba(216,183,111,.10);border-bottom:1px solid rgba(216,183,111,.10)}
.historicGwArchiveHeading small{color:#94877c;font-size:10px}
.historicGwArchiveList{padding:7px 10px 10px}
.historicGwItem{border-bottom:1px solid rgba(255,255,255,.055)}
.historicGwItem:last-child{border-bottom:0}
.historicGwSummary{width:100%;display:grid;grid-template-columns:70px 1fr 28px;align-items:center;gap:10px;border:0;background:transparent;color:#d9cec3;padding:11px 8px;text-align:left;cursor:pointer}
.historicGwSummary strong{color:#ebcc86;font-size:13px}
.historicGwSummary span{color:#a99b90;font-size:11px}
.historicGwSummary b{justify-self:end;color:#d8b76f;font-size:18px;font-weight:500}
.historicGwItemOpen .historicGwSummary{background:rgba(113,31,49,.16)}
.historicGwResults{padding:2px 8px 10px}
.historicGwResultHead,.historicGwResultRow{display:grid;grid-template-columns:minmax(130px,1fr) 110px 45px;align-items:center;gap:10px}
.historicGwResultHead{padding:6px 8px;color:#7f756d;font-size:9px;font-weight:800;letter-spacing:.1em}
.historicGwResultRow{padding:8px;border-radius:8px;color:#ddd3ca;font-size:11px}
.historicGwResultRow:nth-child(odd){background:rgba(255,255,255,.025)}
.historicGwResultRow>span{width:max-content;min-width:76px;padding:4px 7px;border-radius:999px;text-align:center;font-size:9px;font-weight:800;letter-spacing:.04em}
.historicGwResultRow>b{text-align:right;color:#ecd08e}
.historicGwWin{background:rgba(31,122,69,.24);color:#91d6aa;border:1px solid rgba(103,197,138,.32)}
.historicGwScoreNil{background:rgba(139,91,22,.24);color:#e0ba70;border:1px solid rgba(214,165,76,.30)}
.historicGwLoss{background:rgba(124,32,49,.28);color:#e28a9b;border:1px solid rgba(208,92,114,.30)}
@media(max-width:650px){
  .historicGwArchive{margin-top:10px;border-radius:11px}
  .historicGwArchiveToggle{padding:13px 12px}
  .historicGwArchiveToggle h3{font-size:15px}
  .historicGwArchiveToggleMeta small{display:none}
  .historicFormViewer{margin:9px 8px 3px;padding:11px 9px}
  .historicFormViewerHead{align-items:flex-start}
  .historicFormViewerHead h4{font-size:14px}
  .historicFormViewerHead small{font-size:8px;text-align:right}
  .historicFormControls{align-items:end;gap:8px}
  .historicFormControls label{min-width:0;flex:1}
  .historicFormControls select{padding:7px 8px;font-size:11px}
  .historicFormRanges{gap:3px}
  .historicFormRanges button{min-width:32px;padding:7px 5px;font-size:10px}
  .historicFormStrip{justify-content:flex-start;gap:4px;overflow:visible;flex-wrap:wrap}
  .historicFormResult{flex:0 0 calc((100% - 20px)/6);min-width:43px;gap:4px}
  .historicFormResult>span{width:38px;font-size:7px;padding:4px 1px}
  .historicGwArchiveHeading{align-items:flex-start;padding:12px 12px 9px}
  .historicGwArchiveHeading h3{font-size:15px}
  .historicGwArchiveHeading small{font-size:8px;text-align:right;max-width:100px}
  .historicGwArchiveList{padding:5px 7px 8px}
  .historicGwSummary{grid-template-columns:48px 1fr 20px;gap:7px;padding:10px 5px}
  .historicGwSummary strong{font-size:11px}
  .historicGwSummary span{font-size:9px;line-height:1.35}
  .historicGwSummary b{font-size:16px}
  .historicGwResultHead,.historicGwResultRow{grid-template-columns:minmax(100px,1fr) 84px 34px;gap:6px}
  .historicGwResultHead{font-size:8px;padding:5px 4px}
  .historicGwResultRow{padding:7px 4px;font-size:10px}
  .historicGwResultRow>span{min-width:68px;font-size:8px;padding:3px 5px}
}
'''

league_path.write_text(league)
globals_path.write_text(globals)
print("Applied collapsed historical archive with quick recent-form lookup")
