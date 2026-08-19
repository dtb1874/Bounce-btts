from pathlib import Path

path = Path("app/globals.css")
css = path.read_text()
marker = "/* mobile-dashboard-eyebrow-centre-20260819 */"
if marker not in css:
    css += r'''

/* mobile-dashboard-eyebrow-centre-20260819 */
@media(max-width:650px){
  .dashboardBrandHero .dashboardBrandEyebrow{
    width:max-content!important;
    max-width:none!important;
    margin-left:auto!important;
    margin-right:auto!important;
    align-self:center!important;
    text-align:center!important;
    position:static!important;
    transform:none!important;
  }
}
'''
path.write_text(css)
print("Centred mobile dashboard eyebrow without changing vertical spacing")
