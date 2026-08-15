from pathlib import Path
import re

league=Path('app/LeagueApp.tsx')
s=league.read_text()
s=re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.4.9.9";', s, count=1)
s=re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "15 Aug 2026";', s, count=1)
needle='const releases=[\n    {version:"1.4.9.8"'
replacement='const releases=[\n    {version:"1.4.9.9",date:"15 Aug 2026",summary:"Refined mobile Recent Form alignment",changes:["Moved the compact six-result form block to the right side of each mobile player row so the layout uses the available card width more naturally","Increased mobile player-name size and weight and aligned every name consistently in a flexible left column","6-week results remain on one row while 12-week and 18-week views continue wrapping into rows of six without horizontal scrolling","Desktop Recent Form remains unchanged"]},\n    {version:"1.4.9.8"'
if needle not in s:
    raise SystemExit('Could not locate v1.4.9.8 release entry')
s=s.replace(needle,replacement,1)
league.write_text(s)

css=Path('app/globals.css')
g=css.read_text()
marker='/* v1.4.9.9 align mobile form results right */'
if marker not in g:
    g += r'''

/* v1.4.9.9 align mobile form results right */
@media(max-width:650px){
  #current-form [class*="formRow"]{
    grid-template-columns:minmax(0,1fr) repeat(6,22px)!important;
    column-gap:4px!important;
    width:100%!important;
    padding:4px 8px 4px 0!important;
    box-sizing:border-box!important;
  }
  #current-form [class*="formRow"]>[class*="formName"]{
    grid-column:1!important;
    width:auto!important;
    min-width:0!important;
    max-width:none!important;
    padding:2px 12px 2px 0!important;
    font-size:12px!important;
    line-height:1.15!important;
    font-weight:800!important;
    display:flex!important;
    align-items:center!important;
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
  }
  #current-form [class*="formRow"]>[class*="formCell"]:nth-child(8){grid-column:2!important}
  #current-form [class*="formRow"]>[class*="formCell"]:nth-child(14){grid-column:2!important}
}
'''
    css.write_text(g)
