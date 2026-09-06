import fs from "node:fs";

const path = "app/LeagueApp.tsx";
let source = fs.readFileSync(path, "utf8");

if (source.includes('data-ui-foundation-shell="declarative"') || source.includes("<AuthenticatedShellFrame")) {
  console.log("Declarative LeagueApp shell already active; nothing to do.");
  process.exit(0);
}

const importNeedle = 'import CanonicalLeagueTable from "./CanonicalLeagueTable";\n';
if (!source.includes(importNeedle)) throw new Error("CanonicalLeagueTable import anchor not found");
source = source.replace(importNeedle, `${importNeedle}import AuthenticatedShellFrame from "./ui/AuthenticatedShellFrame";\n`);

const oldNav = `const navItems: Array<{ id: View; label: string; icon: string; adminOnly?: boolean }> = [
  { id: "dashboard", label: "Dashboard", icon: "⌂" },
  { id: "pick", label: "Make My Pick", icon: "⚑" },
  { id: "fixtures", label: "Fixtures", icon: "▦" },
  { id: "table", label: "League Table", icon: "☷" },
  { id: "results", label: "Results", icon: "✦" },
  { id: "history", label: "League History", icon: "◷" },
  { id: "players", label: "Players", icon: "◉" },
  { id: "about", label: "About", icon: "?" },
  { id: "alerts", label: "Alerts", icon: "!", adminOnly: true },
  { id: "admin", label: "Admin", icon: "⚙", adminOnly: true },
];`;
const newNav = `const navItems: Array<{ id: View; label: string; icon: string; adminOnly?: boolean; group: "quick" | "more"; helper?: string }> = [
  { id: "dashboard", label: "Dashboard", icon: "⌂", group: "quick" },
  { id: "pick", label: "Make My Pick", icon: "⚑", group: "quick" },
  { id: "fixtures", label: "Fixtures", icon: "▦", group: "more" },
  { id: "table", label: "League Table", icon: "☷", group: "quick", helper: "Stat Centre" },
  { id: "results", label: "Results", icon: "✦", group: "quick", helper: "All picks" },
  { id: "history", label: "League History", icon: "◷", group: "more" },
  { id: "players", label: "Players", icon: "◉", group: "more" },
  { id: "about", label: "About", icon: "?", group: "more" },
  { id: "alerts", label: "Alerts", icon: "!", adminOnly: true, group: "more" },
  { id: "admin", label: "Admin", icon: "⚙", adminOnly: true, group: "more" },
];`;
if (!source.includes(oldNav)) throw new Error("Navigation definition anchor not found");
source = source.replace(oldNav, newNav);

const signOutAnchor = '  async function signOut(){ await createClient().auth.signOut(); window.location.href="/"; }\n';
if (!source.includes(signOutAnchor)) throw new Error("signOut anchor not found");
const triggerRousset = `  function triggerRousset(){
    setRouss(true);
    setMobileMenu(false);
    void (async()=>{try{await fetch("/api/easter-egg/rousset",{method:"POST",headers:{authorization:\`Bearer \${await token()}\`}})}catch{}})();
  }
`;
source = source.replace(signOutAnchor, `${signOutAnchor}${triggerRousset}`);

const shellStartNeedle = '  return <main className={styles.shell}>\n';
const shellStart = source.indexOf(shellStartNeedle);
if (shellStart < 0) throw new Error("LeagueApp shell start not found");
const headingMarker = '\n}\n\nfunction Heading(';
const headingIndex = source.indexOf(headingMarker, shellStart);
if (headingIndex < 0) throw new Error("LeagueApp shell end marker not found");

const shellBlock = source.slice(shellStart, headingIndex + 2);
const sectionStartNeedle = '    <section className={styles.main}>\n';
const sectionStart = shellBlock.indexOf(sectionStartNeedle);
if (sectionStart < 0) throw new Error("Main section start not found");
const sectionContentStart = sectionStart + sectionStartNeedle.length;
const sectionCloseNeedle = '\n    </section>\n';
const sectionClose = shellBlock.lastIndexOf(sectionCloseNeedle);
if (sectionClose < sectionContentStart) throw new Error("Main section close not found");
const mainCloseNeedle = '  </main>;\n}';
const mainClose = shellBlock.lastIndexOf(mainCloseNeedle);
if (mainClose < sectionClose) throw new Error("Shell close not found");

const sectionContent = shellBlock.slice(sectionContentStart, sectionClose);
const shellLevelContent = shellBlock.slice(sectionClose + sectionCloseNeedle.length, mainClose).trim();
const indent = (value, spaces) => value.split("\n").map((line) => `${" ".repeat(spaces)}${line.trimStart()}`).join("\n");
const profileMeta = 'isDemo?"Demo Guest":initialProfile.role === "ultimate_admin"?"Ultimate Admin":initialProfile.role === "admin"?"League Admin":initialProfile.username';

const replacement = `  return <AuthenticatedShellFrame
    navItems={navItems}
    activeView={view}
    isAdmin={isAdmin}
    alertsCount={alertsCount}
    mobileMenuOpen={mobileMenu}
    profileName={initialProfile.display_name}
    profileMeta={${profileMeta}}
    profileInitials={initials(initialProfile.display_name)}
    onOpenMenu={()=>setMobileMenu(true)}
    onCloseMenu={()=>setMobileMenu(false)}
    onNavigate={(id)=>{setView(id as View);setMobileMenu(false)}}
    onEasterEgg={triggerRousset}
    onSignOut={signOut}
    afterContent={<>
${indent(shellLevelContent, 6)}
    </>}
  >
${sectionContent}
  </AuthenticatedShellFrame>;
}`;

source = source.slice(0, shellStart) + replacement + source.slice(headingIndex + 2);

if (!source.includes("<AuthenticatedShellFrame")) throw new Error("Declarative shell replacement did not apply");
if (source.includes('return <main className={styles.shell}>\n    {!mobileMenu')) throw new Error("Legacy active shell remains after migration");

fs.writeFileSync(path, source);
console.log("Activated declarative LeagueApp shell.");