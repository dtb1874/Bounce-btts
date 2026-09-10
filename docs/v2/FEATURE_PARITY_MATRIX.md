# Bounce BTTS 2.0 — Feature Parity & Integration Matrix

Status: Phase 0 baseline
Parent: #78
Phase: #79

Classification values:

- **Retain** — current capability remains functionally equivalent in V2.
- **Improve in V2** — current capability remains but gets a redesigned interaction/presentation.
- **New in V2** — approved/banked capability planned as part of V2.
- **Prepared for later** — V2 architecture/navigation reserves a natural home, but activation can occur after 2.0.
- **Intentionally deferred** — excluded only by explicit product decision; none should be inferred from absence in mock-ups.

## A. Core league behaviour

| Capability | V2 status | V2 requirement |
| --- | --- | --- |
| One BTTS=YES pick per member/gameweek | Retain | Preserve canonical selection/scoring behaviour. |
| Duplicate-pick prevention | Retain | Keep server/client protection; presentation can improve. |
| Hearts/Hibs exclusion | Retain | Keep canonical fixture eligibility rules. |
| Standard Saturday 15:00 eligibility | Retain | Keep admin-configurable rule model. |
| One-off / midweek gameweeks | Improve in V2 | Clearer Admin workflow and consequence summary. |
| Move gameweek date / downstream schedule shift | Improve in V2 | Keep current canonical scheduling behaviour; clearer Admin UX. |
| Current scoring (+3/+1/-1) | Retain | No V2-only scoring fork. |
| Historical scoring rules | Retain | Historical archive remains authoritative. |
| League tie-break order | Retain | Shared calculation/display layer. |
| Missed-pick handling | Retain | Preserve behaviour; performance refactor only if proven safe. |

## B. Navigation and shell

| Capability | V2 status | V2 requirement |
| --- | --- | --- |
| Authenticated shell | Improve in V2 | Premium shell, clearer primary/explore/admin hierarchy. |
| Mobile burger navigation | Improve in V2 | Easier scan, member identity and profile entry. |
| iPad / desktop navigation | Improve in V2 | Expand naturally; do not become a separate legacy desktop layout. |
| Role-aware navigation | Retain | Member/admin/ultimate-admin/public permissions unchanged. |
| Gameweek picker | Improve in V2 | Keep global context obvious without dominating each screen. |
| Logout/public return | Retain | Preserve current behaviour. |

## C. Dashboard

