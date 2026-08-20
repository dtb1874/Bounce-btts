from pathlib import Path

path = Path("lib/public-table.ts")
text = path.read_text()

with_teams = '.select("id,competition,home_team,away_team,home_score,away_score,odds_fractional")'
without_teams = '.select("id,competition,home_score,away_score,odds_fractional")'
legacy_without_teams = '.select("id,competition,home_score,away_score")'

if with_teams not in text:
    if without_teams in text:
        text = text.replace(without_teams, with_teams, 1)
    elif legacy_without_teams in text:
        text = text.replace(legacy_without_teams, '.select("id,competition,home_team,away_team,home_score,away_score")', 1)
    else:
        raise SystemExit("Public fixture select anchor not found")

path.write_text(text)
print("Ensured public League Stats fixture query includes team names")
