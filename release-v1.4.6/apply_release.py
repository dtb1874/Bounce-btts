from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Could not find expected v1.4.5 block: {label}")
    return text.replace(old, new, 1)


# --- LeagueApp.tsx ---------------------------------------------------------
league_path = ROOT / "app" / "LeagueApp.tsx"
league = league_path.read_text(encoding="utf-8")
league = replace_once(
    league,
    'import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";',
    'import { FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";',
    "React useRef import",
)
league = replace_once(league, 'const RELEASE_VERSION = "1.4.5";', 'const RELEASE_VERSION = "1.4.6";', "release version")
league = replace_once(league, 'const RELEASE_DATE = "11 Aug 2026";', 'const RELEASE_DATE = "13 Aug 2026";', "release date")

fixture_sort = '''function fixtureSort(a: Fixture, b: Fixture) {
  const ar = competitionPriority.indexOf(competitionDisplayName(a)), br = competitionPriority.indexOf(competitionDisplayName(b));
  return (ar < 0 ? 999 : ar) - (br < 0 ? 999 : br) || competitionDisplayName(a).localeCompare(competitionDisplayName(b)) || a.kickoff_at.localeCompare(b.kickoff_at) || a.home_team.localeCompare(b.home_team);
}
'''
fixture_sort_v146 = fixture_sort + '''const duplicateTeamSuffixes = new Set(["city","town","united","wanderers","rovers","albion","athletic","county"]);
function canonicalFixtureTeam(value:string){
  const parts=normaliseText(value).split(" ").filter(Boolean);
  while(parts.length>1&&duplicateTeamSuffixes.has(parts[parts.length-1]))parts.pop();
  return parts.join(" ");
}
function fixtureIdentityKey(fixture:Fixture){
  const instant=new Date(fixture.kickoff_at).toISOString().slice(0,16);
  return `${instant}|${canonicalFixtureTeam(fixture.home_team)}|${canonicalFixtureTeam(fixture.away_team)}`;
}
function fixtureRichness(fixture:Fixture,preferredIds?:Set<string>){
  return (preferredIds?.has(fixture.id)?1000:0)+(fixture.source==="api-football"?40:0)+(fixture.odds_fractional?12:0)+(fixture.home_score!=null&&fixture.away_score!=null?10:0)+(fixture.status!=="NS"?4:0);
}
function dedupeFixtures(rows:Fixture[],preferredIds?:Set<string>){
  const unique=new Map<string,Fixture>();
  for(const fixture of rows){
    const key=fixtureIdentityKey(fixture);
    const existing=unique.get(key);
    if(!existing||fixtureRichness(fixture,preferredIds)>fixtureRichness(existing,preferredIds))unique.set(key,fixture);
  }
  return Array.from(unique.values());
}
'''
league = replace_once(league, fixture_sort, fixture_sort_v146, "fixture de-duplication helpers")

old_current = '''  const gameweek = initialGameweeks.find(g => g.id === gameweekId) ?? initialGameweek;
  const currentFixtures = useMemo(() => fixtures.filter(f => f.gameweek_id === gameweek?.id), [fixtures,gameweek?.id]);
  const currentPredictions = useMemo(() => predictions.filter(p => p.gameweek_id === gameweek?.id), [predictions,gameweek?.id]);
'''
new_current = '''  const gameweek = initialGameweeks.find(g => g.id === gameweekId) ?? initialGameweek;
  const currentPredictions = useMemo(() => predictions.filter(p => p.gameweek_id === gameweek?.id), [predictions,gameweek?.id]);
  const selectedFixtureIds = useMemo(() => new Set(currentPredictions.map(p=>p.fixture_id)), [currentPredictions]);
  const currentFixtures = useMemo(() => dedupeFixtures(fixtures.filter(f => f.gameweek_id === gameweek?.id),selectedFixtureIds), [fixtures,gameweek?.id,selectedFixtureIds]);
'''
league = replace_once(league, old_current, new_current, "current fixture de-duplication")
league = replace_once(league, '{view==="fixtures" && <FixturesPage fixtures={allFixtures}/>}','{view==="fixtures" && <FixturesPage fixtures={dedupeFixtures(allFixtures)}/>}','fixture page de-duplication')

old_draft = '''  const [draft,setDraft]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState(false);
  useEffect(()=>{setDraft(Object.fromEntries(active.map(p=>[p.id,current.find(x=>x.member_id===p.id)?.fixture_id??""])))},[active,current]);
'''
new_draft = '''  const [draft,setDraft]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState(false);
  const draftGameweekRef=useRef<string|null>(null);
  useEffect(()=>{
    const gwId=gameweek?.id??null;
    if(draftGameweekRef.current===gwId)return;
    draftGameweekRef.current=gwId;
    setDraft(Object.fromEntries(active.map(p=>[p.id,current.find(x=>x.member_id===p.id)?.fixture_id??""])));
  },[gameweek?.id,active,current]);
'''
league = replace_once(league, old_draft, new_draft, "admin draft refresh protection")
league = replace_once(
    league,
    'summary:"Consistent collapsible fixture navigation and results grouping",changes:[',
    'summary:"Fixture integrity, admin stability and member mobile polish",changes:["Fixture lists suppress duplicate real-world matches while preserving selected fixture records","Admin bulk selections no longer disappear during the 45-second live refresh","Member mobile dashboard prioritises Make My Pick, League Table, Recent Form and Everyone’s Picks without removing any features","Maroon and gold presentation is strengthened with subtle Edinburgh / St Giles artwork across key surfaces","Combined accumulator odds use bookmaker-style whole-number x/1 presentation rounded down",',
    "v1.4.6 release history",
)
league_path.write_text(league, encoding="utf-8")


