# Bounce BTTS 2.0 — V1 → V2 parity audit

Date: 13 September 2026
Branch: `v2/phase-3-visual-reset`
PR: #90
Parent baseline: `docs/v2/FEATURE_PARITY_MATRIX.md`

## Status

**Current V1 product functionality is now represented in V2.**

The parity rule is functional equivalence, not pixel-for-pixel duplication. Where a proven V1 component/data path remains authoritative, V2 either consumes that canonical path directly or exposes a V2-native presentation around it. No scoring, tie-break, fixture-eligibility or history fork has been introduced.

This document does not approve production rollout. V2 still requires device/user testing and the separate cache/update rollout gate before replacing V1.

## Core / shell

- DONE — authenticated role-aware shell and global gameweek context.
- DONE — canonical scoring, tie-breaks, fixture eligibility and missed-pick handling.
- DONE — gameweek opening/deadline/date propagation and one-off round behaviour.
- DONE — Ultimate Admin read-only member emulation.
- DONE — Demo Guest member/admin perspective switch, with Admin demonstration read-only and sensitive controls hidden.
- DONE — Rousset Easter egg retained without exposing future secret-award behaviour.

## Dashboard

- DONE — current selection, gameweek lifecycle, position, leader, pot and submission state.
- DONE — Everyone's Picks, live BTTS state, stoppage-time presentation and automatic refresh.
- DONE — Gameweek Recap and share path.
- DONE — selectable 6/12/18-week recent form plus share.
- DONE — League Position Race, interactive/share export and slower ~1 second-per-GW playback.
- DONE — Goals Away From The Sweep and animated share.
- DONE — missing-pick reminder/WhatsApp action for Admin.
- DONE — combined submitted-pick BTTS odds summary.
- DONE — expandable Roll of Honour/Reigning Champion using canonical honours data.

## Make My Pick / Fixtures / Results

- DONE — canonical eligible-fixture browser, search/grouping, odds, taken state, save/change flow and duplicate protection.
- DONE — dedicated V2 Fixtures screen with gameweek alignment, authoritative dedupe, search, country/competition filters and live/FT/upcoming state.
- DONE — dedicated V2 Results screen with Everyone's Picks, scores/outcomes/points, combined league table, Weekly Picks share, Combined Results share and League Table share.

## Stat Centre

- DONE — canonical `calculateLeagueStats` remains the main analytics engine.
- DONE — League / Players / Form & Trends / Records information architecture.
- DONE — league strike rate, leaders, Goal Magnet, BTTS King, home/away-win hunter, Draw Magnet, biggest odds, streaks, winless runs, Value Leader and other season records.
- DONE — Most Picked Team member/count breakdown.
- DONE — Creature of Habit and repeat-team W/L context.
- DONE — player PPG, strike rate, streaks, goals, result split, competitions and odds.
- DONE — V1 shot-performance analytics restored natively in V2: Chance Magnet, Sharpshooter, Clinical Picker, Shot Shy, Coldest Finisher and member-level covered-fixture metrics.
- DONE — public and authenticated core statistics use the same canonical season analytics source.

## Players / identity

- DONE — member directory and standings context.
- DONE — current-gameweek pick/odds or adjustment state shown per player.
- DONE — portrait/initials identity retained where already supported.
- DONE — Admin portrait management retained.

Member self-service portrait editing (#64) remains a **new V2 capability**, not a missing V1 parity item.

## League History

- DONE — reigning champion and expandable Roll of Honour.
- DONE — completed-season final tables preserved without current-rule recalculation.
- DONE — selectable 6/12/18-week historical form windows.
- DONE — independently expandable historical weekly archive.
- DONE — current-season Gameweek Archive restored with selected fixture, score, deadline odds and awarded outcome for each recorded pick.

## Admin

- DONE — overview/control-centre health and alerts.
- DONE — gameweek status/opening/deadline, eligibility rules, date move/downstream propagation, one-off insertion and safe future removal.
- DONE — selection edit/review and manual point adjustments.
- DONE — member editing, username/name/password/role/active state, private mobile details, scalable creation, payment state and credential workflows.
- DONE — member emulation and Admin portrait editor.
- DONE — fixture live refresh, provider/odds refresh, manual fixture creation, result entry and recalculation.
- DONE — season creation and advanced safety route.
- DONE — Ultimate Admin self-edit authority retained through the same member-management path.

## About / product information

- DONE — About.
- DONE — Rules.
- DONE — member instructions.
- DONE — Member / League Admin / Ultimate Admin / Demo role guide.
- DONE — Release History retained and updated for the V2 preview.

## Public product

- DONE — V2 public League view.
- DONE — V2 public Stat Centre using canonical `loadPublicTableData` / league analytics.
- DONE — V2 public League History / Roll of Honour and preserved season tables/weekly archive.
- DONE — public League Table share retained.

## Sharing / media

- DONE — proven native/iOS sharing paths retained.
- DONE — fixture, picks, table and combined exports retained with V2 branding work already on the branch.
- DONE — form, recap, reminder, race and sweep sharing retained.
- DONE — member portrait source retained in supported shares.

## Prepared later work — not V1 parity

The following are intentionally not being described as V1 omissions:

- End-of-season Awards / Champion Reveal / public Awards archive (#31).
- member self-service portrait management (#64).
- provider-agnostic secondary live-score/conflict handling (#42).
- any additional V2-only loading/prefetch polish not present as a required V1 behaviour.

Awards architecture is already banked under `lib/awards/` and `docs/v2/AWARDS_ARCHITECTURE.md`; activation/finalisation remains a later season-end slice.

## Release conclusion

**The V1 → V2 functional parity gate is closed at implementation level.**

The next gate is validation, not feature transfer: member, Admin, Ultimate Admin, Demo and public testing across iPhone/iPad/browser; critical outputs compared with V1 using the same data; and explicit cache/update/reopen testing before any production replacement.
