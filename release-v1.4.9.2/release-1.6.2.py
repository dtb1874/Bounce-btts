from pathlib import Path

path = Path("app/LeagueApp.tsx")
text = path.read_text()

text = text.replace('const RELEASE_VERSION = "1.6.1";', 'const RELEASE_VERSION = "1.6.2";', 1)
text = text.replace('const RELEASE_DATE = "19 Aug 2026";', 'const RELEASE_DATE = "19 Aug 2026";', 1)

old = '''  const latest={version:"1.6.1",date:"19 Aug 2026",summary:"Faster authenticated startup with on-demand secondary data",changes:[
    "Parallelised independent Supabase reads during authenticated startup to reduce avoidable sequential waiting",
    "Stopped reconstructing archived League History on every normal page load; dynamic archived history is now requested when League History is first opened",
    "Limited initial prediction and score-adjustment reads to the current season instead of every stored gameweek",
    "Moved the broad two-week Fixtures browser dataset behind an authenticated on-demand request when Fixtures is opened",
    "Preserved scoring, current-season league data, historical scoring behaviour and existing member/admin functionality unchanged"
  ]};
  const previous=[
'''
new = '''  const latest={version:"1.6.2",date:"19 Aug 2026",summary:"League History mobile layout correction",changes:[
    "Corrected League History so the page remains within the iPhone viewport at normal zoom",
    "Kept the archived standings as a recognisable league table rather than converting rows into cards",
    "Compressed the History standings columns, spacing and typography on mobile so all seven columns fit without horizontal scrolling",
    "Contained the History archive layout so wide historical content cannot force the full page beyond the mobile viewport",
    "No historical data, scoring logic or desktop History behaviour was changed"
  ]};
  const previous=[
    {version:"1.6.1",date:"19 Aug 2026",summary:"Faster authenticated startup with on-demand secondary data",changes:[
      "Parallelised independent Supabase reads during authenticated startup to reduce avoidable sequential waiting",
      "Stopped reconstructing archived League History on every normal page load; dynamic archived history is now requested when League History is first opened",
      "Limited initial prediction and score-adjustment reads to the current season instead of every stored gameweek",
      "Moved the broad two-week Fixtures browser dataset behind an authenticated on-demand request when Fixtures is opened",
      "Preserved scoring, current-season league data, historical scoring behaviour and existing member/admin functionality unchanged"
    ]},
'''
if old not in text:
    raise SystemExit("v1.6.1 release-history anchor not found")
text = text.replace(old, new, 1)
path.write_text(text)
print("Applied v1.6.2 release version and League History mobile release notes")
