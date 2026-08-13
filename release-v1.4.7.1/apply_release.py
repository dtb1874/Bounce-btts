from pathlib import Path
p=Path("app/LeagueApp.tsx")
s=p.read_text()
s=s.replace('const RELEASE_VERSION = "1.4.7";','const RELEASE_VERSION = "1.4.7.1";')
s=s.replace('const emulatedProfile = emulatedProfileId ? profiles.find(p=>p.id===emulatedProfileId) ?? null : null;','const emulatedProfile = emulatedProfileId ? initialProfiles.find(p=>p.active&&p.id===emulatedProfileId) ?? null : null;')
anchor='    <section className={styles.main}>\n      <header className={styles.hero}>'
replacement='    <section className={styles.main}>\n      {emulatedProfileId&&<div className={styles.notice} style={{margin:"10px 14px 0",display:"flex",gap:12,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",borderColor:"rgba(240,207,170,.55)",background:"rgba(116,32,52,.92)"}}><span><strong>EMULATION ACTIVE</strong><br/><small>Viewing as {emulatedProfile?.display_name??"qnother user"} · read-only</small></span><button className={styles.primary} type="button" onClick={()=>{setEmulatedProfileId(null);setView("admin");setAdminView("users");setMobileMenu(false)}}>Exit emulation</button></div>}\n      <header className={styles.hero}>'
assert anchor in s
s=s.replace(anchor,replacement,1)
marker='changes:['
start=s.find(marker,s.find('function ReleaseHistory'))
assert start>=0
start+=len(marker)
s=s[:start]+'"Ultimate Admin emulation now has a persistent Exit emulation control and correctly resolves Demo Guest profiles",'+s[start:]
p.write_text(s)
