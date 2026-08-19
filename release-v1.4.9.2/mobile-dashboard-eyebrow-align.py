from pathlib import Path

path = Path("app/globals.css")
css = path.read_text()
marker = "/* mobile-dashboard-eyebrow-centre-20260819-v3 */"
if marker not in css:
    css += r'''

/* mobile-dashboard-eyebrow-centre-20260819-v3 */
@media(max-width:650px){
  .dashboardBrandHero .dashboardBrandLockup{
    top:18px!important;
  }
  .dashboardBrandHero .dashboardBrandEyebrow{
    width:max-content!important;
    max-width:none!important;
    margin-left:auto!important;
    margin-right:auto!important;
    align-self:center!important;
    text-align:center!important;
    position:static!important;
    transform:none!important;
    font-size:8.5px!important;
    font-weight:700!important;
    color:#d6b36a!important;
    letter-spacing:.10em!important;
  }
}
'''
path.write_text(css)
print("Lowered the complete mobile brand lockup while preserving internal alignment and Hearts-gold season line")
