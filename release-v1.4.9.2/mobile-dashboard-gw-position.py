from pathlib import Path

path = Path("app/globals.css")
css = path.read_text()
marker = "/* mobile-dashboard-gw-position-20260819-v2 */"
if marker not in css:
    css += r'''

/* mobile-dashboard-gw-position-20260819-v2 */
@media(max-width:650px){
  .dashboardBrandHero .dashboardGwCompact{
    width:72px!important;
    min-width:72px!important;
    max-width:72px!important;
    box-sizing:border-box!important;
    padding:2px 3px!important;
    transform:translateY(110px)!important;
    text-align:center!important;
  }
  .dashboardBrandHero .dashboardGwCompact label{
    display:block!important;
    width:100%!important;
    text-align:center!important;
    margin:0!important;
  }
  .dashboardBrandHero .dashboardGwCompact [class*="gwRow"]{
    display:grid!important;
    grid-template-columns:16px minmax(0,1fr) 16px!important;
    width:100%!important;
    gap:2px!important;
    align-items:center!important;
    justify-items:stretch!important;
  }
  .dashboardBrandHero .dashboardGwCompact [class*="gwRow"] button{
    width:16px!important;
    min-width:16px!important;
    max-width:16px!important;
    padding:0!important;
    text-align:center!important;
  }
  .dashboardBrandHero .dashboardGwCompact [class*="gwRow"] select{
    width:100%!important;
    min-width:0!important;
    max-width:100%!important;
    box-sizing:border-box!important;
    padding:2px 0!important;
    font-size:9px!important;
    text-align:center!important;
    text-align-last:center!important;
  }
}
'''
path.write_text(css)
print("Further narrowed, centred and lowered mobile gameweek picker")
