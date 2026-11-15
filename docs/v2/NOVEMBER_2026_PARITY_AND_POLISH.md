# Bounce 2.0 — November parity and presentation checkpoint

Date: 15 November 2026
Source branch: `v2/phase-3-visual-reset`
Work branch: `v2/phase-4-cohesion-parity`
Production baseline: `main`

## Summary

The 13 September V2 audit and test-readiness documents establish implementation-level V1 parity **as of that date**, not verified current parity. At this checkpoint, GitHub's comparison of `main` against V2 reports **21 commits on main not in V2** and 202 V2-side commits, with the branches diverged. These are commit-history counts, **not counts of missing features**. V2 remains pre-production.

## Existing V2 implementations found

- Dedicated V2 Dashboard, Make My Pick, Fixtures, Results, Stat Centre, Players, League History, About, Admin and public surfaces.
- Preserved canonical scoring, pick selection, historical records, gameweek administration, member administration, and public data paths per the September parity audit.
- Existing share/image components, odds display helper, live-minute handling and design contract.
- Separate V2 component styling is present but uses inconsistent paper, maroon and ink values between sections; many small labels are under 0.68rem, and Fixtures had non-responsive three-column inline search/filter controls.

## Post-audit production changes to reconcile (implementation must be verified, not assumed)

| Work | GitHub PR | Required V2 validation |
|---|---|---|
| Kelty Hearts eligibility / narrow exclusion | #91 | Confirm canonical team-exclusion logic matches live and historical picks remain intact |
| Single-tap Rousset discovery | #92 | Check crest click and role-specific behaviour in V2 shell |
| Invalid zero-shot stats and analytics cleaning | #93 | Confirm V2 shot analytics exclude invalid coverage and respect corrected data |
| Consistent fractional-odds presentation | #94 / #95 | Confirm all V2 on-screen and share/export paths use one formatter |
| Live-minute display stability | #96 / #97 | Verify V2 initial/live/phase-change refresh transitions |
| UK competition and knockout-round controls | #98 / #99 | Confirm V2 admin selector, import restrictions, round-level UI and deployed schema/migrations before enabling |
| Automatic fixture odds checks | #100 / #101 / #102 | Confirm latest approved select/load workflow, **not** older refresh-before-share implementation, in V2 |
| Sweep tracker after GW5, plus average | #103 | V2 must use selected fixture rows across all gameweeks, and show correct mean goals away |

**Important:** Historical PR descriptions can represent superseded designs, particularly odds refresh. Compare effective production code, latest merges, application behaviour and actual provider/DB integration before porting. Do not blindly cherry-pick old PRs.

## Visual direction and changes started in this branch

- Calm the palette to consistent warm paper, oxblood and controlled gold, preserving Edinburgh motifs as subtle atmosphere.
- Raise microscopic text in shared member, analytics, editorial and admin CSS modules to a readable floor while avoiding major structural replacement.
- Add consistent keyboard focus, button/control motion and reduced-motion behaviour.
- Make Fixtures search/filter input responsive: full-width search, two filters beneath on phones, and comfortable 44px targets.
- Keep genuinely important cards and imagery; prefer ruled lists, open space and consistent headings instead of decorative stacking.

## Remaining release gates — deliberately NOT claimed done

1. Reconcile all `main`-only commits against the active V2 branch, including any production hotfixes.
2. Validate live Supabase auth, roles, RLS, scores, picks, alerts, snapshots, photo storage and API-Football/odds integration in an authorised staging setup; avoid production writes.
3. Confirm admin league/round selectors, import behaviour and matching migrations already exist in the target environment, without changing eligibility defaults for active/future rounds.
4. Run typecheck/build/guardrails, Vercel preview inspection and smoke tests across authenticated member/admin/demo/public journeys.
5. Perform visual QA at phone, iPad portrait/landscape and desktop sizes, including legibility/overflow/contrast and reduced-motion behaviour.
6. Reproduce cache/update/browser-reopen recovery scenarios that caused the previous V2 rollback.
7. Only after these checks, schedule a separate production release/rollback plan; never merge this branch straight into `main`.

## Prioritisation

**P0 functional correctness:** sweep, new odds load/selection refresh, competitions and knockout rounds, latest score/live-minute handling, stat integrity, correct member roles and secure admin actions.

**P1 consistent experience:** one page structure, consistent headings/controls/colour, content-first Dashboard, clean member routes and readable dense ledgers.

