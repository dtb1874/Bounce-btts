from pathlib import Path

path = Path("app/globals.css")
css = path.read_text()
marker = "/* mobile-dashboard-menu-align-20260819 */"
if marker not in css:
    css += r'''

/* mobile-dashboard-menu-align-20260819 */
@media(max-width:650px){
  main .mobileDashboardMenu{
    top:238px!important;
  }
}
'''
path.write_text(css)
print("Aligned mobile menu button vertically with gameweek control")
