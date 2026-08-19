from pathlib import Path

path = Path("app/globals.css")
css = path.read_text()
marker = "/* mobile-dashboard-gw-final-width-20260819-v4 */"
if marker not in css:
    css += r'''

/* mobile-dashboard-gw-final-width-20260819-v4 */
@media(max-width:650px){
  /* Keep the picker compact while giving the navigation arrows clearer separation and tap targets. */
  .dashboardBrandHero.dashboardBrandHero .dashboardGwCompact{
    width:88px!important;
    min-width:88px!important;
    max-width:88px!important;
    padding-left:2px!important;
    padding-right:2px!important;
  }
  .dashboardBrandHero.dashboardBrandHero .dashboardGwCompact [class*="gwRow"]{
    grid-template-columns:16px minmax(0,1fr) 16px!important;
    gap:4px!important;
  }
  .dashboardBrandHero.dashboardBrandHero .dashboardGwCompact [class*="gwRow"] button{
    width:16px!important;
    min-width:16px!important;
    max-width:16px!important;
    padding:0!important;
    font-size:12px!important;
  }
  .dashboardBrandHero.dashboardBrandHero .dashboardGwCompact [class*="gwRow"] select{
    min-width:44px!important;
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
print("Improved mobile gameweek arrow spacing and tap targets without moving the control")
