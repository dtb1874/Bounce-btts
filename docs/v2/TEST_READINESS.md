# Bounce BTTS 2.0 — Test Readiness

Date: 13 September 2026
Branch: `v2/phase-3-visual-reset`
PR: #90

## Status

**Authenticated V2 is a structured TEST CANDIDATE once the current branch build is green.**

This does **not** mean V2 is approved to replace production. Main/production remains untouched until the separate release-parity and rollout gates are passed.

## Ready for member testing

- authenticated V2 shell and mobile navigation;
- selected gameweek rail/context;
- Dashboard current selection, lifecycle, league snapshot, everyone's picks and live state;
- Make My Pick search/grouping, duplicate prevention and save/change flow;
- Fixtures screen with authoritative dedupe, search, country filter, competition filter and live/FT/upcoming states;
- Results / Everyone's Picks with authoritative scoring and share actions;
- Stat Centre league/player/form/records navigation and canonical analytics;
- Players directory;
- League History final tables, reigning champion and independent weekly-gameweek archive;
- About/rules;
- V2-branded fixture/table/results/recap/reminder/data/race/sweep share media.

## Ready for Admin / Ultimate Admin testing

- gameweek opening/deadline/status controls;
- move gameweek date and downstream schedule propagation;
- one-off/midweek rounds and safe future gameweek removal;
- selection review/edit;
- manual points adjustments;
- member/account management and scalable member creation;
- fees/payment state, private contact details and credential workflows;
- read-only member emulation;
- admin portrait management;
- fixture/provider controls, manual fixtures and odds refresh;
- result entry and point recalculation;
- season creation;
- alerts workflow.

## Known work that does not block the first authenticated test pass

These remain explicit release-parity items and must not silently disappear:

- demo/guest V2 presentation parity;
- public V2 visual/stat/history parity;
- member self-service portrait management;
- Most Picked Team member/count drill-down;
- final native V2 placement of some secondary Dashboard storytelling/tools such as the full recap/race/sweep/form-range experiences where production has richer placement;
- final About release-history/role-guide polish;
- full launch cache/update validation across installed/mobile browser states.

## Awards preparation

Awards/end-of-season work is **architecturally prepared but intentionally inactive** for this test pass.

- snapshot, champion, visibility and seen-state contracts are banked under `lib/awards/`;
- archive/show route ownership is reserved;
- idempotent finalisation-key ownership is reserved;
- presentation/replay is contractually read-only;
- no End Season mutation, Awards nav or public Awards route is active yet;
- no hidden/surprise award is exposed by the V2 UI.

See `docs/v2/AWARDS_ARCHITECTURE.md`.

## First test matrix

Test with real current league data on:

1. iPhone Safari;
2. iPhone Chrome;
3. iPad Safari;
4. iPad Chrome;
5. desktop/browser as a layout/control reference.

For each device, cover member and Ultimate Admin perspectives. Admin emulation should also be used to verify member layouts without mutating member data.

## Priority test journeys

1. Open V2 → Dashboard → Make/Change Pick → return Dashboard.
2. Switch gameweeks → Fixtures filters → Results → Stat Centre → History.
3. Generate fixture, combined-table and league-table share media.
4. Verify live/finished fixture status readability and points.
5. Admin: move a future gameweek date and confirm downstream schedule behaviour.
6. Admin: one-off round workflow, selections, result entry/recalculation and alerts.
7. Ultimate Admin: edit member details, create a member, portrait workflow and read-only emulation.
8. Rotate iPhone/iPad, background/reopen the tab, refresh, sign out/in and check for stale/cache/loading regressions.

## Promotion rule

Do not merge V2 toward production merely because this test pass is usable. Testing findings must be triaged, launch-parity OPEN items must be resolved or explicitly deferred, and the final mobile/cache rollout gate must pass first.
