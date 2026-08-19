from pathlib import Path

path = Path("app/globals.css")
css = path.read_text()
marker = "/* mobile-dashboard-eyebrow-centre-20260819-v2 */"
if marker not in css:
    css += r'''

/* mobile-dashboard-eyebrow-centre-20260819-v2 */
@media(max-width:650px){
  .dashboardBrandHero .dashboardBrandEyebrow{
    width:max-content!important;
    max-width:none!important;
    margin-left:auto!important;
    margin-right:auto!important;
    align-self:center!important;
    text-align:center!important;
    position:relative!important;
    top:4px!important;
    transform:none!important;
    font-size:8.6px!important;
    line-height:1!important;
    letter-spacing:.095em!important;
    color:#d9b86a!important;
    font-weight:700!important;
    text-shadow:0 1px 8px rgba(217,184,106,.16)!important;
  }
}
'''
path.write_text(css)
print("Lowered and strengthened mobile season line with a warmer Hearts-style gold")
