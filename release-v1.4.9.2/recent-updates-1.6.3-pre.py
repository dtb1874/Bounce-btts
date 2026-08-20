from pathlib import Path
import re

league_path = Path("app/LeagueApp.tsx")
main_patch_path = Path("release-v1.4.9.2/recent-updates-1.6.3.py")
league = league_path.read_text()
patch = main_patch_path.read_text()

# The Dashboard signature has accumulated extra generated props over several
# releases. Add seasonHistory structurally rather than relying on one frozen
# full-line signature.
match = re.search(r'(function Dashboard\(\{\n\s*)([^\n]+)(\n\}:\{)', league)
if not match:
    raise SystemExit("Dashboard generated signature not found")
props_line = match.group(2)
if "seasonHistory" not in props_line:
    if "seasonLabel,isOpen" in props_line:
        props_line = props_line.replace("seasonLabel,isOpen", "seasonLabel,seasonHistory,isOpen", 1)
    elif "seasonLabel," in props_line:
        props_line = props_line.replace("seasonLabel,", "seasonLabel,seasonHistory,", 1)
    else:
        raise SystemExit("Dashboard seasonLabel prop not found")
    league = league[:match.start(2)] + props_line + league[match.end(2):]

if "  seasonHistory:SeasonHistory[];" not in league:
    typed = league.replace(
        "  seasonLabel:string;\n  isOpen:boolean;",
        "  seasonLabel:string;\n  seasonHistory:SeasonHistory[];\n  isOpen:boolean;",
        1,
    )
    if typed == league:
        raise SystemExit("Dashboard seasonHistory type anchor not found")
    league = typed

if "seasonHistory={seasonHistory}" not in league:
    invoked = league.replace(
        "entryFee={entryFee} seasonLabel={seasonLabel} isOpen={isOpen}",
        "entryFee={entryFee} seasonLabel={seasonLabel} seasonHistory={seasonHistory} isOpen={isOpen}",
        1,
    )
    if invoked == league:
        raise SystemExit("Dashboard seasonHistory invocation anchor not found")
    league = invoked

# The main patch originally contained three exact-signature mutations. They are
# now redundant because this pre-patch performs them structurally. Remove only
# that block in the ephemeral build workspace before the main patch executes.
start_marker = "league = replace_once(\n    league,\n    '  gameweek,gameweeks,profiles,fixtures,predictions,allPredictions,allAdjustments,adjustment,myFixture,standings,entryFee,seasonLabel,isOpen,role,myId,alertsCount,setView,onLiveRefresh,liveRefreshing\\n}:{',"
end_marker = "status_anchor = '''"
start = patch.find(start_marker)
end = patch.find(end_marker, start if start >= 0 else 0)
if start < 0 or end < 0:
    raise SystemExit("Main patch Dashboard exact-signature block not found")
patch = patch[:start] + "# Dashboard seasonHistory props applied structurally by recent-updates-1.6.3-pre.py\n\n" + patch[end:]

league_path.write_text(league)
main_patch_path.write_text(patch)
print("Prepared resilient v1.6.3 Dashboard honours wiring")
