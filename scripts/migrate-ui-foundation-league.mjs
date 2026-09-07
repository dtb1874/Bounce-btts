import fs from "node:fs";

const path = "app/LeagueApp.tsx";
let source = fs.readFileSync(path, "utf8");

function blockBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Could not locate block ${startMarker}`);
  return { start, end, text: source.slice(start, end) };
}

function replaceBlock(range, text) {
  source = source.slice(0, range.start) + text + source.slice(range.end);
}

let resultsRange = blockBetween("function ResultsPage(", "function HistoryPage(");
let results = resultsRange.text;
if (!results.includes("uiFoundationResultsPage")) {
  results = results.replace("  return <section>\n", '  return <section className="uiFoundationResultsPage" data-ui-foundation-view="results">\n');
  const panelNeedle = "    <div className={styles.panel}>\n";
  const firstPanel = results.indexOf(panelNeedle);
  if (firstPanel < 0) throw new Error("Results selected panel anchor missing");
  results = results.slice(0, firstPanel) + '    <div className={`${styles.panel} uiFoundationResultsSelected`}>\n' + results.slice(firstPanel + panelNeedle.length);
  const secondPanel = results.indexOf(panelNeedle, firstPanel + 1);
  if (secondPanel < 0) throw new Error("Results all panel anchor missing");
  results = results.slice(0, secondPanel) + '    <div className={`${styles.panel} uiFoundationResultsAll`}>\n' + results.slice(secondPanel + panelNeedle.length);
  results = results.replace('<div className={styles.title}>ALL RESULTS / FIXTURES</div>', '<div className={`${styles.title} uiFoundationResultsTitle`}>ALL RESULTS / FIXTURES</div>');
  results = results.replaceAll('className={styles.resultRow}', 'className={`${styles.resultRow} uiFoundationResultRow`}');
}
replaceBlock(resultsRange, results);

let historyRange = blockBetween("function HistoryPage(", "function PlayersPage(");
let history = historyRange.text;
if (!history.includes("uiFoundationHistoryPage")) {
  history = history.replace('return <section className={styles.historyPage}>', 'return <section className={`${styles.historyPage} uiFoundationHistoryPage`} data-ui-foundation-view="history">');
  history = history.replace('className={styles.historyHero}', 'className={`${styles.historyHero} uiFoundationHistoryHero`}');
  history = history.replace('className={`${styles.panel} ${styles.honourPanel} ${historyHonoursOpen?"historyHonoursOpen":"historyHonoursCollapsed"}`}', 'className={`${styles.panel} ${styles.honourPanel} uiFoundationHistoryHonours ${historyHonoursOpen?"historyHonoursOpen":"historyHonoursCollapsed"}`}');
  history = history.replace('className={`${styles.panel} ${styles.table} ${styles.fullLeagueTable} ${styles.historyTableShell}`}', 'className={`${styles.panel} ${styles.table} ${styles.fullLeagueTable} ${styles.historyTableShell} uiFoundationHistoryTable`}');
}
replaceBlock(historyRange, history);

let playersRange = blockBetween("function PlayersPage(", "function AboutPage(");
let players = playersRange.text;
if (!players.includes("uiFoundationPlayersPage")) {
  players = players.replace('return <section><Heading', 'return <section className="uiFoundationPlayersPage" data-ui-foundation-view="players"><Heading');
  players = players.replace('<div className={styles.panel}>{profiles.map', '<div className={`${styles.panel} uiFoundationPlayersPanel`}>{profiles.map');
  players = players.replace('return <div className={styles.row} key={p.id}>', 'return <div className={`${styles.row} uiFoundationPlayerRow`} key={p.id}>');
}
replaceBlock(playersRange, players);

const required = [
  'data-ui-foundation-view="results"',
  'uiFoundationResultsSelected',
  'uiFoundationResultRow',
  'data-ui-foundation-view="history"',
  'uiFoundationHistoryTable',
  'data-ui-foundation-view="players"',
  'uiFoundationPlayerRow'
];
for (const marker of required) if (!source.includes(marker)) throw new Error(`Missing migrated marker: ${marker}`);

fs.writeFileSync(path, source);
console.log("Migrated Results, League History and Players to semantic UI Foundation ownership.");
