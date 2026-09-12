# Bounce BTTS 2.0 — Phase 3 implementation parity audit

Date: 10 September 2026
Branch: `v2/phase-3-visual-reset`
Parent specification: `docs/v2/FEATURE_PARITY_MATRIX.md`

This audit compares the current production 1.x product with the V2 preview implementation. It is an implementation status record, not permission to remove anything marked open. Any current 1.x capability that is not yet native in V2 remains a release blocker unless it is explicitly approved for later delivery.

Status values:

- **DONE** — implemented in V2 using the existing canonical data/rule path.
- **FUNCTIONAL BRIDGE** — production behaviour is available in V2 while the final V2 presentation is still to be redesigned.
- **OPEN** — current 1.x capability is not yet fully represented in V2 and must remain on the launch parity gate.
- **LATER** — explicitly prepared future work that is not required to duplicate current production behaviour.

## Core and shell

| Area | Status | Audit result |
| --- | --- | --- |
| Authenticated role-aware shell | DONE | Member/admin/Ultimate Admin navigation is retained in the V2 shell. |
| Global gameweek context | DONE | Manual horizontal gameweek rail drives Dashboard, pick, stats and Admin context. |
| Canonical scoring and tie-break rules | DONE | V2 consumes existing scoring/data; no V2 scoring fork. |
| Canonical fixture eligibility | DONE | Existing `gameweek-rules` functions remain authoritative. |
| Gameweek date propagation | DONE | V2 Admin updates the selected schedule through the existing gameweek API; the database propagation trigger carries opening/deadline deltas to later normal rounds. |
| Read-only Ultimate Admin emulation | DONE | Member emulation is restored and mutations are disabled while emulating. |
| Rousset Easter egg | DONE | Existing event endpoint is retained with a V2 overlay. |
| Demo-guest presentation | OPEN | Production demo perspective switching still needs a dedicated V2 treatment before release. |

## Dashboard

| Capability | Status | Audit result |
| --- | --- | --- |
| Product identity / dynamic season | DONE | Current season drives the masthead. |
| Current gameweek lifecycle | DONE | Open/locked/complete presentation is gameweek-aware. |
| Current member selection | DONE | Current fixture and state are shown. |
| League position / leader / pot / submissions | DONE | Current canonical current-season data is represented. |
| Everyone's Picks | DONE | Member portraits, fixture/competition, score, elapsed and compact state are present. |
| Live BTTS state | DONE | Live refresh is restored; once both teams score the pick can show W before full-time. |
| Injury-time display | DONE | V2 presentation normalises stoppage time to half context (`45+N`, `90+N`). |
| League table portraits | DONE | Canonical member portrait source with initials fallback. |
| Automatic live refresh | DONE | Selected live fixtures receive active polling, with a lower-frequency selected-gameweek refresh. |
| Gameweek recap | OPEN | Current production recap content/share path still needs native V2 placement. |
| League Position Race | OPEN | Existing visual/share experience still needs native V2 placement. |
| Goals Away From The Sweep | OPEN | Existing sweep tracker/share experience still needs native V2 placement. |
| Reminder missing picks / WhatsApp | OPEN | Must be migrated into V2 secondary actions/admin workflow. |
| Dashboard form-range/share controls | OPEN | Current 6/12/18 form and share experience still needs V2 placement. |
| Roll of Honour expansion / prestige | OPEN | Reigning champion identity exists conceptually, but full current interaction parity still needs final V2 placement. |

## Make My Pick

| Capability | Status | Audit result |
| --- | --- | --- |
| Eligible fixtures | FUNCTIONAL BRIDGE | Existing `EnhancedPickPage` is mounted in V2 against the selected game's canonical fixture browser. |
| Search and competition/country grouping | FUNCTIONAL BRIDGE | Existing production interaction is retained. |
| Odds | FUNCTIONAL BRIDGE | Existing selected-fixture odds presentation is retained. |
| Taken/duplicate state | FUNCTIONAL BRIDGE | Client state and database uniqueness remain in force. |
| Save/change pick | FUNCTIONAL BRIDGE | Existing prediction persistence is restored; emulation remains read-only. |
| Final V2 visual redesign | OPEN | Functionality is present but this surface still needs the common V2 visual treatment. |

## Fixtures

| Capability | Status | Audit result |
| --- | --- | --- |
| Gameweek-aware two-week browser backend | DONE | Existing v1.13.2 fixture-browser endpoint is used by the V2 gameweek context. |
| Dedicated member Fixtures screen | OPEN | Current V2 nav surface is still awaiting native presentation. |
| Search/country/competition browsing | OPEN | Must be represented on the dedicated V2 Fixtures screen. |
| Upcoming/live/FT score/status presentation | OPEN | Must be represented on the dedicated V2 Fixtures screen. |

## Results and sharing

| Capability | Status | Audit result |
| --- | --- | --- |
| Everyone's Picks result state | DONE | Dashboard covers compact current-GW pick outcomes. |
| Dedicated Results screen | OPEN | Production Results screen remains a launch parity item. |
| Combined fixtures + table view | OPEN | Must remain available in V2. |
| Combined share export | OPEN | Existing iOS/native share workflow must be carried forward. |
| Fixture/table share images | OPEN | Existing generators remain authoritative until V2-branded wrappers replace presentation only. |

## Stat Centre

