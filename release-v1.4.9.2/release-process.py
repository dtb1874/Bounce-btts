from pathlib import Path
import re

league_path = Path("app/LeagueApp.tsx")
league = league_path.read_text()

league = re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.6.0";', league, count=1)
league = re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "18 Aug 2026";', league, count=1)

start = league.find('function ReleaseHistory(){')
end = league.find('\nfunction Instructions(', start)
if start < 0 or end < 0:
    raise SystemExit("ReleaseHistory function anchor not found")

replacement = r'''function ReleaseHistory(){
  const latest={version:"1.6.0",date:"18 Aug 2026",summary:"Repeated-team tendencies for Player and League Stats",changes:[
    "Added Most Picked Team to each Player Stats card, counting a team whenever it appears in that player's selected fixture",
    "A player team is only named after at least two selections involve the same team; before that the card shows No repeat team yet",
    "Joint most-picked teams are all shown alphabetically when a player has an equal highest repeat count",
    "Added the same Most Picked Team record to League Stats using every current-season league selection, with joint-team handling and the same two-selection minimum",
    "Kept the statistic presentation-only: no new database logging, tracking or stored analytics were introduced"
  ]};
  const previous=[
    {version:"1.5.0",date:"18 Aug 2026",summary:"Statistics, history, admin and release-process consolidation",changes:[
      "Expanded League Stats and Player Stats with strike rate, points per pick, streaks and current-season odds records while retaining the existing season facts",
      "Added joint-holder handling so tied league records show every qualifying player with pluralised labels where appropriate",
      "Replaced Value Hunter with Value Leader based on theoretical £1-per-priced-pick ROI with a five-pick minimum sample",
      "Added selectable historical gameweek-range views, player/combined historical form and corrected legacy 2/0/-1 season scoring",
      "Standardised displayed fixture odds and improved selected-fixture odds refresh behaviour while preserving known prices",
      "Restored visible/manual password management, Ultimate Admin self-name editing and clearer Users account cards",
      "Added authenticated Rousset Easter-egg press tracking with an Ultimate Admin-only R count",
      "Changed sign-out so users return to the public league table/statistics view",
      "Introduced the Semantic Versioning and mandatory release-note process"
    ]}
  ];
  const legacyGroups=[
    {label:"1.4.9 series",range:"15–16 Aug 2026",summary:"Live scoring, sharing and mobile form refinements",releases:[
      {version:"1.4.9.11",date:"16 Aug 2026",summary:"Pre-v2 repository and build cleanup"},
      {version:"1.4.9.10",date:"15 Aug 2026",summary:"Kept mobile Recent Form names safely inside the card"},
      {version:"1.4.9.9",date:"15 Aug 2026",summary:"Refined mobile Recent Form alignment"},
      {version:"1.4.9.8",date:"15 Aug 2026",summary:"Tighter mobile form rows with six-result wrapping"},
      {version:"1.4.9.7",date:"15 Aug 2026",summary:"Mobile Recent Form now fits without horizontal scrolling"},
      {version:"1.4.9.6",date:"15 Aug 2026",summary:"Missed-selection scoring guard corrected"},
      {version:"1.4.9.5",date:"15 Aug 2026",summary:"Dashboard gameweek default and stale penalty scoring corrected"},
      {version:"1.4.9.4",date:"15 Aug 2026",summary:"Dashboard action grid and unified fixture sharing"},
      {version:"1.4.9.3",date:"15 Aug 2026",summary:"Outcome-highlighted shares plus final-result and table sharing"},
      {version:"1.4.9.2",date:"15 Aug 2026",summary:"Shared weekly picks now reflect live scoring"},
      {version:"1.4.9.1",date:"15 Aug 2026",summary:"Live match minutes shown alongside scores"},
      {version:"1.4.9",date:"15 Aug 2026",summary:"Near-live score refresh and batched provider updates"}
    ]},
    {label:"1.4.8 series",range:"15 Aug 2026",summary:"Mobile dashboard hierarchy and reminders",releases:[
      {version:"1.4.8.4",date:"15 Aug 2026",summary:"Consistent Dashboard structure across all roles"},
      {version:"1.4.8.3",date:"15 Aug 2026",summary:"Denser mobile shortcuts, status strip and form view"},
      {version:"1.4.8.2",date:"15 Aug 2026",summary:"True compact admin mobile hierarchy"},
      {version:"1.4.8.1",date:"15 Aug 2026",summary:"Condensed admin mobile dashboard and persistent reminder action"},
      {version:"1.4.8",date:"15 Aug 2026",summary:"Admin pick reminders and mobile member cleanup"}
    ]},
    {label:"1.4.7 series",range:"13–15 Aug 2026",summary:"Sharing, public view and admin refinements",releases:[
      {version:"1.4.7.9",date:"15 Aug 2026",summary:"Future-gameweek member pick lock"},
      {version:"1.4.7.8",date:"14 Aug 2026",summary:"English League One / League Two share order corrected"},
      {version:"1.4.7.7",date:"14 Aug 2026",summary:"Compact gold sharing controls and dashboard alignment"},
      {version:"1.4.7.6",date:"14 Aug 2026",summary:"Weekly share competition grouping corrected"},
      {version:"1.4.7.5",date:"14 Aug 2026",summary:"Weekly picks share ordering"},
      {version:"1.4.7.4",date:"14 Aug 2026",summary:"WhatsApp credentials sharing and richer public view"},
      {version:"1.4.7.3",date:"14 Aug 2026",summary:"League-table-first layout, season insights and payment tracking"},
      {version:"1.4.7.2",date:"14 Aug 2026",summary:"Prominent sharing across data pages"},
      {version:"1.4.7.1",date:"13 Aug 2026",summary:"Ultimate Admin emulation exit hotfix"},
      {version:"1.4.7",date:"13 Aug 2026",summary:"Visual and admin layout refresh"}
    ]}
  ];
  const earlier=[
    {version:"1.4.6",date:"13 Aug 2026",summary:"Fixture duplication, admin draft and accumulator fixes"},
    {version:"1.4.5",date:"Aug 2026",summary:"Stable pre-refresh baseline"},
    {version:"1.4.4",date:"Aug 2026",summary:"BST/UTC alert correction"},
    {version:"1.3.x",date:"10 Aug 2026",summary:"Dashboard restoration and scoring repair"}
  ];
  return <div><h3>Release History</h3><p className={styles.small}>The current production release is always shown first. Older patch-heavy legacy releases are grouped by version family so the history stays complete without overwhelming the page.</p>
    <details className={styles.releaseItem} open><summary><span><strong>v{latest.version}</strong> · {latest.date}</span><small>{latest.summary}</small></summary><ul>{latest.changes.map(c=><li key={c}>{c}</li>)}</ul></details>
    {previous.map(r=><details className={styles.releaseItem} key={r.version}><summary><span><strong>v{r.version}</strong> · {r.date}</span><small>{r.summary}</small></summary><ul>{r.changes.map(c=><li key={c}>{c}</li>)}</ul></details>)}
    {legacyGroups.map(group=><details className={styles.releaseItem} key={group.label}><summary><span><strong>Legacy {group.label}</strong> · {group.range}</span><small>{group.summary} · {group.releases.length} releases</small></summary><div style={{display:"grid",gap:8,paddingTop:8}}>{group.releases.map(r=><div className={styles.row} style={{gridTemplateColumns:"110px 105px minmax(0,1fr)"}} key={r.version}><strong>v{r.version}</strong><span>{r.date}</span><small>{r.summary}</small></div>)}</div></details>)}
    <details className={styles.releaseItem}><summary><span><strong>Earlier releases</strong></span><small>1.4.6 and earlier</small></summary><div style={{display:"grid",gap:8,paddingTop:8}}>{earlier.map(r=><div className={styles.row} style={{gridTemplateColumns:"110px 105px minmax(0,1fr)"}} key={r.version}><strong>v{r.version}</strong><span>{r.date}</span><small>{r.summary}</small></div>)}</div></details>
  </div>
}'''

league = league[:start] + replacement + league[end:]
league_path.write_text(league)
print("Applied v1.6.0 release version and structured release history")
