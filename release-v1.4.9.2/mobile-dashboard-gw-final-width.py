from pathlib import Path

path = Path("app/globals.css")
css = path.read_text()
marker = "/* mobile-dashboard-gw-final-width-20260819-v3 */"
if marker not in css:
    css += r'''

/* mobile-dashboard-gw-final-width-20260819-v3 */
@media(max-width:650px){
  /* Width-only correction: keep compact sizing but guarantee room for two-digit GW labels. */
  .dashboardBrandHero.dashboardBrandHero .dashboardGwCompact{
    width:82px!important;
    min-width:82px!important;
    max-width:82px!important;
    padding-left:2px!important;
    padding-right:2px!important;
  }
  .dashboardBrandHero.dashboardBrandHero .dashboardGwCompact [class*="gwRow"]{
    grid-template-columns:14px minmax(0,1fr) 14px!important;
    gap:2px!important;
  }
  .dashboardBrandHero.dashboardBrandHero .dashboardGwCompact [class*="gwRow"] button{
    width:14px!important;
    min-width:14px!important;
    max-width:14px!important;
    padding:0!important;
  }
  .dashboardBrandHero.dashboardBrandHero .dashboardGwCompact [class*="gwRow"] select{
    min-width:46px!important;
    width:100%!important;
    max-width:none!important;
    box-sizing:border-box!important;
    padding-left:1px!important;
    padding-right:1px!important;
    font-size:9px!important;
    text-align:center!important;
    text-align-last:center!important;
  }
}
'''

path.write_text(css)
print("Expanded mobile gameweek picker just enough for clear two-digit GW labels without moving controls")