# --- release.module.css ----------------------------------------------------
css_path = ROOT / "app" / "release.module.css"
css = css_path.read_text(encoding="utf-8")
marker = "/* === v1.4.6 member mobile hierarchy / Edinburgh art pass === */"
if marker not in css:
    css += r'''

/* === v1.4.6 member mobile hierarchy / Edinburgh art pass === */
.title,.eyebrow{color:#d6b58f}
.panel::after{opacity:.04}
.dashboardIntro::before{
  content:"";position:absolute;inset:0;pointer-events:none;
  background:url("/assets/st-giles-round.jpg") 93% 50%/170px auto no-repeat;
  opacity:.035;mix-blend-mode:screen
}
.dashboardIntro{position:relative;overflow:hidden;border-color:rgba(172,119,83,.26)}
.dashboard .panel,.leaguePage .panel,.historyPage .panel{border-color:rgba(125,67,82,.5)}
.dashboard .panelHeading h3,.leaguePage h3,.historyPage h3{color:#f0dfcc}

@media(max-width:650px){
  .dashboard{display:flex;flex-direction:column;gap:11px}
  .dashboardIntro{order:0}
  .dashboardStats{order:1}
  .dashboardMain{display:contents}
  .dashboardPrimary,.dashboardSide{display:contents}
  .pickPanel{order:2;border-color:rgba(202,157,105,.52);box-shadow:0 14px 34px rgba(0,0,0,.26),inset 0 0 0 1px rgba(116,32,52,.24)}
  .tablePreview{order:3}
  .formPanel{order:4}
  .dashboardPrimary>.panel:not(.pickPanel){order:5}
  .dashboardSide>.panel:not(.tablePreview){order:6}
  .pickPanel .linkButton,.pickPanel .primary{min-height:44px;background:linear-gradient(180deg,#7c263d,#641b31);border-color:#a77763;color:#f6dfbd}
  .pickPanel .panelHeading{gap:8px;align-items:center}
  .pickPanel .panelHeading .linkButton{white-space:nowrap}
  .tablePreview,.formPanel,.dashboardPrimary>.panel:not(.pickPanel){background:linear-gradient(150deg,rgba(23,17,22,.985),rgba(12,13,17,.99))}
  .tablePreview::before,.formPanel::before{
    content:"";position:absolute;right:-28px;top:-35px;width:145px;height:145px;
    background:url("/assets/st-giles-round.jpg") center/contain no-repeat;opacity:.025;pointer-events:none
  }
  .dashboardStats{margin-bottom:1px}
  .quickLinks{grid-template-columns:1fr 1fr}
  .quickLinks button{min-height:66px}
  .selectionRow .fixturePicker{width:100%}
  .selectionRow .unsavedSelection{padding:4px 8px;border-radius:999px;background:rgba(116,32,52,.22);border:1px solid rgba(201,157,116,.24)}
  .adminTabs{position:sticky;top:0;z-index:20;padding:7px 0;background:linear-gradient(180deg,#101014 75%,rgba(16,16,20,0))}
}
'''
css_path.write_text(css, encoding="utf-8")


# --- lib/fractional.ts -----------------------------------------------------
fraction_path = ROOT / "lib" / "fractional.ts"
fraction = fraction_path.read_text(encoding="utf-8")
old_combined = '''export function combinedFractional(values: Array<string | null | undefined>) {
  const decimals = values.map(fractionalToDecimal).filter((v): v is number => v !== null);
  if (!decimals.length) return "Odds unavailable";
  return decimalToFractional(decimals.reduce((total, value) => total * value, 1));
}
'''
new_combined = '''export function combinedFractional(values: Array<string | null | undefined>) {
  const decimals = values.map(fractionalToDecimal).filter((v): v is number => v !== null);
  if (!decimals.length) return "Odds unavailable";
  const combinedDecimal = decimals.reduce((total, value) => total * value, 1);
  const wholeFractional = Math.floor(Math.max(0, combinedDecimal - 1));
  return `${wholeFractional}/1`;
}
'''
fraction = replace_once(fraction, old_combined, new_combined, "bookmaker-style combined odds")
fraction_path.write_text(fraction, encoding="utf-8")


