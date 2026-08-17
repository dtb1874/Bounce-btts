from pathlib import Path

public_path = Path("app/PublicLeagueTable.tsx")
league_path = Path("app/LeagueApp.tsx")

public = public_path.read_text()
league = league_path.read_text()

helper = '<p className="playerTendencyHint">Tap a player to expand stats</p>'

public_anchor = '<div className={styles.sectionHeading}><div><span>SEASON SELECTION PROFILE</span><h3>Player Tendencies</h3></div></div>'
public_replacement = public_anchor + helper
if helper not in public:
    if public_anchor not in public:
        raise SystemExit("Public Player Tendencies heading anchor not found")
    public = public.replace(public_anchor, public_replacement, 1)

logged_anchor = '<div className={publicStyles.sectionHeading}><div><span>SEASON SELECTION PROFILE</span><h3>Player Tendencies</h3></div></div>'
logged_replacement = logged_anchor + helper
if logged_replacement not in league:
    if logged_anchor not in league:
        raise SystemExit("Logged-in Player Tendencies heading anchor not found")
    league = league.replace(logged_anchor, logged_replacement, 1)

public_path.write_text(public)
league_path.write_text(league)
print("Applied Player Tendencies expand hint")
