# UI Foundation Architecture Inventory

Inventory baseline: production `main` at `5c3d4be4d301d5d97e28478460cfc7fddf7d9ecf`.

This is the starting map for issue #61. It records where presentation is currently owned, where later layers can override earlier ones, and which areas require slow migration rather than deletion-first cleanup.

## 1. Current authenticated-app centre of gravity

- Primary authenticated renderer: `app/LeagueApp.tsx` (currently very large and responsible for many page surfaces).
- Primary authenticated style owner: `app/release.module.css`.
- Specialist components already exist for tables, sharing, recap/history features, pick presentation and selected statistics.
- The migration should extract page/presentation ownership gradually; `LeagueApp.tsx` must not be replaced in one pass.

## 2. Global stylesheet load order

`app/layout.tsx` currently imports, in order:

1. `globals.css`
2. `ui-foundation.css` — additive shared tokens/primitives only; no migrated page owns this layer yet
3. `tynecastle-watermark.css`
4. `league-table.css`
5. `pre-v2-compact-restoration.css`
6. `public-mobile-tuning.css`
7. `league-stats.css`
8. `dashboard-fixture-rows.css`
9. `gameweek-recap-order.css`
10. `mobile-member-nav.css`
11. `release4-history.css`
12. `release4-history-champion.css`
13. `release4-admin-users-tidy.css`

This is the principal override stack to unwind. Later files can beat earlier rules by source order; broad generated-class selectors and `!important` rules mean specificity must also be audited before removal.

## 3. Globally mounted visual/behaviour bridges

`app/layout.tsx` mounts these before page content:

- `ShortRaceShareBridge`
- `MobileSidebarPortrait`
- `EasterEggDiscovery`
- `Release4HistoryPrestige`

These are high-priority architecture dependencies because a component-only inspection can miss their output or DOM effects.

### Known bridge risk

`Release4HistoryPrestige` is documented as locating League History after render and attaching/synchronising the reigning-champion presentation. It should eventually become declarative React structure, but only after exact output, data source and responsive geometry are contract-tested.

`MobileSidebarPortrait` and `ShortRaceShareBridge` also need behavioural inventories before any structural migration: document target selectors, event listeners, DOM assumptions, responsive conditions and fallback behaviour first.

## 4. Page ownership map and proposed migration order

### Shell/navigation

Current owner: `LeagueApp.tsx` + `release.module.css`.
Later owners: `mobile-member-nav.css`, `pre-v2-compact-restoration.css`, plus `MobileSidebarPortrait`.

Risk: high. Navigation order/visibility can be controlled outside JSX at responsive breakpoints.

Migration target: declarative shell/nav components with explicit mobile/tablet layout ownership and no hidden CSS ordering dependency.

### Dashboard

Current owner: `LeagueApp.tsx` + `release.module.css`.
Specialist layers: `dashboard-fixture-rows.css`, `gameweek-recap-order.css`, `pre-v2-compact-restoration.css`, recap components/portals.

Risk: high. Structure, row presentation and recap order currently have different owners.

Migration target: split dashboard shell, action area, fixture snapshot rows and recap region into stable presentation components without changing data selection or interactions.

### Make My Pick / fixture selection

Current owner: mostly `LeagueApp.tsx` + `release.module.css`, with `EnhancedPickPage.tsx` / `EnhancedPickPage.module.css` present as specialist code.

Risk: very high because selection UI is directly tied to critical league behaviour.

Migration target: presentation extraction only after submission/locking/fixture-eligibility behaviour has explicit regression coverage.

### League table / results

Current owners: `CanonicalLeagueTable.tsx`, `LeagueApp.tsx`, module styles, `league-table.css`, `tynecastle-watermark.css`.

Risk: medium-high. Geometry and decoration have separate owners and public/authenticated surfaces overlap.

Migration target: one table primitive with explicit variants, with decorative watermark ownership separated from table semantics.

### League History

Current owners: `LeagueApp.tsx`, `release.module.css`, `release4-history.css`, `release4-history-champion.css`, `Release4HistoryPrestige`.

Risk: very high. Release 4 intentionally accumulated scoped overrides plus runtime champion insertion.

Migration target: preserve the current prestige appearance first, then move structure into declarative components and consolidate styles only after screenshot/device comparison.

### Players/profile presentation

Current owner: `LeagueApp.tsx` plus specialist profile/avatar components and module styles.

Risk: medium. Presentation must not alter portrait storage/resolution or profile permissions.

### Admin

Current owner: `LeagueApp.tsx`, `app/admin-controls/*`, specialist admin portals, `release.module.css`, `release4-admin-users-tidy.css`.

Risk: very high because generic form/row selectors can affect functional controls and role-specific surfaces.

Migration target: admin primitives only after member/admin role validation exists for the changed panel.

### Public landing/table

Current owners: public components/module CSS plus `public-mobile-tuning.css`, `league-table.css`.

Risk: medium. Must remain isolated from authenticated styling.

## 5. Responsive ownership inventory

Known active breakpoint families from the visual architecture reference:

- 900px — authenticated mobile/tablet navigation.
- 820px — Release 4 History/champion tablet layout.
- 760px — public mobile/table layouts.
- 720px — older table/watermark responsive rules.
- 650px — core authenticated mobile, dashboard rows and Release 4 History.
- 560px — compact authenticated hero/gameweek control and narrow nav.
- 430px — champion plaque narrow-phone treatment.
- 390px — narrow league-table columns.

Target: centralise breakpoint intent, not necessarily force every component onto identical numeric breakpoints. A new breakpoint requires an ownership note.

## 6. Architecture hazards to track during every phase

- Broad selectors matching CSS-module generated class fragments, especially `[class*="..."]`.
- `!important` in restoration/release-specific layers.
- Pseudo-elements providing visible lines, watermarks, labels or artwork.
- CSS `order` overriding JSX order.
- Runtime DOM injection/MutationObserver behaviour.
- Global CSS affecting both authenticated and public surfaces.
- Parent grid/flex geometry that makes child-level fixes misleading.
- Hidden elements or pseudo-elements retaining layout space.
- Portal targets that depend on visible text or DOM structure.
- Breakpoint duplication with slightly different widths.

## 7. First implementation boundary

Phase 1 is documentation/inventory only and is itself the first rollback point.

Phase 2 now establishes an additive foundation layer:

- `app/ui-foundation.css` contains aliases for the existing background, surface, maroon, border, text and success colours rather than replacing their current values;
- shared spacing, radius, shadow and display-font tokens are available for later migrations;
- `.uiSurface` and `.uiSectionHeading` are opt-in, non-interactive primitives matching existing panel/heading geometry;
- `app/layout.tsx` loads the foundation immediately after `globals.css`, before all legacy/specialist layers;
- no existing page selector has been converted to the new primitives yet, so the rollback boundary remains behaviour- and layout-neutral.

The next phase is shell/navigation. Before changing its JSX or CSS, inventory `MobileSidebarPortrait`, responsive nav ownership and the relevant `LeagueApp.tsx`/`release.module.css` selectors so the desktop, phone, iPad portrait and iPad landscape contracts are explicit.

## 8. Required inventory before deleting a bridge or override

For each candidate file/component record:

- renderer/target DOM;
- selectors queried or matched;
- event listeners and observers;
- pseudo-elements;
- breakpoints;
- role/page scope;
- data read/written;
- existing automated coverage;
- replacement owner;
- rollback commit.

No legacy layer should be removed merely because its visible effect appears duplicated.