**P2 final finish:** carefully chosen Edinburgh assets, polished transitions, empty/loading states, share visuals and responsive refinements.

## Boundaries

This branch changes V2-only presentation and tracking documentation. It does not mutate production data, alter canonical scoring or merge `main`. Treat the September parity audit as historical evidence, not present-day signoff.

## Phase 4 implementation progress — 15 November 2026

The work branch has now implemented the following **without merging to main**:

- Backported the canonical production UK competition + cup-round source, admin API, import eligibility and manual fixture restrictions.
- Connected the selector to V2 Admin Fixtures and added an optional manual fixture round field; refreshed selector styling to follow V2's ledger system.
- Committed existing production migration definitions into V2. **No SQL migration was executed** by this development phase.
- Synced the canonical team eligibility fix (Kelty Hearts) and shot-stat validity safeguards; added plausible-shot filtering to V2's Value Leader portal.
- Retained production single-tap Easter egg discovery behaviour for legacy/shell compatibility.
- Implemented non-blocking selected BTTS odds checks on V2 entry and after pick save, with authentication and current saved-price preservation.
- Re-scoped V2 initial fixture loading: full current round plus each member's historical selected fixtures, rather than an arbitrarily truncated season-wide catalogue. Selected gameweek hydration now runs on switch.
- Ensured fixtures selected from the browser remain visible immediately in Results/Live, even when the fixture is not assigned a gameweek at the database level.
- Added average goals away from the sweep to the native V2 tracker and video share.
- Harmonised type, accessible focus, mobile filters, colour and architectural backgrounds across V2 Dashboard, Admin, Stat Centre and member surfaces.
- Added `tests/v2-parity-contract.test.mjs` and extended the V2 guardrail workflow to protect the current Phase 4 PR.

### Read-only Supabase verification

- UK competition and round settings tables exist, with `fixture_round` in fixtures. Migration history records the October competition migrations.
- As checked, there are zero competition and zero round override records (therefore no disabled selections from those tables); defaults remain unchanged.
- For current season GWs 1–15, each has eight recorded picks, eight matching fixtures and eight settled fixtures.
- The goals-away totals for GWs 1–15 are `5,3,3,3,3,5,3,3,7,4,3,2,3,3,2`, giving an overall average `52 / 15 = 3.47` (display 3.5).

These are database **read-only checks**, not authenticated end-to-end tests.

### Remaining verification, not sign-off

- The latest deployment and guardrail CI must finish successfully for the final commit, not just earlier intermediate builds.
- Authenticated Member, Admin, Ultimate Admin, Demo and public flows remain to be exercised in a real browser with access to their respective user contexts.
- Visual screenshots at iPhone, iPad portrait/landscape and desktop sizes must be reviewed, including typography, decorative contrast and share exports.
- Pick saving, admin fixture/competition changes, provider refresh, archive and history must be checked in **staging**. Do not toggle production competitions or mutate production picks for testing.
- The browser-cache/reopen/upgrade regression that previously forced a V2 rollback must pass before any release.
- A production promotion decision requires explicit approval and a documented rollback path.

**Status: strong code-level parity improvements implemented; final like-for-like release validation still open.**

## Phase 5 — Light visual system, navigation placement and awards preparation (15 Nov 2026)

- The V2 shell owns one compact gameweek picker in the mobile top utility row and the desktop header, rather than an overlapping sticky per-page rail.
- The mobile drawer has a continuous lightly faded St Giles image background; removed the finite-size decorative pseudo-image and cleared inherited Easter-egg backgrounds that could appear as rectangular overlays.
- Navigation, bottom bar, mobile header, dashboard hero/selected fixture/table, Admin states/tabs, Stat Centre tabs and editorial footers now use the warm paper base with maroon accents.
- The existing awards season snapshot types were retained and extended with pure ceremony sequence/publication helpers, a gated V2 awards show and a gated season archive. No public route, automatic trigger, schema mutation or season-finalisation action is active. See `docs/v2/AWARDS_CEREMONY_FRAMEWORK.md` and issue #31 (post-GW30).
- The V2 preview login now retains `/v2-preview` using a strictly allowlisted `next` destination. Previously, login redirected to `/` and could put the tester in the legacy compatibility app instead of V2 — a likely source of mixed-theme screenshots.
- Regression guards cover gameweek placement, drawer reset, awards disabled-by-default, and login returning to V2.
- Validate these in the current branch's CI, Vercel preview and authenticated device QA before any release.