| Capability | V2 status | V2 requirement |
| --- | --- | --- |
| Current gameweek status | Improve in V2 | Hero-level lifecycle context. |
| Make/change pick action | Improve in V2 | Dominant only when relevant. |
| Submitted pick display | Improve in V2 | Premium fixture treatment, not generic card stack. |
| League position / points | Improve in V2 | Compact league snapshot band. |
| Recent form | Improve in V2 | Integrate with league snapshot rather than isolated widget. |
| Everyone's picks | Improve in V2 | Strong member/fixture relationship and live states. |
| Live fixture scores | Improve in V2 | Preserve and strengthen readability. |
| Gameweek recap | Improve in V2 | Natural complete-state continuation. |
| League Position Race | Retain / Improve in V2 | Keep access/share; integrate into secondary layer. |
| Goals Away From The Sweep | Retain / Improve in V2 | Keep access/share; integrate into secondary layer. |
| Reminder/share actions | Retain / Improve in V2 | Keep available without overwhelming primary reading flow. |
| Gameweek-aware live league interpretation (#71) | New in V2 | Own pick + member status + aggregate live state + presentation-only movement. |
| Honours/reigning champion | Improve in V2 | Shared prestige component and canonical honours data. |

## D. Make My Pick

| Capability | V2 status | V2 requirement |
| --- | --- | --- |
| Eligible fixture list | Improve in V2 | Faster scan and clearer grouping. |
| Search/filter | Improve in V2 | Useful but subordinate to selection task. |
| Country/competition context | Retain | Preserve all available filtering/browsing. |
| Odds display | Retain / Improve in V2 | Clear but not visually dominant. |
| Existing-pick state | Improve in V2 | Obvious current selection/change path. |
| Duplicate-unavailable state | Improve in V2 | Explain why a fixture cannot be selected. |
| Deadline/open/locked states | Improve in V2 | Consistent lifecycle language shared with Dashboard. |

## E. Fixtures

| Capability | V2 status | V2 requirement |
| --- | --- | --- |
| Broad two-week fixture browser | Improve in V2 | Gameweek-aware compact date/competition groups. |
| Selected gameweek alignment | Retain | Preserve v1.13.2 behaviour. |
| Search / country / competition filters | Retain / Improve in V2 | Same capability in cleaner control pattern. |
| Scores/status | Improve in V2 | Compact fixture rows with clear live/FT/upcoming states. |
| Lazy loading | Retain / Improve in V2 | Keep startup savings; session caching/prefetch where safe. |

## F. Results / picks / scoring views

| Capability | V2 status | V2 requirement |
| --- | --- | --- |
| Everyone's Picks | Improve in V2 | Member/pick/outcome hierarchy first. |
| Results and score display | Improve in V2 | Compact readable score rows. |
| Points awarded | Retain | Authoritative scoring only. |
| Combined/share exports | Retain / Improve in V2 | Same functionality through shared V2 action patterns. |
| Odds snapshots / historical accuracy | Retain | Preserve underlying data behaviour. |

## G. Stat Centre / analytics

| Capability | V2 status | V2 requirement |
| --- | --- | --- |
| League Strike Rate | Improve in V2 | Canonical shared calculation and stronger hierarchy. |
| Form/BTTS leader | Improve in V2 | Support joint holders. |
| Goal Magnet | Improve in V2 | Keep metric and supporting context. |
| BTTS King | Improve in V2 | Keep metric and supporting context. |
| Home-Win Hunter | Improve in V2 | Keep metric. |
| Away-Win Hunter | Improve in V2 | Keep metric. |
| Draw Magnet | Improve in V2 | Keep metric. |
| Biggest Odds Winner | Improve in V2 | Keep metric. |
| Longest BTTS Streak | Improve in V2 | Keep metric. |
| Longest Winless Run | Improve in V2 | Keep metric. |
| Value Leader | Improve in V2 | Preserve qualification logic. |
| Most Picked Team | Improve in V2 | Add drill-down per #33. |
| Creature of Habit (#33) | New in V2 | Canonical season-scoped calculation and W/L context. |
| Shot metrics / Chance Magnet etc. | Improve in V2 | Integrate into player/league analytical story. |
| Player Strike Rate / PPG / streaks / goals / result split / competition / odds / repeat team | Improve in V2 | Move into profile-style member analytics. |
| Public/authenticated stats parity (#34) | New in V2 / Must fix | One canonical season stats source. |
| League / Players / Form & Trends / Records structure | New in V2 | Replace flat/stat-card accumulation with coherent IA. |

## H. Players / profiles

| Capability | V2 status | V2 requirement |
| --- | --- | --- |
| Member list | Improve in V2 | Premium identity treatment and easier drill-in. |
| Member portrait + initials fallback | Retain / Improve in V2 | One canonical member identity component. |
| Player stats | Improve in V2 | Share analytical primitives with Stat Centre. |
| Member self-service portrait management (#64) | New in V2 | Shared portrait editor; self-only server-side permission. |
| Admin portrait override | Retain | Same canonical editor, broader permission. |

## I. League table / form

| Capability | V2 status | V2 requirement |
| --- | --- | --- |
| Current league table | Improve in V2 | Highly readable, responsive, premium table treatment. |
| Recent form table | Improve in V2 | Integrated navigation and consistent table language. |
| Current tie-break behaviour | Retain | Canonical logic only. |
| Public league table | Improve in V2 | Same product language and canonical data. |
| Table sharing | Retain / Improve in V2 | Keep native/share output pathways. |

## J. League History

| Capability | V2 status | V2 requirement |
| --- | --- | --- |
| Historical seasons | Improve in V2 | Prestige/editorial history experience. |
| Historical standings | Retain / Improve in V2 | Preserve seven-column semantic table where appropriate. |
| Form/week-by-week archive | Improve in V2 | Cleaner hierarchy. |
| Individual GW expansion | Retain | Preserve current detail. |
| Full weekly archive independent collapse (#32) | New in V2 | Default collapsed; closing clears expanded GW. |
| Reigning champion / Roll of Honour | Improve in V2 | Shared canonical prestige/honours component. |
| Historical scoring corrections | Retain | Never infer/recalculate missing historical data incorrectly. |

## K. Admin

| Capability | V2 status | V2 requirement |
| --- | --- | --- |
| Users | Improve in V2 | Scalable member-management flow. |
| Selections | Improve in V2 | Clearer review/edit hierarchy. |
| Fixtures | Improve in V2 | Routine fixture operations separated from advanced tools. |
| Results | Improve in V2 | Clear settlement/scoring workflow. |
| Gameweek | Improve in V2 | Routine schedule controls + advanced/one-off controls. |
| Seasons | Improve in V2 | Safe season-level operations. |
| Alerts | Improve in V2 | Actionable grouped alert/event treatment. |
| Ultimate Admin self-name editing | Retain | Preserve current permission. |
| Manual password management | Retain | Preserve existing admin authority and security behaviour. |
| Odds refresh/check tooling | Retain / Improve in V2 | Keep in appropriate fixture/admin context. |
| Fixture provider import/update tools | Retain / Improve in V2 | Clear provider state and action feedback. |
| 21-day fixture preload / 14-day health alerts | Retain | Keep canonical scheduling policy. |
| Add users beyond 12 (#63) | New in V2 | Remove fixed limit and support safe member creation. |
| Shared portrait editor (#64) | New in V2 | One editor for admin/member permissions. |
| Admin control-centre landing | New in V2 | Real actionable health/state only; no fake telemetry. |
| End Season entry point (#31) | Prepared for later | Reserve natural location; final mutation built nearer season end unless brought forward. |

## L. Sharing and media

| Capability | V2 status | V2 requirement |
| --- | --- | --- |
| WhatsApp/native share | Retain | Preserve proven iOS pathways. |
| Fixture/table/combined share images | Retain / Improve in V2 | Apply V2 branding while keeping data correct. |
| Animated race/sweep exports | Retain | Preserve timing/reliability. |
| Member portraits in shares | Retain | Canonical portrait source. |
| Reminder share | Retain / Improve in V2 | Shared action pattern. |
| Awards video/show share (#31) | Prepared for later | Architecture must not block future implementation. |

## M. Public product

| Capability | V2 status | V2 requirement |
| --- | --- | --- |
| Public League View | Improve in V2 | Same premium visual system as authenticated app. |
| Public league stats | Improve in V2 | Must use canonical #34 stats layer. |
| Public history where currently available | Retain / Improve in V2 | Use shared historical primitives. |
| Public Awards (#31) | Prepared for later | Reserve future navigation/route ownership. |

## N. Live data / resilience

| Capability | V2 status | V2 requirement |
| --- | --- | --- |
| API-Football fixture catalogue | Retain | Keep current provider integration unless separately changed. |
| Regressive live-update protection | Retain | Never weaken current protection. |
| Provider-agnostic live match state (#42) | Prepared for later / architectural requirement | V2 live UI must not depend directly on API-Football-specific representation. |
| Secondary provider conflict handling (#42) | Prepared for later | Separate backend workstream and side-by-side validation. |

## O. Performance / loading

| Capability | V2 status | V2 requirement |
| --- | --- | --- |
| Parallel independent startup reads | Retain | Do not regress startup architecture. |
| Lazy archived history | Retain / Improve in V2 | Cache within session where valid. |
| Lazy broad fixtures | Retain / Improve in V2 | Gameweek-aware and cache where valid. |
| Smooth gameweek changes | Improve in V2 | Avoid blanking loaded content unnecessarily. |
| Skeleton/loading states | New V2 standard | Match geometry, subtle use only. |
| Prefetch likely next content | New V2 standard | Only where API cost/data freshness allow. |
| Public caching/revalidation | Intentionally undecided | Evaluate during V2 performance phase, not assumed. |

## P. Prestige / season-end future

| Capability | V2 status | V2 requirement |
| --- | --- | --- |
| Reigning champion plaque | Improve in V2 | Shared prestige component. |
| Roll of Honour | Improve in V2 | Canonical dynamic history. |
| Awards archive (#31) | Prepared for later | Natural future section ownership. |
| Champion reveal/show (#31) | Prepared for later | V2 visual system should support it without redesign. |
| Le Rousset d'Or / Donkey award (#31) | Prepared for later | No premature exposure of secret award. |
| Season finalisation snapshot (#31) | Prepared for later | Must eventually be transactional/idempotent. |

## Q. Miscellaneous / product information

| Capability | V2 status | V2 requirement |
| --- | --- | --- |
| About | Retain / Improve in V2 | Keep accessible but low navigation priority. |
| Release History | Retain | Keep product history without dominating UX. |
| Rousset Easter egg | Retain | Preserve secrecy/behaviour; future season-aware award tracking prepared separately. |

## R. Explicitly prohibited accidental losses

The following must not disappear because a V2 mock-up looks cleaner without them:

- live Dashboard fixture state;
- sharing actions;
- broad fixture browsing;
- admin gameweek/fixture/result/season controls;
- gameweek picker context;
- one-off/midweek scheduling;
- schedule movement;
- historical weekly archive detail;
- player and league advanced statistics;
- portraits and initials fallback;
- public table/statistics;
- role-aware permissions;
- odds-related functionality;
- alerting/provider health protections;
- current scoring/tie-break rules.

## S. Release parity gate

Before `v2/product-redesign` can be considered a release candidate:

1. Every row above is reviewed against the implemented V2 build.
2. Any remaining `Retain`, `Improve in V2` or `New in V2` row required for launch has an implementation/test reference.
3. `Prepared for later` rows have a documented extension point or natural route/component owner.
4. Any `Intentionally deferred` row requires explicit product approval.
5. Applicable behaviours are validated as member, admin, ultimate admin and public visitor.
6. Critical league outputs are compared against the final 1.x production line using the same data.
