from pathlib import Path

public_path = Path("app/PublicLeagueTable.tsx")
league_path = Path("app/LeagueApp.tsx")
globals_path = Path("app/globals.css")

public = public_path.read_text()
league = league_path.read_text()
globals = globals_path.read_text()

old_public = '''{seasonFacts.map((fact) => fact.label.startsWith("MOST PICKED TEAM") ? <details className={`${styles.statItem} leagueStatDrilldown`} key={fact.label}><summary><span>{fact.label}</span><strong className={fact.value.includes(", ") ? "jointStatValue" : undefined}>{fact.value}</strong><small>{fact.detail}</small><b aria-hidden="true">⌄</b></summary>{fact.breakdown?.length ? <div className="leagueStatBreakdown">{fact.breakdown.map((line) => <div key={line}>{line}</div>)}</div> : null}</details> : <div className={styles.statItem} key={fact.label}><span>{fact.label}</span><strong className={fact.value.includes(", ") ? "jointStatValue" : undefined}>{fact.value}</strong><small>{fact.detail}</small></div>)}'''
new_public = '''{seasonFacts.map((fact) => <div className={styles.statItem} key={fact.label}><span>{fact.label}</span><strong className={fact.value.includes(", ") ? "jointStatValue" : undefined}>{fact.value}</strong><small>{fact.detail}</small>{fact.label.startsWith("MOST PICKED TEAM") && fact.breakdown?.length ? <small className="leagueStatInlineNames">{fact.breakdown.map((line) => line.split(" · ").slice(1).join(" · ")).join(" · ")}</small> : null}</div>)}'''
if old_public not in public:
    raise SystemExit("Public Most Picked Team drilldown anchor not found")
public = public.replace(old_public, new_public, 1)

old_logged = '''{facts.map(f=>f.label.startsWith("MOST PICKED TEAM")?<details className={`${publicStyles.statItem} leagueStatDrilldown`} key={f.label}><summary><span>{f.label}</span><strong className={f.value.includes(", ")?"jointStatValue":undefined}>{f.value}</strong><small>{f.detail}</small><b aria-hidden="true">⌄</b></summary>{leaguePickedTeamBreakdown.length?<div className="leagueStatBreakdown">{leaguePickedTeamBreakdown.map(line=><div key={line}>{line}</div>)}</div>:null}</details>:<div className={publicStyles.statItem} key={f.label}><span>{f.label}</span><strong className={f.value.includes(", ")?"jointStatValue":undefined}>{f.value}</strong><small>{f.detail}</small></div>)}'''
new_logged = '''{facts.map(f=><div className={publicStyles.statItem} key={f.label}><span>{f.label}</span><strong className={f.value.includes(", ")?"jointStatValue":undefined}>{f.value}</strong><small>{f.detail}</small>{f.label.startsWith("MOST PICKED TEAM")&&leaguePickedTeamBreakdown.length?<small className="leagueStatInlineNames">{leaguePickedTeamBreakdown.map(line=>line.split(" · ").slice(1).join(" · ")).join(" · ")}</small>:null}</div>)}'''
if old_logged not in league:
    raise SystemExit("Logged-in Most Picked Team drilldown anchor not found")
league = league.replace(old_logged, new_logged, 1)

if ".leagueStatInlineNames{" not in globals:
    globals += '''\n.leagueStatInlineNames{display:block!important;margin-top:4px!important;color:#d8b76f!important;font-size:10px!important;line-height:1.35!important}\n'''

public_path.write_text(public)
league_path.write_text(league)
globals_path.write_text(globals)
print("Simplified Most Picked Team to inline member details")
