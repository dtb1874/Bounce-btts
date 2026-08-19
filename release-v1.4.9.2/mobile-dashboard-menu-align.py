from pathlib import Path

path = Path("app/globals.css")
css = path.read_text()
marker = "/* mobile-dashboard-menu-align-20260819-v2 */"
if marker not in css:
    css += r'''

/* mobile-dashboard-menu-align-20260819-v2 */
@media(max-width:650px){
  main .mobileDashboardMenu{
    top:48px!important;
  }
}
'''
path.write_text(css)
print("Raised mobile menu button to align with lowered gameweek control")
