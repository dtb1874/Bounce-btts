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
