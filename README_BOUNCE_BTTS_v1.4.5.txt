BOUNCE BTTS LEAGUE — v1.4.5
================================
11 August 2026

BASELINE
- Built directly on current GitHub main v1.4.4 (commit 5a3ceb7cc460a726f5f73fe6c9fe1b47ec4766de)
- Supersedes the separate v1.4.4.1 fixture-heading alignment patch

CHANGES
- Standardises collapsible fixture headings across the app.
- Country and competition labels stay immediately beside their chevrons.
- Day-level fixture counts remain right-aligned.
- Make My Pick uses the same aligned country/competition hierarchy.
- Fixtures uses the same aligned day/country/competition hierarchy.
- Results now has a collapsible Selected Matches section.
- Results now groups all fixtures/results by collapsible day -> country -> competition.
- Same behaviour on desktop browser, iPhone/iOS and Android.

FILES TO UPLOAD
- app/LeagueApp.tsx
- app/release.module.css

UNCHANGED
- lib/api-football.ts and the v1.4.4 BST/alert fix
- scoring logic
- database / Supabase
- APIs
- package.json / dependencies

UPLOAD
1. Extract this ZIP.
2. Upload the app folder to the root of dtb1874/Bounce-btts.
3. Replace the two existing files.
4. Commit to main.
5. Vercel deploys automatically.
