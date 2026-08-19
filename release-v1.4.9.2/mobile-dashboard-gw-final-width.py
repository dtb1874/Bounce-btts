from pathlib import Path

path = Path("app/globals.css")
css = path.read_text()
marker = "/* mobile-dashboard-gw-final-width-20260819-v2 */"
if marker not in css:
    css += r'''

/* mobile-dashboard-gw-final-width-20260819-v2 */
@media(max-width:650px){
  /* Width-only correction: restore enough space for the visible GW number while preserving alignment. */
  .dashboardBrandHero.dashboardBrandHero .dashboardGwCompact{
    width:70px!important;
    min-width:70px!important;
    max-width:70px!important;
    padding-left:2px!important;
    padding-right:2px!important;
  }
  .dashboardBrandHero.dashboardBrandHero .dashboardGwCompact [class*="gwRow"]{
    grid-template-columns:15px minmax(0,1fr) 15px!important;
    gap:1px!important;
  }
  .dashboardBrandHero.dashboardBrandHero .dashboardGwCompact [class*="gwRow"] button{
    width:15px!important;
    min-width:15px!important;
    max-width:15px!important;
  }
  .dashboardBrandHero.dashboardBrandHero .dashboardGwCompact [class*="gwRow"] select{
    min-width:0!important;
    width:100%!important;
    padding-left:0!important;
    padding-right:0!important;
    font-size:9px!important;
    text-align:center!important;
    text-align-last:center!important;
  }
}
'''

path.write_text(css)
print("Restored enough mobile gameweek picker width to keep GW number visible without moving controls")
