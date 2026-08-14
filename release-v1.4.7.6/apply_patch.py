from pathlib import Path
import re

path = Path('app/LeagueApp.tsx')
text = path.read_text()

text = re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.4.7.6";', text, count=1)
text = re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "14 Aug 2026";', text, count=1)

replacement = r'''function ReleaseHistory(){
  const releases=[
    {version:"1.4.7.6",date:"14 Aug 2026",summary:"Weekly share competition grouping corrected",changes:["Weekly picks share now keeps English and Scottish league blocks separate when kickoff times match","Competition matching now uses explicit English/Scottish league names so Scottish League Two can no longer be mistaken for English League Two","The same corrected order is used on mobile and browser share images"]},
    {version:"1.4.7.5",date:"14 Aug 2026",summary:"Weekly picks share ordering",changes:["Weekly picks share images are sorted into betting-page order rather than player/slot order","Ordering uses kickoff time, competition priority and fixture order","Combined odds use the same sorted set of selections"]},
    {version:"1.4.7.4",date:"14 Aug 2026",summary:"WhatsApp credentials sharing and richer public view",changes:["Ultimate Admin Users page gained one-tap WhatsApp login sharing with player name, username, saved password and Bounce web link","Non-member view gained branded season statistics, current-form table and player tendencies","Public view remains read-only and does not expose upcoming private selections"]},
    {version:"1.4.7.3",date:"14 Aug 2026",summary:"League-table-first layout, season insights and payment tracking",changes:["Full League now prioritises the league table rather than separate first/second/third cards","Added richer season insight statistics including goals and selection tendencies","Share actions were made more prominent in gold","Admin Users gained current-season Paid/Unpaid entry-fee tracking with received and outstanding totals"]},
    {version:"1.4.7.2",date:"14 Aug 2026",summary:"Prominent sharing across data pages",changes:["League Table sharing became a prominent maroon/gold action","Current Form, Results and League History archive data gained formatted-image sharing","Weekly Picks sharing was retained"]},
    {version:"1.4.7.1",date:"13 Aug 2026",summary:"Ultimate Admin emulation exit hotfix",changes:["Ultimate Admin emulation now has a persistent Exit emulation control","Demo Guest profiles resolve correctly during emulation","Emulation remains read-only"]},
    {version:"1.4.7",date:"13 Aug 2026",summary:"Visual and admin layout refresh",changes:["Admin Users and Results were made more compact on browser","Maroon/gold Bounce hierarchy was strengthened","Heart of Midlothian pavement mosaic and subtle Edinburgh artwork restored","No cathedral imagery used","Mobile dashboard priority layout improved while retaining all member features"]},
    {version:"1.4.6",date:"13 Aug 2026",summary:"Fixture duplication, admin draft and accumulator fixes",changes:["Duplicate fixtures collapse using provider ID first with kickoff/team fallback matching","Admin Selection drafts survive the 45-second live refresh","Combined accumulator odds show bookmaker-style whole fractional x/1 odds rounded down","Mobile dashboard priority styling and Edinburgh/Heart visual treatment added"]},
    {version:"1.4.5",date:"Aug 2026",summary:"Stable pre-refresh baseline",changes:["Collapsible fixture/results grouping retained across browser, iPhone and Android","Searchable Admin Selections picker, Release History, Demo Mode and user emulation retained","Live auto-refresh retained"]},
    {version:"1.4.4",date:"Aug 2026",summary:"BST/UTC alert correction",changes:["BST/UTC-equivalent kickoffs no longer generate false fixture-change alerts","Alert readability improved for mobile"]},
    {version:"1.3.x",date:"10 Aug 2026",summary:"Dashboard restoration and scoring repair",changes:["Restored richer Bounce/Hearts dashboard presentation","Repaired Gameweek 1 scoring flow and result update validation","Restored six-week form table and richer league presentation"]}
  ];
  return <div><h3>Release History</h3><p className={styles.small}>Every production update is listed here. The newest release opens automatically; older releases stay collapsed until selected.</p>{releases.map((r,i)=><details className={styles.releaseItem} key={r.version} open={i===0}><summary><span><strong>v{r.version}</strong> · {r.date}</span><small>{r.summary}</small></summary><ul>{r.changes.map(c=><li key={c}>{c}</li>)}</ul></details>)}</div>
}'''

pattern = r'function ReleaseHistory\(\)\{.*?\}\n\nfunction Instructions'
new_text, count = re.subn(pattern, replacement + '\n\nfunction Instructions', text, count=1, flags=re.S)
if count != 1:
    raise SystemExit('Could not locate ReleaseHistory block')
path.write_text(new_text)
