from pathlib import Path

release_css_path = Path("app/release.module.css")
globals_path = Path("app/globals.css")
release_css = release_css_path.read_text()
globals_css = globals_path.read_text()

release_marker = "/* history-mobile-layout-20260819 */"
if release_marker not in release_css:
    release_css += '''

/* history-mobile-layout-20260819 */
.historyPage{
  min-width:0;
  width:100%;
  max-width:100%;
}
.historyPage>*{
  min-width:0;
  max-width:100%;
  box-sizing:border-box;
}
.historyHero,
.honourPanel,
.historyTableShell{
  width:100%;
  max-width:100%;
  box-sizing:border-box;
}
@media(max-width:650px){
  .historyPage{overflow:visible}
  .historyHero{min-width:0}
  .historyTableShell{
    overflow:hidden;
    padding:8px;
    border-radius:13px;
  }
  .historyTableShell .tableRow{
    min-width:0!important;
    width:100%;
    box-sizing:border-box;
    display:grid!important;
    grid-template-columns:28px minmax(76px,1fr) 26px 26px 30px 30px 34px!important;
    gap:3px;
    align-items:center;
    padding:8px 4px;
  }
  .historyTableShell .tableRow.header{
    padding-top:7px;
    padding-bottom:7px;
    font-size:7px;
    letter-spacing:.02em;
  }
  .historyTableShell .tableRow:not(.header){
    font-size:9px;
  }
  .historyTableShell .tableRow:not(.header)>:nth-child(1){font-size:10px;text-align:center}
  .historyTableShell .tableRow:not(.header)>:nth-child(2){
    min-width:0;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    font-size:9px;
  }
  .historyTableShell .tableRow:not(.header)>:nth-child(n+3){
    text-align:center;
    font-size:9px;
  }
  .historyTableShell .tableRow:not(.header)>:nth-child(7){
    font-size:10px;
    color:#f0cfaa;
  }
}
'''

global_marker = "/* history-mobile-archive-containment-20260819 */"
if global_marker not in globals_css:
    globals_css += '''

/* history-mobile-archive-containment-20260819 */
.historicGwArchive,
.historicGwArchiveBody,
.historicFormViewer,
.historicFormRows,
.historicFormPlayerRow,
.historicFormStrip,
.historicGwArchiveList,
.historicGwItem{
  min-width:0;
  max-width:100%;
  box-sizing:border-box;
}
'''

release_css_path.write_text(release_css)
globals_path.write_text(globals_css)
print("Applied compact no-scroll League History mobile table")
