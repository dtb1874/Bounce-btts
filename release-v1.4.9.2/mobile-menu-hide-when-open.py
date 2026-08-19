from pathlib import Path

path = Path("app/LeagueApp.tsx")
league = path.read_text()

old = '<button className={`${styles.mobileMenu} mobileDashboardMenu`} onClick={()=>setMobileMenu(true)}>☰</button>'
new = '{!mobileMenu&&<button className={`${styles.mobileMenu} mobileDashboardMenu`} onClick={()=>setMobileMenu(true)}>☰</button>}'

if new not in league:
    if old not in league:
        raise SystemExit("Mobile menu button anchor not found")
    league = league.replace(old, new, 1)

path.write_text(league)
print("Hide mobile hamburger while navigation drawer is open")
