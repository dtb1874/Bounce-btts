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
    overflow:visible;
    padding:10px;
    border-radius:13px;
  }
  .historyTableShell .tableRow{
    min-width:0!important;
    width:100%;
    box-sizing:border-box;
  }
  .historyTableShell .tableRow.header{
    display:none;
  }
  .historyTableShell .tableRow:not(.header){
    display:grid;
    grid-template-columns:38px minmax(0,1fr) 52px 52px;
    grid-template-rows:auto auto;
    gap:8px 6px;
    align-items:center;
    padding:11px 8px;
    margin:0 0 8px;
    border:1px solid rgba(255,255,255,.07);
    border-radius:10px;
    background:rgba(255,255,255,.018);
  }
  .historyTableShell .tableRow:not(.header)>:nth-child(1){grid-column:1;grid-row:1;font-size:13px}
  .historyTableShell .tableRow:not(.header)>:nth-child(2){grid-column:2 / 4;grid-row:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
  .historyTableShell .tableRow:not(.header)>:nth-child(7){grid-column:4;grid-row:1;text-align:right;font-size:15px;color:#f0cfaa}
  .historyTableShell .tableRow:not(.header)>:nth-child(3),
  .historyTableShell .tableRow:not(.header)>:nth-child(4),
  .historyTableShell .tableRow:not(.header)>:nth-child(5),
  .historyTableShell .tableRow:not(.header)>:nth-child(6){
    grid-row:2;
    display:grid;
    gap:2px;
    justify-items:center;
    padding:6px 3px 4px;
    border-radius:7px;
    background:rgba(255,255,255,.025);
    font-size:11px;
    font-weight:800;
  }
  .historyTableShell .tableRow:not(.header)>:nth-child(3){grid-column:1}
  .historyTableShell .tableRow:not(.header)>:nth-child(4){grid-column:2}
  .historyTableShell .tableRow:not(.header)>:nth-child(5){grid-column:3}
  .historyTableShell .tableRow:not(.header)>:nth-child(6){grid-column:4}
  .historyTableShell .tableRow:not(.header)>:nth-child(3)::before{content:"P"}
  .historyTableShell .tableRow:not(.header)>:nth-child(4)::before{content:"W"}
  .historyTableShell .tableRow:not(.header)>:nth-child(5)::before{content:"S-N"}
  .historyTableShell .tableRow:not(.header)>:nth-child(6)::before{content:"0-0"}
  .historyTableShell .tableRow:not(.header)>:nth-child(3)::before,
  .historyTableShell .tableRow:not(.header)>:nth-child(4)::before,
  .historyTableShell .tableRow:not(.header)>:nth-child(5)::before,
  .historyTableShell .tableRow:not(.header)>:nth-child(6)::before{
    color:#8f8782;
    font-size:7px;
    letter-spacing:.08em;
    font-weight:900;
  }
  .historyTableShell .tableRow:not(.header)>:nth-child(7)::before{
    content:"PTS ";
    color:#8f8782;
    font-size:7px;
    letter-spacing:.08em;
    font-weight:900;
    vertical-align:middle;
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
print("Applied League History no-scroll mobile card layout")
