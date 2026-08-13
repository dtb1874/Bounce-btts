from pathlib import Path
import re

module = Path('app/release.module.css')
css = module.read_text()
css = re.sub(r',:global\([^)]+\)', '', css)
module.write_text(css)

globals_path = Path('app/globals.css')
g = globals_path.read_text()
marker = '/* v1.4.7.3 global gold share controls */'
if marker not in g:
    g += '''\n\n/* v1.4.7.3 global gold share controls */\n.dataShareButton,.dashboardPicksShareButton{min-height:46px;display:grid;grid-template-columns:26px auto;grid-template-rows:auto auto;column-gap:8px;align-items:center;border:1px solid #f1d59a;border-radius:10px;padding:8px 12px;background:linear-gradient(180deg,#f1d28e,#d5a953 58%,#c18e3e);color:#3d1320;font-weight:900;cursor:pointer;box-shadow:0 8px 22px rgba(190,139,49,.22);text-align:left}.dataShareButton>span,.dashboardPicksShareButton>span{grid-row:1/3;color:#5a1c2e}.dataShareButton>strong,.dashboardPicksShareButton>strong{font-size:12px;color:#3d1320}.dataShareButton>small,.dashboardPicksShareButton>small{font-size:9px;color:#6b4026}.dataShareButton:disabled,.dashboardPicksShareButton:disabled{opacity:.52;cursor:not-allowed}.tableShareControl{display:inline-grid;gap:4px;justify-items:end}.tableShareMessage{font-size:10px;color:#b9aca3}@media(max-width:720px){.dataShareButton,.dashboardPicksShareButton{width:100%}.tableShareControl{width:100%}}\n'''
    globals_path.write_text(g)
