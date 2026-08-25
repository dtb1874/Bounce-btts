import fs from "node:fs";

const path = "app/LeagueApp.tsx";
let source = fs.readFileSync(path, "utf8");

if (!source.includes('import ReminderShareButton from "./ReminderShareButton";')) {
  const anchor = 'import DataShareButton from "./DataShareButton";';
  if (!source.includes(anchor)) throw new Error("Could not find LeagueApp share import anchor");
  source = source.replace(anchor, `${anchor}\nimport ReminderShareButton from "./ReminderShareButton";\nimport EnhancedPickPage from "./EnhancedPickPage";`);
}

const reminderFunction = /\n  function remindMissingPicks\(\)\{[\s\S]*?\n  \}\n  const finished=/;
if (reminderFunction.test(source)) source = source.replace(reminderFunction, "\n  const finished=");

const oldReminderButton = '{isAdmin&&<button type="button" className="dashboardGoldAction dashboardAdminAction" onClick={remindMissingPicks} disabled={!isOpen||!missingPicks.length} aria-label={missingPicks.length?`Remind ${missingPicks.length} missing picks via WhatsApp`:"All picks are in"}>{missingPicks.length?"Remind Picks":"All Picks In ✓"}</button>}';
const oldNewButton = '{isAdmin&&gameweek&&<ReminderShareButton gameweekNumber={gameweek.number} deadline={gameweek.locks_at} missingNames={missingPicks.map(p=>p.display_name)} disabled={!isOpen||!missingPicks.length}/>}';
const newReminderButton = '{isAdmin&&gameweek&&<ReminderShareButton gameweekNumber={gameweek.number} seasonLabel={seasonLabel} deadline={gameweek.locks_at} missingNames={missingPicks.map(p=>p.display_name)} submittedPicks={picks.filter(p=>p.prediction&&p.fixture).map(p=>({name:p.profile.display_name,fixture:`${p.fixture!.home_team} v ${p.fixture!.away_team}`}))} disabled={!isOpen||!missingPicks.length}/>}';
if (source.includes(oldReminderButton)) source = source.replace(oldReminderButton, newReminderButton);
else if (source.includes(oldNewButton)) source = source.replace(oldNewButton, newReminderButton);
else if (!source.includes("submittedPicks={picks.filter")) throw new Error("Could not find dashboard reminder button");

const pickPattern = /function PickPage\(\{gameweek,fixtures,predictions,profiles,isOpen,myId,selectFixture\}:\{gameweek:Gameweek\|null;fixtures:Fixture\[\];predictions:Prediction\[\];profiles:Profile\[\];isOpen:boolean;myId:string;selectFixture:\(id:string\)=>void\}\)\{[\s\S]*?\n\}\nfunction FixturesPage/;
if (pickPattern.test(source)) {
  source = source.replace(pickPattern, 'function PickPage({gameweek,fixtures,predictions,profiles,isOpen,myId,selectFixture}:{gameweek:Gameweek|null;fixtures:Fixture[];predictions:Prediction[];profiles:Profile[];isOpen:boolean;myId:string;selectFixture:(id:string)=>void}){return <EnhancedPickPage gameweek={gameweek} fixtures={fixtures} predictions={predictions} profiles={profiles} isOpen={isOpen} myId={myId} selectFixture={selectFixture}/>;}\nfunction FixturesPage');
} else if (!source.includes("return <EnhancedPickPage")) {
  throw new Error("Could not find Make My Pick implementation");
}

fs.writeFileSync(path, source);
