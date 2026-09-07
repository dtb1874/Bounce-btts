import fs from "node:fs";

const path = "app/LeagueApp.tsx";
let source = fs.readFileSync(path, "utf8");

function replaceOnce(input, before, after, label) {
  const first = input.indexOf(before);
  if (first < 0) throw new Error(`${label} anchor not found`);
  if (input.indexOf(before, first + before.length) >= 0) throw new Error(`${label} anchor is not unique`);
  return input.slice(0, first) + after + input.slice(first + before.length);
}

const dashboardStart = source.indexOf("function Dashboard(");
const pickStart = source.indexOf("function PickPage(");
const fixturesStart = source.indexOf("function FixturesPage(");
if (dashboardStart < 0 || pickStart < 0 || fixturesStart < 0 || !(dashboardStart < pickStart && pickStart < fixturesStart)) {
  throw new Error("Dashboard/PickPage boundaries not found");
}

let dashboard = source.slice(dashboardStart, pickStart);
if (!dashboard.includes("uiFoundationDashboard")) {
  dashboard = replaceOnce(
    dashboard,
    'return <section className={`${styles.dashboard} compactDashboard ${isAdmin?"adminDashboard":""}`}>',
    'return <section className={`${styles.dashboard} compactDashboard uiFoundationDashboard ${isAdmin?"adminDashboard":""}`} data-ui-foundation-view="dashboard">',
    "dashboard root"
  );
  dashboard = replaceOnce(
    dashboard,
    'className={`${styles.dashboardIntro} adminDashboardIntro mobileControlCentre`}',
    'className={`${styles.dashboardIntro} adminDashboardIntro mobileControlCentre uiFoundationDashboardIntro`}',
    "dashboard intro"
  );
  dashboard = replaceOnce(
    dashboard,
    'className={`${styles.dashboardStats} adminDashboardStats`}',
    'className={`${styles.dashboardStats} adminDashboardStats uiFoundationDashboardStats`}',
    "dashboard stats"
  );
  dashboard = replaceOnce(
    dashboard,
    'className="mobileDashboardActions"',
    'className="mobileDashboardActions uiFoundationDashboardActions"',
    "dashboard actions"
  );
  dashboard = replaceOnce(
    dashboard,
    'className={`${styles.dashboardMain} mobileDashboardMain`}',
    'className={`${styles.dashboardMain} mobileDashboardMain uiFoundationDashboardMain`}',
    "dashboard main"
  );
  dashboard = replaceOnce(
    dashboard,
    'className={`${styles.panel} weeklyPicksPanel`}',
    'className={`${styles.panel} weeklyPicksPanel uiFoundationDashboardPicks`}',
    "dashboard picks"
  );
  dashboard = replaceOnce(
    dashboard,
    'className={`${styles.panel} ${styles.tablePreview} mobileLeaguePreview`}',
    'className={`${styles.panel} ${styles.tablePreview} mobileLeaguePreview uiFoundationDashboardLeague`}',
    "dashboard league preview"
  );
  dashboard = replaceOnce(
    dashboard,
    'className={`${styles.panel} ${styles.formPanel}`}',
    'className={`${styles.panel} ${styles.formPanel} uiFoundationDashboardForm`}',
    "dashboard form"
  );

  dashboard = dashboard.replace('<strong>League Table</strong></button>\n      <button onClick={()=>document.getElementById("current-form")', '<strong>Stat Centre</strong></button>\n      <button onClick={()=>document.getElementById("current-form")');
  dashboard = dashboard.replace('<strong>League Table</strong><small>Full standings & tie-break detail</small>', '<strong>Stat Centre</strong><small>League table & season stats</small>');
  dashboard = dashboard.replace('<div><div className={styles.title}>LEAGUE TABLE</div><h3>Season standings</h3></div>', '<div><div className={styles.title}>STAT CENTRE</div><h3>Season standings</h3></div>');
}

