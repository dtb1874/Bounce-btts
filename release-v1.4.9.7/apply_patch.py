from pathlib import Path
import re

league=Path('app/LeagueApp.tsx')
s=league.read_text()
s=re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.4.9.7";', s, count=1)
s=re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "15 Aug 2026";', s, count=1)
needle='const releases=[\n    {version:"1.4.9.6"'
replacement='const releases=[\n    {version:"1.4.9.7",date:"15 Aug 2026",summary:"Mobile Recent Form now fits without horizontal scrolling",changes:["Fixed the Recent league form table on iPhone/mobile so the selected form range fits inside the Dashboard card without horizontal scrolling","Player names use a compact fixed column and gameweek results use tightly packed coloured circular indicators","Desktop retains the richer labelled form table while mobile removes the oversized spreadsheet-style columns and total column"]},\n    {version:"1.4.9.6"'
if needle not in s:
    raise SystemExit('Could not locate v1.4.9.6 release entry')
s=s.replace(needle,replacement,1)
league.write_text(s)

css=Path('app/globals.css')
g=css.read_text()
marker='/* v1.4.9.7 force compact mobile recent form */'
if marker not in g:
    g += r'''

/* v1.4.9.7 force compact mobile recent form */
@media(max-width:650px){
  #current-form [class*="formTableWrap"]{
    width:100%!important;
    max-width:100%!important;
    min-width:0!important;
    overflow:hidden!important;
    overflow-x:hidden!important;
    -webkit-overflow-scrolling:auto!important;
  }
  #current-form [class*="formTable"]{
    display:block!important;
    width:100%!important;
    max-width:100%!important;
    min-width:0!important;
    grid-template-columns:none!important;
  }
  #current-form [class*="formTable"]>[class*="formHeader"]{
    display:none!important;
  }
  #current-form [class*="formRow"]{
    display:flex!important;
    grid-template-columns:none!important;
    width:100%!important;
    max-width:100%!important;
    min-width:0!important;
    align-items:center!important;
    gap:0!important;
    padding:3px 0!important;
    min-height:32px!important;
    overflow:hidden!important;
  }
  #current-form [class*="formRow"]>[class*="formName"]{
    flex:0 0 92px!important;
    width:92px!important;
    min-width:92px!important;
    max-width:92px!important;
    padding:3px 4px!important;
    font-size:10px!important;
    line-height:1.05!important;
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
    border:0!important;
  }
  #current-form [class*="formRow"]>[class*="formCell"]:not([class*="formName"]){
    flex:1 1 0!important;
    width:auto!important;
    min-width:0!important;
    max-width:none!important;
    padding:1px!important;
    border:0!important;
    display:flex!important;
    align-items:center!important;
    justify-content:center!important;
    overflow:hidden!important;
  }
  #current-form [class*="formRow"]>[class*="formCell"]:last-child{
    display:none!important;
  }
  #current-form [class*="formPill"]{
    width:18px!important;
    height:18px!important;
    min-width:18px!important;
    max-width:18px!important;
    padding:0!important;
    margin:0!important;
    border-radius:50%!important;
    display:grid!important;
    place-items:center!important;
    font-size:8px!important;
    line-height:1!important;
    white-space:nowrap!important;
    box-shadow:none!important;
  }
  #current-form [class*="formControls"] [class*="formLegend"]{
    display:none!important;
  }
}
'''
    css.write_text(g)
