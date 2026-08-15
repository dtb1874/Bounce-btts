from pathlib import Path
import re

league=Path('app/LeagueApp.tsx')
s=league.read_text()
s=re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.4.9.10";', s, count=1)
s=re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "15 Aug 2026";', s, count=1)
needle='const releases=[\n    {version:"1.4.9.9"'
replacement='const releases=[\n    {version:"1.4.9.10",date:"15 Aug 2026",summary:"Kept mobile Recent Form names safely inside the card",changes:["Added a consistent left inset to every mobile Recent Form player row so names no longer touch or cross the card edge","Kept the larger player-name styling while ensuring long names remain contained inside the available left column","Preserved the compact right-aligned six-result block and the 6/12/18-week wrapping behaviour","Desktop Recent Form remains unchanged"]},\n    {version:"1.4.9.9"'
if needle not in s:
    raise SystemExit('Could not locate v1.4.9.9 release entry')
s=s.replace(needle,replacement,1)
league.write_text(s)

css=Path('app/globals.css')
g=css.read_text()
marker='/* v1.4.9.10 keep mobile form names inside card */'
if marker not in g:
    g += r'''

/* v1.4.9.10 keep mobile form names inside card */
@media(max-width:650px){
  #current-form [class*="formRow"]{
    grid-template-columns:minmax(0,1fr) repeat(6,22px)!important;
    column-gap:4px!important;
    width:100%!important;
    max-width:100%!important;
    padding:4px 10px 4px 12px!important;
    box-sizing:border-box!important;
    overflow:hidden!important;
  }
  #current-form [class*="formRow"]>[class*="formName"]{
    grid-column:1!important;
    width:auto!important;
    min-width:0!important;
    max-width:100%!important;
    padding:2px 12px 2px 0!important;
    box-sizing:border-box!important;
    font-size:12px!important;
    line-height:1.15!important;
    font-weight:800!important;
    display:flex!important;
    align-items:center!important;
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
  }
}
'''
    css.write_text(g)
