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
.historyTableShell{
  overflow-x:auto;
  overflow-y:hidden;
  -webkit-overflow-scrolling:touch;
  overscroll-behavior-x:contain;
}
@media(max-width:650px){
  .historyPage{overflow:visible}
  .historyHero{min-width:0}
  .historyTableShell{border-radius:13px}
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
.historicFormStrip{
  overscroll-behavior-x:contain;
  -webkit-overflow-scrolling:touch;
}
'''

release_css_path.write_text(release_css)
globals_path.write_text(globals_css)
print("Applied League History mobile width containment and table scrolling")
