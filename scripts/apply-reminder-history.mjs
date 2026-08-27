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

fs.writeFileSync(path, source);
