from pathlib import Path

path = Path("app/globals.css")
css = path.read_text()
marker = "/* mobile-dashboard-gw-final-width-20260819 */"
if marker not in css:
    css += r'''

/* mobile-dashboard-gw-final-width-20260819 */
@media(max-width:650px){
  /* Final width-only pass: preserve the approved vertical alignment. */
  .dashboardBrandHero.dashboardBrandHero .dashboardGwCompact{
    width:62px!important;
    min-width:62px!important;
    max-width:62px!important;
    padding-left:2px!important;
    padding-right:2px!important;
  }
  .dashboardBrandHero.dashboardBrandHero .dashboardGwCompact [class*="gwRow"]{
    grid-template-columns:14px minmax(0,1fr) 14px!important;
    gap:1px!important;
  }
  .dashboardBrandHero.dashboardBrandHero .dashboardGwCompact [class*="gwRow"] button{
    width:14px!important;
    min-width:14px!important;
    max-width:14px!important;
  }
  .dashboardBrandHero.dashboardBrandHero .dashboardGwCompact [class*="gwRow"] select{
    min-width:0!important;
    width:100%!important;
    padding-left:0!important;
    padding-right:0!important;
    font-size:8.5px!important;
  }
}
'''

path.write_text(css)
print("Applied final narrower mobile gameweek picker width without moving controls")