# --- lib/api-football.ts --------------------------------------------------
api_path = ROOT / "lib" / "api-football.ts"
api = api_path.read_text(encoding="utf-8")
old_excluded = '''function isExcluded(home: string, away: string) {
  const teams = `${home} ${away}`.toLowerCase();
  return teams.includes("heart of midlothian") || /(^|\\s)hearts($|\\s)/.test(teams)
    || teams.includes("hibernian") || /(^|\\s)hibs($|\\s)/.test(teams);
}
'''
new_excluded = old_excluded + '''
const DUPLICATE_TEAM_SUFFIXES = new Set(["city", "town", "united", "wanderers", "rovers", "albion", "athletic", "county"]);
function canonicalTeam(value: string) {
  const parts = value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
  while (parts.length > 1 && DUPLICATE_TEAM_SUFFIXES.has(parts[parts.length - 1])) parts.pop();
  return parts.join(" ");
}
function sameFixtureTeams(left: { home_team?: string; away_team?: string }, right: { home_team?: string; away_team?: string }) {
  return canonicalTeam(String(left.home_team ?? "")) === canonicalTeam(String(right.home_team ?? ""))
    && canonicalTeam(String(left.away_team ?? "")) === canonicalTeam(String(right.away_team ?? ""));
}
'''
api = replace_once(api, old_excluded, new_excluded, "provider duplicate team normalisation")
old_lookup = '''        const { data: existing } = await admin.from("fixtures").select("*").eq("provider_fixture_id", providerId).maybeSingle();
        if (existing) {
'''
new_lookup = '''        const { data: providerRows } = await admin.from("fixtures").select("*").eq("provider_fixture_id", providerId).limit(1);
        let existing = providerRows?.[0] ?? null;
        if (!existing && next.gameweek_id) {
          const { data: sameKickoffRows } = await admin.from("fixtures").select("*")
            .eq("gameweek_id", next.gameweek_id).eq("kickoff_at", next.kickoff_at);
          existing = (sameKickoffRows ?? []).find((row: any) => sameFixtureTeams(row, next)) ?? null;
        }
        if (existing) {
'''
api = replace_once(api, old_lookup, new_lookup, "provider import upsert fallback")
api_path.write_text(api, encoding="utf-8")


# --- Release notes ---------------------------------------------------------
readme = ROOT / "README_BOUNCE_BTTS_v1.4.6.txt"
readme.write_text('''BOUNCE BTTS LEAGUE — v1.4.6
================================
13 August 2026

BASELINE
- Built directly from GitHub main v1.4.5.
- Compatibility pass preserves the v1.4.5 collapsible fixture/results behaviour,
  scoring, alerts, gameweek controls, searchable admin fixture picker and role model.

CHANGES
1. Fixture duplication
   - Client fixture lists de-duplicate the same real-world match using kickoff +
     normalised home/away identity.
   - Existing selected fixture IDs are preferred so historic/current picks are not
     orphaned by display de-duplication.
   - API-Football import now falls back to same kickoff + normalised teams before
     inserting a new row, covering provider naming differences such as:
       Notts County / Notts
       Leicester City / Leicester
       Bradford City / Bradford
       Peterborough United / Peterborough
       Wycombe Wanderers / Wycombe

2. League Admin > Selections reliability
   - Unsaved bulk selections are no longer reset by the 45-second live refresh.
   - Admin can enter all players, review them, then press Save all once.
   - Duplicate pending selections remain blocked before save.

3. Member mobile cleanup
   - No member features are removed.
   - Mobile dashboard order prioritises:
       Make My Pick
       League Table
       Recent Form
       Everyone's Picks / live results
       Remaining quick links
   - Touch targets and selection status presentation improved.

4. Visual identity
   - Maroon remains the primary scheme with gold text/accent treatment.
   - St Giles / Edinburgh mosaic treatment strengthened subtly across key surfaces.
   - Existing Hearts / Bounce visual assets are retained.

5. Weekly Picks combined odds
   - Individual fixture odds remain unchanged.
   - Combined accumulator odds now show a bookmaker-style whole-number fractional
     price, rounded DOWN: e.g. 79.77/1 displays as 79/1.

FILES CHANGED
- app/LeagueApp.tsx
- app/release.module.css
- lib/api-football.ts
- lib/fractional.ts
- README_BOUNCE_BTTS_v1.4.6.txt

NO DATABASE MIGRATION REQUIRED
- This release intentionally avoids destructive fixture cleanup in Supabase.
- Existing duplicate rows are suppressed safely in the UI; new API refreshes use
  the stronger matching rule to prevent the same naming-variant duplication from
  being created again.

RELEASE CHECKS
- npm build must pass before release artifact is produced.
- Confirm Member mobile dashboard hierarchy.
- Confirm Admin > Selections can hold all unsaved picks for >45 seconds.
- Confirm Save all commits the batch.
- Confirm Fixtures / Make My Pick / Results do not show duplicate matches.
- Confirm current selections still resolve to their saved fixture IDs.
- Confirm weekly picks image shows combined odds as x/1.
''', encoding="utf-8")

print("v1.4.6 transformation applied successfully")
