import fs from "node:fs";

const path = "app/LeagueApp.tsx";
let source = fs.readFileSync(path, "utf8");

if (!source.includes('import ReminderShareButton from "./ReminderShareButton";')) {
  const anchor = 'import DataShareButton from "./DataShareButton";';
  if (!source.includes(anchor)) throw new Error("Could not find LeagueApp share import anchor");
  source = source.replace(anchor, `${anchor}\nimport ReminderShareButton from "./ReminderShareButton";\nimport EnhancedPickPage from "./EnhancedPickPage";\nimport GameweekRecapCard from "./GameweekRecapCard";`);
} else if (!source.includes('import GameweekRecapCard from "./GameweekRecapCard";')) {
  const anchor = 'import EnhancedPickPage from "./EnhancedPickPage";';
  if (!source.includes(anchor)) throw new Error("Could not find enhanced picker import anchor");
  source = source.replace(anchor, `${anchor}\nimport GameweekRecapCard from "./GameweekRecapCard";`);
}

const reminderFunction = /\n  function remindMissingPicks\(\)\{[\s\S]*?\n  \}\n  const finished=/;
if (reminderFunction.test(source)) source = source.replace(reminderFunction, "\n  const finished=");

const oldReminderButton = '{isAdmin&&<button type="button" className="dashboardGoldAction dashboardAdminAction" onClick={remindMissingPicks} disabled={!isOpen||!missingPicks.length} aria-label={missingPicks.length?`Remind ${missingPicks.length} missing picks via WhatsApp`:"All picks are in"}>{missingPicks.length?"Remind Picks":"All Picks In ✓"}</button>}';
const oldNewButton = '{isAdmin&&gameweek&&<ReminderShareButton gameweekNumber={gameweek.number} deadline={gameweek.locks_at} missingNames={missingPicks.map(p=>p.display_name)} disabled={!isOpen||!missingPicks.length}/>}';
const newReminderButton = '{isAdmin&&gameweek&&<ReminderShareButton gameweekNumber={gameweek.number} seasonLabel={seasonLabel} deadline={gameweek.locks_at} missingNames={missingPicks.map(p=>p.display_name)} submittedPicks={picks.filter(p=>p.prediction&&p.fixture).map(p=>({name:p.profile.display_name,fixture:`${p.fixture!.home_team} v ${p.fixture!.away_team}`}))} disabled={!isOpen||!missingPicks.length}/>}';
if (source.includes(oldReminderButton)) source = source.replace(oldReminderButton, newReminderButton);
else if (source.includes(oldNewButton)) source = source.replace(oldNewButton, newReminderButton);
else if (!source.includes("submittedPicks={picks.filter")) throw new Error("Could not find dashboard reminder button");

const dashboardCall = 'fixtures={currentFixtures} predictions={currentPredictions} allPredictions={predictions}';
if (source.includes(dashboardCall)) source = source.replace(dashboardCall, 'fixtures={currentFixtures} allFixtures={fixtures} predictions={currentPredictions} allPredictions={predictions}');
else if (!source.includes('allFixtures={fixtures}')) throw new Error("Could not add all-season fixtures to Dashboard");

const dashboardArgs = 'gameweek,gameweeks,profiles,fixtures,predictions,allPredictions,allAdjustments,adjustment';
if (source.includes(dashboardArgs)) source = source.replace(dashboardArgs, 'gameweek,gameweeks,profiles,fixtures,allFixtures,predictions,allPredictions,allAdjustments,adjustment');
else if (!source.includes('fixtures,allFixtures,predictions')) throw new Error("Could not add allFixtures to Dashboard args");

const dashboardFixtureType = '  fixtures:Fixture[];\n  predictions:Prediction[];';
if (source.includes(dashboardFixtureType)) source = source.replace(dashboardFixtureType, '  fixtures:Fixture[];\n  allFixtures:Fixture[];\n  predictions:Prediction[];');
else if (!source.includes('  allFixtures:Fixture[];')) throw new Error("Could not add allFixtures Dashboard type");

const recapAnchor = '          </div>\n        </article>\n      </div>\n\n      <aside className={`${styles.dashboardSide} mobileDashboardSide`}>';
const recapBlock = '          </div>\n        </article>\n        <GameweekRecapCard profiles={profiles} gameweeks={gameweeks} predictions={allPredictions} adjustments={allAdjustments} fixtures={allFixtures} seasonLabel={seasonLabel}/>\n      </div>\n\n      <aside className={`${styles.dashboardSide} mobileDashboardSide`}>';
if (source.includes(recapAnchor)) source = source.replace(recapAnchor, recapBlock);
else if (!source.includes('<GameweekRecapCard profiles={profiles}')) throw new Error("Could not place structural Gameweek Recap after Everyone at a glance");

const pickPattern = /function PickPage\(\{gameweek,fixtures,predictions,profiles,isOpen,myId,selectFixture\}:\{gameweek:Gameweek\|null;fixtures:Fixture\[\];predictions:Prediction\[\];profiles:Profile\[\];isOpen:boolean;myId:string;selectFixture:\(id:string\)=>void\}\)\{[\s\S]*?\n\}\nfunction FixturesPage/;
if (pickPattern.test(source)) {
  source = source.replace(pickPattern, 'function PickPage({gameweek,fixtures,predictions,profiles,isOpen,myId,selectFixture}:{gameweek:Gameweek|null;fixtures:Fixture[];predictions:Prediction[];profiles:Profile[];isOpen:boolean;myId:string;selectFixture:(id:string)=>void}){return <EnhancedPickPage gameweek={gameweek} fixtures={fixtures} predictions={predictions} profiles={profiles} isOpen={isOpen} myId={myId} selectFixture={selectFixture}/>;}\nfunction FixturesPage');
} else if (!source.includes("return <EnhancedPickPage")) {
  throw new Error("Could not find Make My Pick implementation");
}

