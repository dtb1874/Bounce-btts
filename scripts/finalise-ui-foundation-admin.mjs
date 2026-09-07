import fs from "node:fs";

const leaguePath = "app/LeagueApp.tsx";
const adminCssPath = "app/ui-foundation-admin.css";
const legacyCssPath = "app/release4-admin-users-tidy.css";
const layoutPath = "app/layout.tsx";

let source = fs.readFileSync(leaguePath, "utf8");
const usersStart = source.indexOf("function UsersAdmin(");
const usersEnd = source.indexOf("\nfunction ", usersStart + 1);
if (usersStart < 0 || usersEnd < 0) throw new Error("UsersAdmin block not found");
let block = source.slice(usersStart, usersEnd);
const replacements = [
  ['<div className={styles.adminUsers}>', '<div className={`${styles.adminUsers} uiFoundationAdminUsers`}>'],
  ['<div className={`${styles.row} ${styles.adminUserRow}`} key={u.id}', '<div className={`${styles.row} ${styles.adminUserRow} uiFoundationAdminUserRow`} key={u.id}'],
  ['<label className={styles.adminUserField}>', '<label className={`${styles.adminUserField} uiFoundationAdminUserField`}>'],
  ['<span className={styles.adminRCount} title="Rousset Easter egg presses">', '<span className={`${styles.adminRCount} uiFoundationAdminRCount`} title="Rousset Easter egg presses">'],
  ['<div className={styles.buttonRow}>', '<div className={`${styles.buttonRow} uiFoundationAdminUserActions`}>'],
  ['<button className={styles.shareGold} disabled={!u.password}', '<button className={`${styles.shareGold} uiFoundationAdminShareGold`} disabled={!u.password}'],
];
for (const [from, to] of replacements) {
  if (!block.includes(from)) throw new Error(`UsersAdmin anchor not found: ${from}`);
  block = block.split(from).join(to);
}
source = source.slice(0, usersStart) + block + source.slice(usersEnd);
fs.writeFileSync(leaguePath, source);

let adminCss = fs.readFileSync(adminCssPath, "utf8").trimEnd();
const legacy = fs.readFileSync(legacyCssPath, "utf8");
let semantic = legacy
  .replace(/\[class\*="adminPage"\]/g, ".uiFoundationAdminPage")
  .replace(/\[class\*="adminTabs"\]/g, ".uiFoundationAdminTabs")
  .replace(/\[class\*="adminUsers"\]/g, ".uiFoundationAdminUsers")
  .replace(/\[class\*="adminUserRow"\]/g, ".uiFoundationAdminUserRow")
  .replace(/\[class\*="adminUserField"\]/g, ".uiFoundationAdminUserField")
  .replace(/\[class\*="adminRCount"\]/g, ".uiFoundationAdminRCount")
  .replace(/\[class\*="buttonRow"\]/g, ".uiFoundationAdminUserActions")
  .replace(/\[class\*="shareGold"\]/g, ".uiFoundationAdminShareGold")
  .replace(/^\/\* Release 4[\s\S]*?\*\/\s*/, "");
if (/\[class\*=/.test(semantic)) throw new Error("Generated-class selector remains in migrated admin CSS");
adminCss += "\n\n/* Final UI Foundation ownership — Admin > Users mobile presentation. */\n" + semantic.trim() + "\n";
fs.writeFileSync(adminCssPath, adminCss);

let layout = fs.readFileSync(layoutPath, "utf8");
const importLine = 'import "./release4-admin-users-tidy.css";\n';
if (!layout.includes(importLine)) throw new Error("Legacy admin stylesheet import not found");
layout = layout.replace(importLine, "");
fs.writeFileSync(layoutPath, layout);

fs.unlinkSync(legacyCssPath);
console.log("Admin Users presentation migrated to stable UI Foundation semantic hooks.");
