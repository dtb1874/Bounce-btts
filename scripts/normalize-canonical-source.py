from pathlib import Path
import re

path = Path("app/LeagueApp.tsx")
text = path.read_text()

anchor = 'import { outcomeLabel } from "@/lib/scoring";\n'
replacement = anchor + 'import { compareCompetitions } from "@/lib/competition-order";\n'
if 'import { compareCompetitions } from "@/lib/competition-order";' not in text:
    if anchor not in text:
        raise SystemExit("competition import anchor missing")
    text = text.replace(anchor, replacement, 1)

text, count = re.subn(
    r'\nconst competitionPriority = \[\n.*?\n\];\n',
    '\n',
    text,
    count=1,
    flags=re.S,
)
if count not in (0, 1):
    raise SystemExit("unexpected competitionPriority removal count")

old_sort = '''function fixtureSort(a: Fixture, b: Fixture) {
  const ar = competitionPriority.indexOf(competitionDisplayName(a)), br = competitionPriority.indexOf(competitionDisplayName(b));
  return (ar < 0 ? 999 : ar) - (br < 0 ? 999 : br) || competitionDisplayName(a).localeCompare(competitionDisplayName(b)) || a.kickoff_at.localeCompare(b.kickoff_at) || a.home_team.localeCompare(b.home_team);
}'''
new_sort = '''function fixtureSort(a: Fixture, b: Fixture) {
  return compareCompetitions(competitionDisplayName(a), competitionDisplayName(b))
    || a.kickoff_at.localeCompare(b.kickoff_at)
    || `${a.home_team} v ${a.away_team}`.localeCompare(`${b.home_team} v ${b.away_team}`, "en-GB", { sensitivity: "base" });
}'''
if old_sort in text:
    text = text.replace(old_sort, new_sort, 1)
elif new_sort not in text:
    raise SystemExit("fixtureSort anchor missing")

old_dedupe = '''const duplicateTeamSuffixes = new Set(["city","town","united","wanderers","rovers","albion","athletic","county"]);
function canonicalFixtureTeam(value:string){
  const parts=normaliseText(value).split(" ").filter(Boolean);
  while(parts.length>1&&duplicateTeamSuffixes.has(parts[parts.length-1]))parts.pop();
  return parts.join(" ");
}'''
new_dedupe = '''function canonicalFixtureTeam(value:string){
  return normaliseText(value);
}'''
if old_dedupe in text:
    text = text.replace(old_dedupe, new_dedupe, 1)
elif new_dedupe not in text:
    raise SystemExit("dedupe anchor missing")

old_selected = 'const selected=predictions.map(p=>({prediction:p,fixture:fixtures.find(f=>f.id===p.fixture_id),profile:profiles.find(pr=>pr.id===p.member_id)})).filter((x):x is {prediction:Prediction;fixture:Fixture;profile:Profile}=>Boolean(x.fixture&&x.profile));'
new_selected = 'const selected=predictions.map(p=>({prediction:p,fixture:fixtures.find(f=>f.id===p.fixture_id),profile:profiles.find(pr=>pr.id===p.member_id)})).filter((x):x is {prediction:Prediction;fixture:Fixture;profile:Profile}=>Boolean(x.fixture&&x.profile)).sort((a,b)=>fixtureSort(a.fixture,b.fixture));'
text = text.replace(old_selected, new_selected)
if new_selected not in text:
    raise SystemExit("fixture-bearing results sort anchor missing")

path.write_text(text)
print("Canonical source normalization applied")
