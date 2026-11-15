# Bounce 2.0 — Awards ceremony integration framework

Source of truth: [GitHub issue #31](https://github.com/dtb1874/Bounce-btts/issues/31). Preparation only. The issue explicitly reserves final award decisions, database migrations and production build for **after Gameweek 30 of 2026/27**.

## Architecture now prepared
- Retained the existing type contracts at `lib/awards/contracts.ts`: season ID, immutable award winner/metric/art snapshots, champion, final standings, visibility, per-member seen state and finalisation identity.
- Added pure season-scoped presentation selectors and publication gates at `lib/awards/ceremony-state.ts`.
- Added `app/v2/awards/V2AwardsStage.tsx`: autoplay headline award steps, pause/play, skip to champion, replay, optional close/completion callbacks, champion finale and portrait fallback. This component **never writes league data**.
- Added `app/v2/awards/V2AwardsArchive.tsx`: reusable champion-first historical archive with all supported season awards and replay. Public viewers require published/public visibility.
- The show and archive use existing cream/maroon/gold V2 surfaces. Bespoke per-award artwork will be added after the category list is approved.

## Publication gates
- **No awards navigation link or public route is enabled in this preparation phase.**
- No new SQL migrations have been executed. No season is finalised or altered.
- Future authenticated loader must check published finalisation snapshot + season visibility. Public loader may expose only `visibility=public` archives.
- Future post-GW30 Admin action must be Ultimate Admin only; double-confirmed; idempotent and transactional, with fixed snapshots and recorded finalisation key. Never infer 'final' from the week number alone.
- Future awards seen state must persist per-member/per-season in protected storage. Don't silently use localStorage for this.
- Secret Rousset award: eligible members and League Admin only, not Ultimate Admin. Use authenticated trigger counts; first eligible discovery if counts insufficient. Never advertise the award in advance.
- Future dynamic public Awards navigation, history/honours linkage, portrait picker and native WhatsApp video export must follow issue #31; the stage component is *not* yet an MP4 renderer.

## Integration points, not active routes
1. Signed-in navigation and Dashboard (only when the selected season has a published snapshot).
2. League History season switcher -> AwardsArchive for a published season.
3. Public view/table -> published Awards archive + replay.
4. Ultimate Admin -> configure headline selection and end/finalise season.
5. Automatic one-time presentation on next navigation/refreshed app open, with replay and skip, **without interrupting active picks**.
6. Server-generated video export and native share sheet to be designed against actual device constraints.

## Acceptance before activation
- Validate past/new season scoring and award metrics against actual canonical data; no impossible +3 scoring.
- Portrait fallback, long names, missing stats, low-Rousset-usage and ties.
- Repeated finalisation safe; historical data/trophy record immutable; per-user seen survives reload and device switch.
- iPhone/iPad Safari and Chrome, landscape, reduced motion, show replay and full archive.
- Native share video MP4 or supported equivalent, not only a URL.
- Ensure no change to current production V1 or premature publication.
