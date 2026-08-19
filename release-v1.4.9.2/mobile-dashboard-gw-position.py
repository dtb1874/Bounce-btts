from pathlib import Path

path = Path("app/globals.css")
css = path.read_text()
marker = "/* mobile-dashboard-gw-position-20260819 */"
if marker not in css:
    css += r'''

/* mobile-dashboard-gw-position-20260819 */
@media(max-width:650px){
  .dashboardBrandHero .dashboardGwCompact{
    width:82px!important;
    min-width:82px!important;
    padding:3px!important;
    transform:translateY(88px)!important;
  }
  .dashboardBrandHero .dashboardGwCompact [class*="gwRow"]{
    gap:2px!important;
  }
  .dashboardBrandHero .dashboardGwCompact [class*="gwRow"] button{
    width:20px!important;
    min-width:20px!important;
    padding:2px!important;
  }
  .dashboardBrandHero .dashboardGwCompact [class*="gwRow"] select{
    min-width:0!important;
    padding:2px 1px!important;
    font-size:9px!important;
  }
}
'''
path.write_text(css)
print("Aligned mobile gameweek picker with menu and narrowed control")
