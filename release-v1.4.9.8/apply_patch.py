from pathlib import Path
import re

league=Path('app/LeagueApp.tsx')
s=league.read_text()
s=re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.4.9.8";', s, count=1)
s=re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "15 Aug 2026";', s, count=1)
needle='const releases=[\n    {version:"1.4.9.7"'
replacement='const releases=[\n    {version:"1.4.9.8",date:"15 Aug 2026",summary:"Tighter mobile form rows with six-result wrapping",changes:["Recent Form result markers now sit tightly beside each player name instead of stretching across the full mobile card width","The 6-week view stays on one compact row","The 12-week view wraps into two compact rows of six results per player","The 18-week view wraps into three compact rows of six results per player","No horizontal scrolling is required and the desktop form layout is unchanged"]},\n    {version:"1.4.9.7"'
if needle not in s:
    raise SystemExit('Could not locate v1.4.9.7 release entry')
s=s.replace(needle,replacement,1)
league.write_text(s)

css=Path('app/globals.css')
g=css.read_text()
marker='/* v1.4.9.8 tighter mobile form blocks */'
if marker not in g:
    g += r'''

/* v1.4.9.8 tighter mobile form blocks */
@media(max-width:650px){
  #current-form [class*="formRow"]{
    display:grid!important;
    grid-template-columns:110px repeat(6,22px)!important;
    grid-auto-rows:24px!important;
    justify-content:start!important;
    align-items:center!important;
    column-gap:4px!important;
    row-gap:2px!important;
    width:100%!important;
    max-width:100%!important;
    min-width:0!important;
    padding:4px 0!important;
    overflow:hidden!important;
  }
  #current-form [class*="formRow"]>[class*="formName"]{
    grid-column:1!important;
    grid-row:1!important;
    align-self:center!important;
    width:110px!important;
    min-width:110px!important;
    max-width:110px!important;
    padding:2px 5px 2px 0!important;
    font-size:10px!important;
    line-height:1.05!important;
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
    border:0!important;
  }
  #current-form [class*="formRow"]>[class*="formCell"]:not([class*="formName"]){
    width:22px!important;
    min-width:22px!important;
    max-width:22px!important;
    height:22px!important;
    padding:0!important;
    display:grid!important;
    place-items:center!important;
    border:0!important;
    overflow:visible!important;
  }
  #current-form [class*="formRow"]>[class*="formCell"]:nth-child(8){grid-column:2!important}
  #current-form [class*="formRow"]>[class*="formCell"]:nth-child(14){grid-column:2!important}
  #current-form [class*="formRow"]>[class*="formCell"]:last-child{display:none!important}
  #current-form [class*="formPill"]{
    width:20px!important;
    height:20px!important;
    min-width:20px!important;
    max-width:20px!important;
    margin:0!important;
    padding:0!important;
    font-size:8px!important;
    line-height:1!important;
    border-radius:50%!important;
    display:grid!important;
    place-items:center!important;
  }
}
'''
    css.write_text(g)
