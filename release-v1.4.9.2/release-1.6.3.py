from pathlib import Path

path = Path("app/LeagueApp.tsx")
text = path.read_text()

text = text.replace('const RELEASE_VERSION = "1.6.2";', 'const RELEASE_VERSION = "1.6.3";', 1)
text = text.replace('const RELEASE_DATE = "19 Aug 2026";', 'const RELEASE_DATE = "20 Aug 2026";', 1)

old = '''  const latest={version:"1.6.2",date:"19 Aug 2026",summary:"League History mobile layout correction",changes:[
    "Corrected League History so the page remains within the iPhone viewport at normal zoom",
    "Kept the archived standings as a recognisable league table rather than converting rows into cards",
    "Compressed the History standings columns, spacing and typography on mobile so all seven columns fit without horizontal scrolling",
    "Contained the History archive layout so wide historical content cannot force the full page beyond the mobile viewport",
    "No historical data, scoring logic or desktop History behaviour was changed"
  ]};
  const previous=[
'''
new = '''  const latest={version:"1.6.3",date:"20 Aug 2026",summary:"League Stats consistency, expandable history and honours",changes:[
    "Aligned the public and signed-in League Stats presentation around the same headline records and tie handling",
    "Added joint Form Leader handling and the new Creature of Habit repeat-team stat with win/loss record",
    "Made Most Picked Team expandable to show which members selected the team and how many times",
    "Replaced the More League Stats numeric badge with a clear expand/collapse marker",
    "Made the League History Full weekly archive independently collapsible while preserving individual gameweek expansion",
    "Made the Roll of Honour trophy expandable for all signed-in users on Dashboard and League History, with archived champions added automatically and responsive winner names"
  ]};
  const previous=[
    {version:"1.6.2",date:"19 Aug 2026",summary:"League History mobile layout correction",changes:[
      "Corrected League History so the page remains within the iPhone viewport at normal zoom",
      "Kept the archived standings as a recognisable league table rather than converting rows into cards",
      "Compressed the History standings columns, spacing and typography on mobile so all seven columns fit without horizontal scrolling",
      "Contained the History archive layout so wide historical content cannot force the full page beyond the mobile viewport",
      "No historical data, scoring logic or desktop History behaviour was changed"
    ]},
'''
if old not in text:
    raise SystemExit("v1.6.2 release-history anchor not found")
text = text.replace(old, new, 1)
path.write_text(text)
print("Applied v1.6.3 release version and release notes")