// Stage 1 release-history catch-up: compile the missing entries into the existing
// React ReleaseHistory component. No browser-side DOM bridge, observer or portal.
const releaseHistoryAnchor = 'function ReleaseHistory(){\n  const latest=';
if (source.includes(releaseHistoryAnchor)) {
  const catchup = `function ReleaseHistory(){\n  const catchup=[\n    {version:"1.11.1",date:"3 Sep 2026",summary:"Member portraits across shares and mobile identity",changes:["Used saved member portraits inline beside names across fixture, table, recap and reminder share images, with initials fallback","Removed the generic portrait strip from shared media so portraits only appear where a member is represented","Added the signed-in member portrait or initials to the mobile burger-menu identity area","Kept share calculations, scoring, fixture data and admin behaviour unchanged"]},\n    {version:"1.11.0",date:"3 Sep 2026",summary:"Release 4 · visual identity and prestige presentation",changes:["Strengthened the Hearts, Edinburgh and St Giles visual identity","Promoted the reigning champion into a premium dynamic plaque with Bounce Cup artwork","Improved portrait presentation and mobile Admin Users styling","Documented visual ownership and safe-edit boundaries"]},\n    {version:"1.10.0",date:"2 Sep 2026",summary:"Release 3 · member profiles and selection UX",changes:["Added Ultimate-Admin-managed member profile and portrait data","Integrated portraits into member presentation with initials fallback","Refined mobile member navigation and selection presentation"]},\n    {version:"1.9.0",date:"2 Sep 2026",summary:"Release 2 · native iOS animated sharing",changes:["Improved native iPhone and iPad animated file sharing","Slowed animated race and sweep exports for easier viewing","Validated the native sharing path on physical iPhone and WhatsApp"]},\n    {version:"1.8.0",date:"2 Sep 2026",summary:"Release 1 · safer gameweek admin and stats",changes:["Added guarded future-gameweek removal","Expanded Value Leader qualification detail","Clarified UK local-time guidance for gameweek administration"]},\n    {version:"1.7.2",date:"29 Aug 2026",summary:"One-off and midweek gameweek controls",changes:["Added one-off gameweek insertion between scheduled rounds","Added configurable eligible kick-off windows","Exposed the controls inside the normal Admin Gameweek workflow"]},\n    {version:"1.7.1",date:"27 Aug 2026",summary:"Gameweek Recap and current-season archive",changes:["Added settled Gameweek Recap to the Dashboard","Added a fixture-level current-season Gameweek Archive in League History","Extended combined shares with recap information after settlement","Made Creature of Habit supporting detail expandable"]},\n    {version:"1.7.0",date:"22–27 Aug 2026",summary:"League race, sweep tracking and sharing reliability",changes:["Added League Position Race and Goals Away From The Sweep trackers","Added animated and public race sharing","Improved reminder sharing and recent team form","Added deadline odds snapshots for historical Stats Centre accuracy"]}\n  ];\n  const latest=`;
  source = source.replace(releaseHistoryAnchor, catchup);
}

const releaseRenderAnchor = '    <details className={styles.releaseItem} open><summary><span><strong>v{latest.version}</strong> · {latest.date}</span><small>{latest.summary}</small></summary><ul>{latest.changes.map(c=><li key={c}>{c}</li>)}</ul></details>';
if (source.includes(releaseRenderAnchor)) {
  source = source.replace(releaseRenderAnchor, '    {catchup.map((r,index)=><details className={styles.releaseItem} key={r.version} open={index===0}><summary><span><strong>v{r.version}</strong> · {r.date}</span><small>{r.summary}</small></summary><ul>{r.changes.map(c=><li key={c}>{c}</li>)}</ul></details>)}\n    <details className={styles.releaseItem}><summary><span><strong>v{latest.version}</strong> · {latest.date}</span><small>{latest.summary}</small></summary><ul>{latest.changes.map(c=><li key={c}>{c}</li>)}</ul></details>');
} else if (!source.includes('catchup.map((r,index)')) {
  throw new Error("Could not place Release History catch-up entries");
}

// Stage 2: align the existing React-rendered current version/date with the newest
// release entry. This is a build-time source replacement only; no browser runtime code.
const oldReleaseVersion = 'const RELEASE_VERSION = "1.6.3";';
const oldReleaseDate = 'const RELEASE_DATE = "20 Aug 2026";';
if (source.includes(oldReleaseVersion)) source = source.replace(oldReleaseVersion, 'const RELEASE_VERSION = "1.11.1";');
else if (!source.includes('const RELEASE_VERSION = "1.11.1";')) throw new Error("Could not align release version");
if (source.includes(oldReleaseDate)) source = source.replace(oldReleaseDate, 'const RELEASE_DATE = "3 Sep 2026";');
else if (!source.includes('const RELEASE_DATE = "3 Sep 2026";')) throw new Error("Could not align release date");

fs.writeFileSync(path, source);
