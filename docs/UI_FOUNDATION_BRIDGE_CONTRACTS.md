# UI Foundation Runtime Bridge Contracts

Baseline branch: `release/ui-foundation-architecture`.

These contracts record the behaviour that must be preserved before any runtime bridge is removed. The goal is to replace visual/structural DOM mutation with declarative ownership without accidentally changing league behaviour.

## MobileSidebarPortrait

Current owner: `app/MobileSidebarPortrait.tsx`

Current behaviour:
- mounts globally from `app/layout.tsx`;
- observes `document.body` for child/text changes;
- locates `main[class*="shell"] > aside`;
- calls `/api/member-portraits` with `cache: "no-store"`;
- infers the current member by searching the entire sidebar text for a matching `displayName`;
- creates `.mobileSidebarPortraitHost` by direct DOM insertion into the sidebar;
- renders either the member portrait or initials fallback;
- removes the inserted host on cleanup.

Responsive presentation is owned by `app/mobile-member-nav.css` at:
- `max-width: 900px`;
- `max-width: 560px`;
- iPad/tablet landscape: `901px–1366px`, landscape, max-height `900px`.

Migration target:
- `app/ui/SidebarMemberPortrait.tsx` resolves the portrait from the already-known profile name, so it no longer scans sidebar text or mutates DOM;
- mount it declaratively inside the eventual authenticated shell component;
- keep the existing CSS classes during the first switch so geometry stays unchanged;
- only remove `MobileSidebarPortrait` from `layout.tsx` after the declarative shell is active and checked on phone + iPad portrait/landscape.

Rollback condition:
- portrait missing, duplicate portrait, wrong member identity, drawer geometry shift, or extra portrait visible on desktop.

## EasterEggDiscovery

Current owner: `app/EasterEggDiscovery.tsx`

Current behaviour:
- mounts globally from `app/layout.tsx`;
- listens for document clicks in capture phase;
- recognises the sidebar Hearts crest by `aside img[src*="/assets/hearts-crest.png"]`;
- requires three taps within 2.6 seconds;
- animates the crest after each tap;
- finds the hidden sidebar button via `button[aria-label=" "]` and programmatically clicks it when the tap threshold is reached.

Migration target:
- move the triple-tap counter onto the declarative crest/button ownership in the authenticated shell;
- call the same existing easter-egg action callback rather than locating/clicking a hidden DOM node;
- preserve the hidden sidebar egg button until the new handler is proven equivalent.

Rollback condition:
- accidental triggering, inability to trigger, visible hidden control, or loss of the existing server-side discovery POST.

## Release4HistoryPrestige

Current owner: `app/Release4HistoryPrestige.tsx`

Current behaviour:
- mounts globally from `app/layout.tsx`;
- locates the history page through `[class*="historyPage"]`;
- locates the page heading, history stats band and honour grid by generated-class substring selectors;
- derives reigning champion from `historyStatsBand article:first-child strong`;
- derives champion season from `honourGrid article:first-child span`;
- creates or relocates `.release4ReigningChampion` immediately after the history heading;
- creates copy/trophy DOM nodes directly;
- continuously re-runs through a body-wide `MutationObserver`.

Migration target:
- derive champion + season from the same React data already used to render history stats/honours;
- render a dedicated reigning-champion component directly in League History JSX;
- preserve the existing `.release4ReigningChampion*` classes during the structural switch;
- remove the bridge only after the declarative plaque matches current phone/tablet/desktop presentation.

Rollback condition:
- wrong champion/season, duplicate plaque, missing trophy, plaque order change, or History layout regression.

## ShortRaceShareBridge

Current owner: `app/ShortRaceShareBridge.tsx`

Current behaviour:
- mounts globally from `app/layout.tsx`;
- wraps `navigator.share` only when native share exists;
- only transforms same-origin `/race-share?d=...` URLs;
- decodes/validates v1 race payloads;
- requires an authenticated Supabase session;
- POSTs the payload to `/api/race-share` and substitutes the returned shortened URL;
- falls back to the original share URL on any failure;
- restores the original `navigator.share` on cleanup.

Classification:
- this is behavioural infrastructure rather than a visual DOM bridge;
- do not remove it merely as part of CSS/UI cleanup.

Migration target:
- eventually move URL-shortening into the race-share action itself so global monkey-patching of `navigator.share` is unnecessary;
- treat that as a separately validated behaviour change, not part of the first shell migration.

Rollback condition:
- native sharing fails, long race URLs return, unauthenticated handling changes, or non-race shares are affected.

## Removal order

1. Activate declarative shell structure while keeping all bridges mounted.
2. Switch mobile portrait to declarative ownership; confirm no duplicate output; then remove only `MobileSidebarPortrait`.
3. Move crest triple-tap handling into shell; confirm discovery behaviour; then remove only `EasterEggDiscovery`.
4. Migrate dashboard/other pages separately.
5. Migrate League History plaque only during the History phase, then remove `Release4HistoryPrestige`.
6. Leave `ShortRaceShareBridge` until its share action can own shortening directly.

No bridge is removed in the same commit that first introduces its replacement unless rollback is trivial and automated checks cover the complete behaviour.