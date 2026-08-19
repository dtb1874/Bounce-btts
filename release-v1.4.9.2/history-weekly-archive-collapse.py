from pathlib import Path

league_path = Path("app/LeagueApp.tsx")
globals_path = Path("app/globals.css")
league = league_path.read_text()
globals_css = globals_path.read_text()

state_anchor = '  const [openHistoricWeek,setOpenHistoricWeek]=useState<number|null>(null);\n'
state_insert = state_anchor + '  const [historicWeeklyListOpen,setHistoricWeeklyListOpen]=useState(false);\n'
if 'historicWeeklyListOpen' not in league:
    if state_anchor not in league:
        raise SystemExit("Weekly archive state anchor not found")
    league = league.replace(state_anchor, state_insert, 1)

reset_anchor = '    setOpenHistoricWeek(null);\n'
reset_insert = reset_anchor + '    setHistoricWeeklyListOpen(false);\n'
if 'setHistoricWeeklyListOpen(false);' not in league:
    if reset_anchor not in league:
        raise SystemExit("Weekly archive reset anchor not found")
    league = league.replace(reset_anchor, reset_insert, 1)

old = '''        <div className="historicGwArchiveHeading"><div><span>ALL GAMEWEEKS</span><h3>Full weekly archive</h3></div><small>Tap a gameweek to expand results</small></div>
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
        </div>'''

new = '''        <button type="button" className="historicGwArchiveHeading historicGwArchiveHeadingToggle" aria-expanded={historicWeeklyListOpen} onClick={()=>{setHistoricWeeklyListOpen(v=>!v);setOpenHistoricWeek(null)}}>
          <div><span>ALL GAMEWEEKS</span><h3>Full weekly archive</h3></div>
          <div className="historicGwArchiveHeadingMeta"><small>{historicWeeklyListOpen?"Tap a gameweek to expand results":"Tap to view all gameweeks"}</small><b aria-hidden="true">{historicWeeklyListOpen?"−":"+"}</b></div>
        </button>
        {historicWeeklyListOpen&&<div className="historicGwArchiveList">
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
        </div>}'''

if 'historicGwArchiveHeadingToggle' not in league:
    if old not in league:
        raise SystemExit("Full weekly archive block anchor not found")
    league = league.replace(old, new, 1)

css_marker = '/* history-weekly-archive-collapse-20260819 */'
if css_marker not in globals_css:
    globals_css += '''

/* history-weekly-archive-collapse-20260819 */
.historicGwArchiveHeadingToggle{
  width:100%;
  background:transparent;
  color:inherit;
  text-align:left;
  cursor:pointer;
  font:inherit;
}
.historicGwArchiveHeadingToggle:hover{background:rgba(113,31,49,.10)}
.historicGwArchiveHeadingMeta{display:flex;align-items:center;gap:12px;justify-content:flex-end;text-align:right}
.historicGwArchiveHeadingMeta b{color:#d8b76f;font-size:20px;font-weight:500;line-height:1}
@media(max-width:650px){
  .historicGwArchiveHeadingToggle{align-items:center}
  .historicGwArchiveHeadingMeta{max-width:145px}
  .historicGwArchiveHeadingMeta small{line-height:1.35}
}
'''

league_path.write_text(league)
globals_path.write_text(globals_css)
print("Made Full weekly archive independently collapsible")
