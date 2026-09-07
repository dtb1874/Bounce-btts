import fs from "node:fs";

const path = "app/LeagueApp.tsx";
let source = fs.readFileSync(path, "utf8");

if (!source.includes("uiFoundationReigningChampion")) {
  const anchor = '    </Heading>\n    <div className={`${styles.historyHero} uiFoundationHistoryHero`}>';
  if (!source.includes(anchor)) throw new Error("History heading/hero anchor not found");
  const replacement = '    </Heading>\n    {reigningChampion&&<aside className="uiFoundationReigningChampion" aria-label="Reigning Bounce champion"><div className="uiFoundationReigningChampionCopy"><span>REIGNING CHAMPION · {reigningChampion.season}</span><strong>{reigningChampion.winner}</strong><small>Current holder of the Bounce Cup</small></div><div className="uiFoundationReigningChampionTrophy"><img src="/assets/bounce-cup.png" alt="" aria-hidden="true"/></div></aside>}\n    <div className={`${styles.historyHero} uiFoundationHistoryHero`}>';
  source = source.replace(anchor, replacement);
}

if (!source.includes('className="uiFoundationReigningChampion"')) throw new Error("Declarative reigning champion did not migrate");
fs.writeFileSync(path, source);
console.log("Moved reigning champion prestige into React-owned History markup.");
