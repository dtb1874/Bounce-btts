# UI Foundation Shell / Navigation Contract

Baseline for Phase 3 of issue #61. This document freezes the currently required shell/navigation behaviour before structural migration begins.

## Purpose

Move shell/navigation ownership toward declarative React structure without changing navigation behaviour, member identity, mobile drawer mechanics or device-specific layout.

## Current owners

- `app/LeagueApp.tsx` + `app/release.module.css` — authenticated shell, sidebar, main content and menu controls.
- `app/mobile-member-nav.css` — phone/tablet nav layout, visual grouping, button ordering and iPad landscape off-canvas mechanics.
- `app/MobileSidebarPortrait.tsx` — runtime member portrait/initials injection into the sidebar.
- `app/pre-v2-compact-restoration.css` — legacy responsive/layout restoration rules that may overlap shell geometry.

## Behaviour that must not change

- Navigation destinations, active state and member/admin visibility remain exactly as production.
- Closing/opening the mobile drawer must not alter the selected page.
- Desktop keeps its persistent sidebar behaviour.
- Phone/tablet keeps a dismissible off-canvas drawer and scrim.
- iPad landscape remains off-canvas rather than inheriting the desktop fixed sidebar.
- Existing menu labels and ordering remain stable until an explicit product decision changes them.
- The sidebar member portrait continues to resolve to the signed-in member with initials fallback.
- No change to authentication, role checks, profile data or `/api/member-portraits` contracts.

## Responsive contracts

### Up to 900px

- Sidebar width: `min(86vw, 330px)` (narrower override below 560px).
- Two-column navigation grid.
- Quick Access group precedes More group.
- Existing nth-child ordering remains the behavioural reference during migration.
- Portrait sits at top-right of the drawer.

### Up to 560px

- Sidebar width: `min(90vw, 318px)`.
- Portrait reduces to 66px.
- Navigation buttons retain compact sizing.

### iPad/tablet landscape

Current explicit range:

- width 901px–1366px
- landscape
- max-height 900px

Required behaviour:

- sidebar fixed and translated fully off-canvas while closed;
- open state removes the translation;
- main content has no desktop left margin;
- mobile menu trigger remains visible;
- scrim covers the viewport while open;
- drawer height uses `100dvh` and remains vertically scrollable;
- sidebar portrait and grouped two-column navigation match the mobile presentation.

## MobileSidebarPortrait runtime dependency

Current bridge behaviour:

1. Finds `main[class*="shell"] > aside` after render.
2. Fetches `/api/member-portraits` with `no-store`.
3. Matches a returned display name against the sidebar text.
4. Watches the entire document body with a `MutationObserver` and re-resolves after DOM/text changes.
5. Appends a `.mobileSidebarPortraitHost` directly into the sidebar.
6. Writes either an image or initials fallback into that host.
7. Removes the host on cleanup.

This is a temporary architecture dependency. The migration target is a declarative portrait slot receiving resolved identity data without body-wide observation or direct DOM insertion. Do not remove this bridge until the declarative replacement has equivalent identity/fallback behaviour.

## Styling hazards

- `main[class*="shell"]` and other generated-class substring selectors couple global CSS to CSS-module output.
- Navigation order currently depends on `nth-child` plus CSS `order` rather than semantic groups in JSX.
- `QUICK ACCESS`, `MORE`, `Stat Centre` and `All picks` helper labels are currently pseudo-element content.
- iPad landscape mechanics are duplicated from mobile visual rules and rely heavily on `!important`.
- The portrait host is absolutely positioned into a sidebar it does not own.

## Phase 3 migration sequence

1. Identify the exact sidebar/nav JSX and role-based button construction in `LeagueApp.tsx`.
2. Introduce semantic nav group metadata in React while preserving the current rendered order and labels.
3. Move pseudo-element-only group labels/helper labels into declarative markup.
4. Introduce an explicit portrait slot without yet removing `MobileSidebarPortrait`.
5. Verify desktop, iPhone, iPad portrait and iPad landscape in preview.
6. Only after equivalence, remove nth-child ordering and bridge-specific selectors in a separate rollback commit.
7. Remove `MobileSidebarPortrait` only after its replacement is proven for image and initials fallback.

## Current checkpoint

The preview-only shell candidate now completes steps 1–5 without changing the active `LeagueApp` renderer:

- `AuthenticatedShellFrame` owns semantic `quick` / `more` nav metadata.
- `QUICK ACCESS`, `MORE`, `Stat Centre` and `All picks` are real React content in the candidate rather than pseudo-element-only text.
- Candidate-only selectors in `ui-foundation.css` reproduce the current mobile visual ordering without `nth-child` coupling.
- `SidebarMemberPortrait` provides the explicit declarative portrait/initials slot.
- CI browser coverage checks desktop, 390×844 phone, 430×932 phone, 820×1180 iPad portrait and 1180×820 iPad landscape, including semantic group/helper visibility and role-based Admin visibility.

The next boundary is activation of this candidate inside `LeagueApp` while retaining the legacy bridge/selectors as a rollback safety net. The legacy `nth-child` rules and `MobileSidebarPortrait` bridge must not be removed in the same activation commit.

No shell implementation step may be combined with scoring, gameweek, pick, API or Supabase changes.
