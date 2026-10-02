# Bounce BTTS 2.0 — Test Readiness

Date: 13 September 2026
Branch: `v2/phase-3-visual-reset`
PR: #90

## Status

**V2 is now the full V1 functional-parity TEST CANDIDATE.**

All current V1 product capabilities identified by the V2 parity matrix are represented in V2. This does **not** mean V2 is approved to replace production: device/user testing and the cache/update rollout gate still have to pass. Main/production remains untouched.

## Member testing scope

- authenticated V2 shell, mobile navigation and global gameweek rail;
- Dashboard selection/lifecycle, league snapshot, Everyone's Picks, live state, recap, 6/12/18 form + share, League Position Race, Sweep tracker, combined odds and honours;
- Make My Pick search/grouping, odds, duplicate prevention and save/change flow;
- Fixtures dedupe, search, country/competition filters and live/FT/upcoming states;
- Results / Everyone's Picks, combined current table and all V1 share paths;
- Stat Centre canonical analytics, record drill-down, Creature of Habit, player analytics and shot-performance analytics;
- Players directory with current pick/adjustment state;
- League History current-season Gameweek Archive, historical form, completed-season tables, weekly archive and honours;
- About, Rules, Instructions, role guide and Release History.

## Admin / Ultimate Admin testing scope

- gameweek opening/deadline/status controls;
- move gameweek date and downstream schedule propagation;
- one-off/midweek rounds and safe future gameweek removal;
- selection review/edit and manual points adjustments;
- member/account management, scalable creation, username/name/password/role/active state;
- fees/payment state, private contact details and credential workflows;
- read-only member emulation;
- Admin portrait management;
- fixture/provider controls, manual fixtures, live refresh and odds refresh;
- result entry and point recalculation;
- season creation;
- alerts workflow and advanced safety route.

## Demo / public testing scope

- Demo Mode can switch between Member View and Admin View;
- Demo Admin is deliberately read-only and hides private credentials/contact details and mutations;
- unauthenticated V2 public product now provides League, Stat Centre and League History views;
- public core stats consume the canonical current-season analytics source;
- public table sharing remains available.

## Not V1 parity gaps

The following are separate V2/future work and do not reopen the V1 parity gate:

- member self-service portrait editing (#64), which is a new V2 capability;
- end-of-season Awards / Champion Reveal / Awards archive (#31), intentionally activated nearer season end;
- secondary-provider/conflict handling (#42), a separate resilience workstream;
- optional V2-only loading/prefetch enhancements beyond current V1 behaviour.

Awards architecture remains banked under `lib/awards/` and `docs/v2/AWARDS_ARCHITECTURE.md`; there is still no active End Season mutation or premature exposure of the secret award.

## Device matrix

Test the same journeys on:

1. iPhone Safari;
2. iPhone Chrome;
3. iPad Safari;
4. iPad Chrome;
5. desktop/browser as a layout and control reference.

Cover Member, League Admin, Ultimate Admin, Demo Member, Demo Admin and public visitor perspectives where available.

## Priority journeys

1. Open V2 → Dashboard → Make/Change Pick → return Dashboard.
2. Dashboard recap/form/race/sweep/honours → generate the relevant share outputs.
3. Switch gameweeks → Fixtures filters → Results → Stat Centre → Players → History.
4. History: current-season Gameweek Archive, historic 6/12/18 form and weekly archive expansion.
5. Stat Centre: player analytics, records/Most Picked Team drill-down and shot-performance refresh.
6. Admin: move a future gameweek and confirm downstream schedule behaviour.
7. Admin: one-off round, selections, fixture/provider tools, result/recalculation and alerts.
8. Ultimate Admin: edit own/member details, create member, payment/credentials, portrait flow and emulation.
9. Demo: switch Member/Admin perspectives and verify no mutation/private-data leakage.
10. Public: League → Stat Centre → League History → share table.
11. Rotate iPhone/iPad, background/reopen, refresh, sign out/in and deliberately repeat the cache/loading scenarios that caused the previous V2 rollback.

## Promotion rule

Do not merge V2 toward production merely because functional parity is implemented. Testing findings must be resolved, critical outputs compared with V1 using the same data, and the mobile/browser cache/update rollout gate must pass first.
