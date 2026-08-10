BOUNCE BTTS — COMBINED RELEASE UPDATE — 10 AUGUST 2026
======================================================

BASELINE
This update was prepared against the live production baseline identified as GitHub commit:
ce5407d13dc72c7306cac5649ee416cedb9b70d8

UPLOAD PROCESS
Your normal process does NOT change.

1. Download and unzip the release ZIP.
2. Open dtb1874/Bounce-btts in GitHub.
3. Code > Add file > Upload files.
4. Drag the CONTENTS of this extracted folder into the repository root.
5. Keep the folder paths exactly as supplied: app/... and lib/...
6. Allow GitHub to replace app/LeagueApp.tsx when prompted.
7. Commit changes. Suggested message:
   Bounce BTTS combined release 2026-08-10
8. Vercel should deploy main automatically.
9. Do not delete any other repository files.

FILES IN THIS UPDATE
- app/LeagueApp.tsx        REPLACES live file
- app/release.module.css   NEW file
- lib/scoring.ts           NEW shared scoring/display helper

WHAT THIS RELEASE ADDS
- About menu with About, Rules, role-specific Instructions and Members/Admins.
- Hidden "You've just been Roussetted" easter egg with dismiss control and reduced-motion support.
- Smaller/non-overlapping mobile gameweek header card.
- ? field-help controls on meaningful admin/pick fields.
- Alert actions: clear one, clear all of same title/type, clear all visible unresolved alerts; bulk actions require confirmation.
- Live/provisional selected-match outcome display.
- 45-second Supabase live-data refresh that does not reset unsaved Admin > Selections drafts.
- Results page: Selected Matches first, then all gameweek fixtures grouped by country + canonical competition.
- Explicit finished-selected-fixture warning when points_awarded is null.
- Recalculate Gameweek Points action by re-saving finished selected fixtures through the existing live results endpoint.
- Central client scoring/outcome helper: BTTS +3, score-nil +1, 0-0 -1.
- Tie-break preserved: points, fewest 0-0, most BTTS wins, alphabetical.
- Separate admin controls labelled Quick results refresh and Full fixture & odds refresh.
- Preserves searchable fixture selection and current country-aware competition grouping.

IMPORTANT BACKEND NOTE
The new Quick results refresh sends mode="results" to the EXISTING /api/admin/provider-sync route.
This is intentionally backward-compatible: the current live route can safely ignore an unknown mode field and still perform its existing update.
Therefore this upload will not break the live provider sync.

However, the true server-side speed optimisation (fetch ONLY scores/statuses instead of the full provider catalogue) requires changing the current server provider-sync implementation. That source could not be safely retrieved during packaging, so this ZIP does NOT replace that server route with guessed code. The button works safely against the existing route, but it may take the same time as the current sync until the backend fast-path is added.

The central authoritative write-side scoring continues to be the existing /api/admin/results endpoint. The new Recalculate action deliberately reuses that same endpoint rather than inventing a second scoring writer.

AFTER VERCEL SAYS READY — TEST IN THIS ORDER
1. Login as Ultimate Admin.
2. About page opens and all tabs work.
3. Admin > Selections: make two different selections and save.
4. Try assigning the same fixture to two players: it must be blocked.
5. Leave an unsaved selection draft on screen for more than 45 seconds: it must remain.
6. Admin > Results: save one FT score; check the table updates after refresh.
7. Press Recalculate Gameweek Points and confirm it completes.
8. Results page: confirm Selected Matches appears above All Results.
9. Alerts: test Clear this alert, then one bulk action.
10. Check mobile header on iPhone portrait.
11. Test Share weekly picks and Share table snapshot.

ROLLBACK
If the deployment behaves unexpectedly, Vercel's previous READY production deployment is still a rollback candidate. Do not delete the previous deployment.