let pick = source.slice(pickStart, fixturesStart);
if (!pick.includes("uiFoundationPickPage")) {
  const countriesNeedle = '  const countries=Array.from(new Set(filtered.map(f=>normaliseCountry(f.country))));\n';
  if (!pick.includes(countriesNeedle)) throw new Error("Pick countries anchor not found");
  const selectionState = '  const myPrediction=predictions.find(p=>p.gameweek_id===gameweek?.id&&p.member_id===myId);\n  const myFixture=fixtures.find(f=>f.id===myPrediction?.fixture_id);\n';
  pick = pick.replace(countriesNeedle, countriesNeedle + selectionState);

  pick = replaceOnce(
    pick,
    'return <section><Heading eyebrow={gameweek?`GAMEWEEK ${gameweek.number}`:"NO GAMEWEEK"} title="Make My Pick"><p>Choose one unique eligible fixture. <Help text="Search by team, country or competition, or browse the collapsible fixture groups."/></p></Heading><div className={styles.panel}>',
    'return <section className="uiFoundationPickPage" data-ui-foundation-view="pick"><Heading eyebrow={gameweek?`GAMEWEEK ${gameweek.number}`:"NO GAMEWEEK"} title="Make My Pick"><p>Choose one unique eligible fixture. <Help text="Search by team, country or competition, or browse the collapsible fixture groups."/></p></Heading><div className={`uiFoundationPickStatus ${myFixture?"uiFoundationPickStatusSaved":"uiFoundationPickStatusEmpty"}`}><span>{myFixture?"CURRENT PICK":isOpen?"SELECTION OPEN":"SELECTION CLOSED"}</span><strong>{myFixture?`${myFixture.home_team} v ${myFixture.away_team}`:isOpen?"No fixture selected yet":"No active selection"}</strong><small>{myFixture?`${formatKickoff(myFixture.kickoff_at)} · ${competitionDisplayName(myFixture)}${myFixture.odds_fractional?` · ${formatFixtureOddsDisplay(myFixture.odds_fractional)}`:""}`:isOpen?"Pick an available fixture below. Your saved choice will be shown here.":"You can still review the available fixtures below."}</small></div><div className={`${styles.panel} uiFoundationPickPanel`}>',
    "pick root/status"
  );

  pick = replaceOnce(
    pick,
    'className={styles.search} type="search"',
    'className={`${styles.search} uiFoundationPickSearch`} type="search"',
    "pick search"
  );
  pick = pick.replace('className={styles.fixtureDetailsNested} key={country}', 'className={`${styles.fixtureDetailsNested} uiFoundationPickCountry`} key={country}');
  pick = pick.replace('className={styles.fixtureDetailsLeague} key={group}', 'className={`${styles.fixtureDetailsLeague} uiFoundationPickCompetition`} key={group}');
  pick = pick.replace('return <div className={styles.row} key={f.id}>', 'return <div className={`${styles.row} uiFoundationPickFixture`} key={f.id}>');
  pick = pick.replace(
    'className={styles.button} disabled={!isOpen||!!(owner&&owner.id!==myId)}',
    'className={`${styles.button} uiFoundationPickAction ${owner?.id===myId?"uiFoundationPickActionSelected":owner?"uiFoundationPickActionTaken":""}`} disabled={!isOpen||!!(owner&&owner.id!==myId)}'
  );
}

source = source.slice(0, dashboardStart) + dashboard + pick + source.slice(fixturesStart);

const required = [
  'data-ui-foundation-view="dashboard"',
  'uiFoundationDashboardPicks',
  'uiFoundationDashboardLeague',
  'data-ui-foundation-view="pick"',
  'uiFoundationPickStatus',
  'uiFoundationPickFixture',
  'uiFoundationPickActionSelected'
];
for (const marker of required) if (!source.includes(marker)) throw new Error(`Required migrated marker missing: ${marker}`);

fs.writeFileSync(path, source);
console.log("Migrated Dashboard and Make My Pick to semantic UI Foundation ownership.");
