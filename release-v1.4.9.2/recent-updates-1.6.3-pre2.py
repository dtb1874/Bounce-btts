from pathlib import Path

path = Path("app/LeagueApp.tsx")
text = path.read_text()
old = '''      <div className={`${styles.dashboardArt} mobileControlTrophy`} aria-hidden="true">
        <img src="/assets/hearts-crest.png?v=gold-crest-20260817-1945" alt=""/>
        <img src="/assets/bounce-cup.png" alt=""/>
      </div>
    </div>'''
new = '''      <div className={`${styles.dashboardArt} mobileControlTrophy`} aria-hidden="true">
        <img src="/assets/hearts-crest.png" alt=""/>
        <img src="/assets/bounce-cup.png" alt=""/>
      </div>
    </div>'''
if old not in text:
    raise SystemExit("Versioned dashboard trophy block not found")
text = text.replace(old, new, 1)
path.write_text(text)
print("Normalized generated Dashboard trophy block for v1.6.3")
