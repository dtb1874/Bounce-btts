import fs from "node:fs";

const path = "app/LeagueApp.tsx";
let source = fs.readFileSync(path, "utf8");

const start = source.indexOf("function AdminPage(");
const end = source.indexOf("function PaymentTracker(", start);
if (start < 0 || end < 0) throw new Error("AdminPage boundaries not found");
let block = source.slice(start, end);

if (!block.includes("uiFoundationAdminPage")) {
  block = block.replace(
    'return <section className={styles.adminPage}>',
    'return <section className={`${styles.adminPage} uiFoundationAdminPage`} data-ui-foundation-view="admin">'
  );
  block = block.replace(
    '<div className={styles.adminTabs}>',
    '<div className={`${styles.adminTabs} uiFoundationAdminTabs`}>'
  );
  block = block.replace(
    '<div className={`${styles.panel} ${styles.adminPanel}`}>',
    '<div className={`${styles.panel} ${styles.adminPanel} uiFoundationAdminPanel`}>'
  );
}

for (const marker of ['data-ui-foundation-view="admin"','uiFoundationAdminTabs','uiFoundationAdminPanel']) {
  if (!block.includes(marker)) throw new Error(`Admin migration marker missing: ${marker}`);
}

source = source.slice(0, start) + block + source.slice(end);
fs.writeFileSync(path, source);
console.log("Migrated Admin presentation to semantic UI Foundation ownership.");
