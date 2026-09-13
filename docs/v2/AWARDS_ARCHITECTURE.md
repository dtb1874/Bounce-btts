# Bounce BTTS 2.0 — Awards architecture boundary

Date: 13 September 2026
Status: prepared architecture only; not activated
Parent product draft: GitHub issue #31

## What is banked in V2

V2 now has a stable ownership boundary for the future end-of-season Awards work without prematurely enabling season finalisation.

- Snapshot contracts live under `lib/awards/`.
- Permanent archive route ownership is reserved for `/awards/[season]`.
- Headline show route ownership is reserved for `/awards/[season]/show`.
- Season-level visibility is modelled as disabled, members-only or public.
- A per-member/per-season seen-state is part of the contract so the automatic first viewing can be separate from replay.
- Champion, final standings and normal award winners are immutable snapshot data after finalisation.
- Supporting values and art variants are stored in the snapshot so old seasons cannot drift if calculations or artwork change later.
- A deterministic finalisation key is reserved so the future End Season operation can be idempotent.
- Presentation/replay code must be read-only and must never run End Season.
- Existing canonical member portraits and the animated-share/native-share infrastructure are the intended sources for awards presentation and rendered headline-show sharing.

## Deliberately NOT activated yet

The following are intentionally deferred until the planned season-end implementation slice:

- database migrations/tables for persisted award snapshots and seen state;
- the Ultimate Admin End Season mutation;
- Awards navigation/public entry points;
- the Awards archive and autoplay show UI;
- final award-category selection and bespoke trophy artwork;
- rendered headline Awards video composition.

This prevents an unfinished season-end action appearing in a live admin area while still making its eventual ownership and data boundaries explicit.

## Finalisation contract

When implemented, End Season must:

1. be Ultimate-Admin-only with strong confirmation;
2. validate that the target season is eligible to be finalised;
3. calculate from canonical season-scoped data only;
4. persist a champion, final standings, award winners, supporting values and art variants as one immutable season snapshot;
5. append/update canonical honours from that snapshot rather than requiring manual champion editing;
6. preserve completed gameweeks, picks, results and statistics for History;
7. use a deterministic `(season, schema version)` finalisation key so retries do not create duplicate honours or awards;
8. leave the next-season setup as a separate explicit operation unless the later design intentionally makes that transactional too.

## Privacy / surprise boundary

Any private or surprise award logic remains server-side/internal until the season is finalised. Pre-season and in-season member/public UI must not advertise hidden categories or selection mechanics.

## Revisit point

The detailed schema migration, final category list, show timing, art set and video-rendering implementation are still to be locked near the agreed late-season revisit point. The V2 contracts are deliberately broad enough to support those choices without rebuilding the core app shell.
