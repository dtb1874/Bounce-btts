from pathlib import Path

path = Path("app/globals.css")
css = path.read_text()
marker = "/* mobile-dashboard-menu-align-20260819-v3 */"
if marker not in css:
    css += r'''

/* mobile-dashboard-menu-align-20260819-v3 */
@media(max-width:650px){
  main .mobileDashboardMenu{
    top:138px!important;
  }
}
'''
path.write_text(css)
print("Aligned mobile menu bottom edge with gameweek picker")