| Capability | Status | Audit result |
| --- | --- | --- |
| Canonical league analytics | DONE | V2 uses `calculateLeagueStats`; no reduced V2-only stats engine. |
| League / Players / Form & Trends / Records IA | DONE | New V2 information architecture is active. |
| League strike rate / leader / goals / records | DONE | Canonical values are represented. |
| Player PPG, strike rate, streaks, goals, results, competitions and odds | DONE | Player-profile analytics are represented. |
| Creature of Habit | DONE | Present from canonical season statistics. |
| Most Picked Team drill-down | OPEN | Per-#33 member/count drill-down still needs implementation. |
| Public/authenticated canonical stats parity | OPEN | Public V2 surface still has to consume the same canonical analytics source before release. |

## Players and profiles

| Capability | Status | Audit result |
| --- | --- | --- |
| Player analytics within Stat Centre | DONE | Rich player stats are available. |
| Dedicated Players screen | OPEN | Current production member/pick-status screen still needs V2 presentation. |
| Admin portrait management | DONE | Ultimate Admin can replace/crop/remove member portraits through existing secured APIs. |
| Member self-service portrait management (#64) | OPEN | New V2 capability remains to be completed with self-only server permission. |

## League History

| Capability | Status | Audit result |
| --- | --- | --- |
| Historical data remains authoritative | DONE | No V2 historical recalculation fork has been introduced. |
| Dedicated V2 History screen | OPEN | Historical season tables and archive must be migrated. |
| Week-range historical form | OPEN | Current production functionality remains required. |
| Full weekly archive / independent collapse | OPEN | #32/current archive behaviour must be represented. |
| Roll of Honour / reigning champion | OPEN | Must be shared with Dashboard prestige treatment. |

## Admin

| Capability | Status | Audit result |
| --- | --- | --- |
| Control-centre overview | DONE | GW/submissions/fixture cover/alerts plus latest provider run. |
| Alerts | DONE | Needs-attention/resolved views, resolve/reopen, clear all and clear same fixture. |
| Gameweek status/opening/deadline | DONE | Existing secured gameweek API. |
| Eligible weekday and time/window / any-kickoff rule | DONE | Canonical admin rule fields restored. |
| Move Gameweek Date | DONE | Existing update path plus database downstream propagation trigger; preserves IDs/data. |
| One-off/midweek insertion | DONE | Existing `insert_one_off_gameweek` path. |
| Safe future gameweek removal | DONE | Existing `remove_future_gameweek` path. |
| Selection review/edit | DONE | Searchable fixture picker, taken state, staged changes, discard and Save All. |
| Manual points adjustments | DONE | Save/remove through existing adjustment API. |
| Member account editing | DONE | Name, username, password, role, active state and private mobile number. |
| Scalable member creation (#63) | DONE | Existing POST user endpoint is now exposed natively in V2 Admin. |
| Entry-fee paid tracker | DONE | Current-season membership paid state and totals are represented. |
| Credential copy / WhatsApp | DONE | Existing admin authority retained. |
| Read-only member emulation | DONE | Ultimate Admin workflow restored. |
| Admin portrait editor | DONE | JPEG/PNG/WebP input, manual zoom/focus crop, 720×900 portrait and remove. |
| Account reset to placeholder | DONE | Existing safe reset API retained. |
| Fixture quick-live refresh | DONE | Existing live-results endpoint retained. |
| Full current/next fixture + odds refresh | DONE | Existing provider-sync endpoint retained. |
| Manual fixture creation | DONE | Existing canonical server validation retained. |
| Result entry / Save FT | DONE | Existing result endpoint and canonical scoring retained. |
| Recalculate Gameweek Points | DONE | Finished selected fixtures can be rescored through the existing result path. |
| Season creation | DONE | Label, planned GW count, first fixture date and membership copy use existing season API/calendar. |
| Advanced controls safety route | DONE | Existing `/admin-controls` remains available while specialist functions are progressively made native. |

## About / release information

| Capability | Status | Audit result |
| --- | --- | --- |
| About | OPEN | Dedicated V2 surface not yet migrated. |
| Rules / instructions | OPEN | Must remain accessible. |
| Members/admin role guide | OPEN | Must remain accessible. |
| Release history | OPEN | Must remain accessible and updated for V2. |

## Public product

| Capability | Status | Audit result |
| --- | --- | --- |
| Public league table | OPEN | V2 public visual migration remains required. |
| Public canonical stats | OPEN | Must use the same canonical calculations as authenticated V2. |
| Public history | OPEN | Preserve any currently exposed historical access. |

## Later prepared work

| Capability | Status | Audit result |
| --- | --- | --- |
| End-of-season Awards / Champion Reveal (#31) | LATER | V2 should preserve a natural route/component owner but activation is a later season-end slice. |
| Secondary live-score provider / conflict handling (#42) | LATER | Backend resilience workstream remains separate from UI parity. |

## Release conclusion

The Phase 3 V2 build is **not yet feature-parity complete and must not replace production**. Admin is now functionally migrated, Make My Pick has a safe functional bridge, and the Dashboard/Stat Centre core are active. The remaining launch blockers are explicitly recorded above rather than being allowed to disappear behind cleaner mock-ups.

Before V2 can become a release candidate, every **OPEN** row that duplicates current production behaviour must either become DONE/FUNCTIONAL BRIDGE or receive explicit product approval to defer. The final comparison must use the same production data as 1.x and cover member, admin, Ultimate Admin, demo/public and iPhone/iPad layouts.
