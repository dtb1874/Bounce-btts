BOUNCE BTTS LEAGUE — v1.4.4
================================
11 August 2026

SUPERSEDES
- v1.4.3 combined UI package
- v1.4.3.1 TypeScript hotfix

INCLUDES ALL PREVIOUS PENDING UI WORK
- Majestic League History redesign with trophy artwork
- Enhanced League Table presentation
- Searchable Admin -> Selections fixture picker on browser, iPhone and Android
- v1.4.3 TypeScript build correction

NEW FIXES IN v1.4.4
- Reigning champion corrected to Ryan (2025/26)
- League History opens on latest completed historical season
- Roll of Honour displayed newest-first
- BST/UTC-equivalent kickoff timestamps are compared by actual instant
- 14:00 UTC and 15:00 BST no longer produce false kickoff-change alerts
- Normal fixture progression to live/finished no longer produces pick alerts merely because eligibility becomes false
- Alerts page redesigned into clear mobile-first cards
- Alerts default to Needs Attention, with Resolved on a separate tab
- False historical timezone-only alerts are hidden from the UI/badge count
- Provider run information is shown in a compact readable summary
- Alert times are shown in Europe/London time

FILES TO UPLOAD
- app/LeagueApp.tsx
- app/release.module.css
- lib/api-football.ts

NO CHANGES TO
- scoring logic
- Supabase schema/database
- dependencies/package.json
- result scoring routes

UPLOAD
1. Extract this ZIP.
2. Upload the app and lib folders to the root of dtb1874/Bounce-btts.
3. Allow GitHub to replace the three existing files.
4. Commit to main.
5. Vercel deploys automatically.

The failed v1.4.3 deployment did not replace the previous working production deployment.
