from pathlib import Path
import re

path = Path("app/LeagueApp.tsx")
text = path.read_text()

# Ensure the actual Dashboard invocation gets seasonHistory. A previous guard could
# see seasonHistory elsewhere in the file and incorrectly skip this call site.
pattern = re.compile(r'(<Dashboard\b[^>]*?\bseasonLabel=\{seasonLabel\})(\s+)(isOpen=\{isOpen\})')
if 'Dashboard gameweek=' in text:
    updated, count = pattern.subn(r'\1 seasonHistory={seasonHistory}\2\3', text, count=1)
    if count == 0:
        # It may already be wired; verify against the Dashboard tag rather than globally.
        dashboard_start = text.find('<Dashboard')
        dashboard_end = text.find('/>', dashboard_start)
        dashboard_tag = text[dashboard_start:dashboard_end] if dashboard_start >= 0 and dashboard_end >= 0 else ''
        if 'seasonHistory={seasonHistory}' not in dashboard_tag:
            raise SystemExit("Dashboard invocation seasonHistory insertion failed")
    else:
        text = updated
else:
    raise SystemExit("Dashboard invocation not found")

path.write_text(text)
print("Wired seasonHistory into v1.6.3 Dashboard invocation")
