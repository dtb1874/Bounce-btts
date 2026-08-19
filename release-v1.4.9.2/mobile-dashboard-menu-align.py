from pathlib import Path

path = Path("app/globals.css")
css = path.read_text()
marker = "/* mobile-dashboard-menu-align-20260819-v4 */"
if marker not in css:
    css += r'''

/* mobile-dashboard-menu-align-20260819-v4 */
@media(max-width:650px){
  main .mobileDashboardMenu{
    top:128px!important;
  }
}
'''
path.write_text(css)
print("Raised mobile menu 10px for closer bottom-edge alignment with gameweek picker")
