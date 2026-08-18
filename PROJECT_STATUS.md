# Bounce BTTS League — Canonical Project Status

_Last updated: 18 Aug 2026_

This file is the canonical handover for the live Bounce BTTS League project. Future chats should read this first and treat the latest confirmed production state as the source of truth. Superseded debugging detail, failed builds and abandoned experiments are intentionally excluded.

## Current production

- Live app: `https://bounce-btts.vercel.app`
- GitHub repo: `dtb1874/Bounce-btts`
- Current release: **v1.6.0**
- Hosting: Vercel
- Data/auth: Supabase
- Fixture/results provider: API-Football Pro
- Primary use: mobile-first, especially iPhone/iPad, but browser/iOS/Android behaviour should remain consistent.

## Working vocabulary

- **Authenticated App** = signed-in member/admin experience.
- **Public League View** = public read-only league table/statistics experience.

Use these names consistently in future work.

## Core league rules

- One BTTS=YES fixture selection per member per gameweek.
- Duplicate picks within the league are not allowed.
- Hearts and Hibs fixtures are excluded.
- Standard fixture eligibility is UK Saturday at exactly 15:00, with configurable admin rules for exceptional gameweeks.
- Current scoring: **+3 BTTS, +1 score-nil, -1 0-0**.
- Historical seasons use **+2 BTTS, 0 score-nil, -1 0-0**.
- League-table tie-break order: **fewest 0-0 results → most wins/correct BTTS predictions → alphabetical by player name**.

## Product principles

- Protect the stability of the live league first.
- Retain existing member/admin features unless explicitly agreed otherwise.
- Mobile views should be clean, compact and easy to navigate without removing capability.
- Visual identity: maroon/gold with subtle Edinburgh/St Giles/Hearts-inspired artwork.
- If a requested change is likely to introduce fragility, maintenance burden, data risk, confusing UX, security concerns, scoring inconsistency or deployment risk, raise that **before** implementing it and recommend a safer option where possible.
- V2 is shelved for the foreseeable future. Do not revive it unless explicitly requested.

## Current major features

- Dashboard with gameweek-aware tables and actions.
- Make My Pick flow with search/filter and duplicate-pick prevention.
- Fixture management, results/scoring and admin fixture update tools.
- League table and recent form.
- Everyone's Picks and WhatsApp sharing.
- Public League View with league table and statistics.
- Player Stats and League Stats in both Authenticated App and Public League View.
- League History with historical scoring corrections and selectable gameweek ranges.
- Admin Users management, including Ultimate Admin self-name editing and visible/manual password management.
- Admin-only Rousset Easter-egg press counter.
- Logout returns users to the Public League View.
- Odds display, combined odds and admin odds refresh/check tooling.

## Current statistics behaviour

### League stats
- League Strike Rate
- Form/BTTS leader
- Goal Magnet
- BTTS King
- Home-Win Hunter
- Away-Win Hunter
- Draw Magnet
- Biggest Odds Winner
- Longest BTTS Streak
- Longest Winless Run
- Value Leader based on theoretical £1-per-priced-pick ROI with a minimum of 5 priced completed picks
- **Most Picked Team** across all current-season league selections

### Player stats
- Strike Rate
- Points per Pick
- Current BTTS Streak
- Best BTTS Streak
- Total Goals
- Average Goals per Pick
- Result Split
- Most Picked Competition
- Average Selected Odds
- Average Winning Odds
- Biggest Winning Odds
- Longest Winless Run
- **Most Picked Team**

### Most Picked Team rule
- A team counts whenever it appears as either home or away team in a selected fixture.
- A team must appear in at least **2 picks** before it is treated as a meaningful repeat tendency.
- Player card shows the player's repeated most-picked team(s).
- League Stats shows the league-wide repeated most-picked team(s).
- Ties show all joint leaders alphabetically.
- If every team has only appeared once, show **No repeat team yet**.

## Tie handling for statistics

Where a league statistic has multiple equal leaders, display all joint holders alphabetically rather than arbitrarily choosing one. Pluralise the label where appropriate.

## Release process

Use Semantic Versioning from v1.5.0 onward:

- **PATCH** `x.y.z → x.y.(z+1)` for bug fixes, tidy-ups, redirects, wording and small behavioural corrections.
- **MINOR** `x.y.z → x.(y+1).0` for genuinely new user/admin-facing capability.
- **MAJOR** `x.y.z → (x+1).0.0` for a substantial rebuild or breaking architectural/product change.

A Git commit is not automatically a release. Failed/cancelled builds do not receive release versions.

A production update is not complete until this sequence is finished:

1. Change implemented.
2. Build/type-check completed successfully.
3. Version bump decision made.
4. Release History updated.
5. Displayed/package version aligned.
6. Production deployment completes.
7. Vercel deployment verified **READY**.
8. This `PROJECT_STATUS.md` file updated if the release changes durable project state, rules, architecture, features, risks, conventions or deferred work.

## Current release

### v1.6.0 — 18 Aug 2026

Added Most Picked Team statistics for both players and the league, visible in both the Authenticated App and Public League View. Repeat-team trends require at least two appearances, with joint leaders supported.

### v1.5.0 — 18 Aug 2026

Consolidated expanded current-season statistics, joint-holder handling, Value Leader ROI logic, historical gameweek tools/scoring fixes, odds tooling, Admin Users improvements, Rousset tracking, logout behaviour and formal release/versioning discipline.

Older 1.4.x patch-heavy history remains available in the in-app Release History and Git history rather than being duplicated here.

## Known technical debt / risk

- The production build still relies on a chain of Python patch scripts that transform source before `next build`.
- This is consciously retained during the live season for stability, but it creates patch-order/anchor drift risk.
- When adding a new patch script, explicitly add it to the production build chain and verify its log output in Vercel.
- Do not casually refactor the patch architecture during the live season unless the risk/reward is clearly justified.
- Known harmless CSS warning: autoprefixer warning in `PublicLeagueTable.module.css` about `end` vs `flex-end`; builds compile successfully.

## Deferred / intentionally not implemented

- Conventional behavioural analytics package.
- Cross-season/all-time advanced analytics where historical fixture/odds data is incomplete.
- V2 rebuild.

## Historical data caution

Historical fixture names, scores and odds are incomplete/unavailable for some archived seasons. Never invent missing historical data.

## Handover rule for future chats

At the start of a new Bounce BTTS League chat, read this file first. Then verify any time-sensitive production fact that matters (current repo state, deployment status, package/build chain, or live version) directly from GitHub/Vercel before making changes.

For active development, **latest confirmed production state wins over old chat history or old uploaded packages**.
