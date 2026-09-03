# Bounce BTTS — Visual Architecture Reference

This document is the canonical reference for visual/UI work in Bounce BTTS.

Its purpose is to prevent repeated CSS passes caused by editing the wrong layer, missing a later override, overlooking a pseudo-element, or changing a component whose visible DOM is subsequently modified by a client-side bridge.

**Rule for future visual work:** before changing a screen, identify its renderer, its base style owner, every later stylesheet that can match it, its responsive breakpoint, and any pseudo-element or DOM-injection layer listed here.

---

## 1. Current rendering architecture

The authenticated application is primarily rendered by:

- `app/LeagueApp.tsx`
- CSS module: `app/release.module.css`

The root layout then loads a sequence of global CSS override layers and client-side visual bridges.

### Root CSS import order

From `app/layout.tsx`, the current order is:

1. `app/globals.css`
2. `app/tynecastle-watermark.css`
3. `app/league-table.css`
4. `app/pre-v2-compact-restoration.css`
5. `app/public-mobile-tuning.css`
6. `app/league-stats.css`
7. `app/dashboard-fixture-rows.css`
8. `app/gameweek-recap-order.css`
9. `app/mobile-member-nav.css`
10. `app/release4-history.css`
11. `app/release4-history-champion.css`

Later global files can beat earlier declarations when specificity is equal. Several files also use `!important`, which means source order alone is not enough — selector specificity and `!important` must also be checked.

### Root visual/client bridges

Mounted globally from `app/layout.tsx`:

- `ShortRaceShareBridge`
- `EasterEggDiscovery`
- `Release4HistoryPrestige`

`Release4HistoryPrestige` is especially important for League History because it finds the rendered History DOM and inserts the Reigning Champion plaque after render.

---

## 2. Visual ownership hierarchy

When diagnosing a visual, inspect layers in this order.

### Layer A — component structure

First identify which React component creates the actual element.

For the authenticated app, most page structure is inside `LeagueApp.tsx`, with specialist components imported for individual features.

Changing CSS cannot fix a structural problem if the visible element is in the wrong parent container.

### Layer B — CSS-module base styles

Primary authenticated-app styling lives in:

- `app/release.module.css`

Examples include:

- shell/sidebar/main layout
- authenticated hero
- gameweek card
- `.content` / `.page`
- shared `.heading`
- `.panel`
- dashboard layout
- fixtures/results rows
- League History base classes such as `historyPage`, `historyHero`, `historyStatsBand`, `honourPanel`, `honourGrid`, `honourCard`, `historyTableShell`
- shared responsive rules

Because CSS-module class names compile to generated names, later global files often target them using selectors such as `[class*="historyPage"]`.

### Layer C — global/common overrides

These are loaded after `globals.css` and can change the CSS-module result.

#### `tynecastle-watermark.css`

Owns decorative Tynecastle watermark layers for league tables.

Key patterns:

- `.tablePanel .miniTable::before`
- `.largeTable::before`
- corresponding `::after` overlays

If a table has a mysterious image, tint or apparent layer, inspect this file before changing table component CSS.

#### `league-table.css`

Owns compact league-table geometry and presentation.

Key areas:

- `.publicTableCard`
- `.largeTable`
- `.largeTableRow`
- `.miniTable`
- `.miniTableRow`
- leader/header presentation

Breakpoints:

- `760px`
- `390px`

Do not try to correct league-table column sizing only in the base component/module without checking this file.

#### `pre-v2-compact-restoration.css`

Restores selected compact pre-v2 behaviours and deliberately uses `!important`.

Owns/overrides:

- `.dashboardActionGrid`
- weekly picks action buttons
- mobile authenticated hero geometry
- mobile gameweek selector/card positioning

Breakpoints:

- `650px`
- `560px`

This is a high-risk override layer because broad `[class*="hero"]` selectors are used on mobile.

#### `public-mobile-tuning.css`

Public landing/table mobile only.

Owns:

- `.publicHero`
- `.publicTableCard`
- `.publicTableHeading`
- `.publicTableActions`
- public table share-button positioning

Breakpoint:

- `760px`

It should not be used to fix authenticated member views.

#### `league-stats.css`

Specialist league-stat presentation. Check before changing league/stat cards that are also defined in the CSS module.

#### `dashboard-fixture-rows.css`

Owns the visual layout of the weekly-picks/fixture rows on the dashboard.

Key scope:

- `.weeklyPicksPanel .dashboardSnapshotRow`
- player cell
- fixture cell
- live score/minute row
- odds positioning
- result/status pill

Breakpoint:

- `650px`

This file intentionally does not own the action-button grid or combined-odds strip.

#### `gameweek-recap-order.css`

Owns recap placement/order overrides. Inspect it before changing where Gameweek Recap sits relative to dashboard sections.

#### `mobile-member-nav.css`

Owns the authenticated slide-out/navigation presentation on tablet/mobile.

Key scope:

- `main[class*="shell"] > aside`
- navigation grid
- QUICK ACCESS / MORE pseudo-content
- nav button ordering
- compact mobile nav sizing

Breakpoints:

- `900px`
- `560px`

Changing navigation order in JSX alone may not change its visual order because this file explicitly sets CSS `order` values.

### Layer D — release-specific visual override files

#### `release4-history.css`

Release 4 visual treatment for League History.

Owns or overrides:

- overall `historyPage` atmosphere
- `historyPage::before` skyline background
- `historyPage::after` St Giles circular watermark
- Bounce Legacy / `historyHero`
- History hero decorative `::before` / `::after`
- Roll of Honour trophy button
- History stats cards
- Honour panel/cards
- archive controls
- history spotlight cards
- history table shell
- historic gameweek archive

Breakpoint:

- `650px`

This file makes heavy use of `[class*="..."]` selectors and `!important`. For League History, assume this file can override the CSS-module base unless proven otherwise.

#### `release4-history-champion.css`

Release 4 Reigning Champion plaque and History-heading corrections.

Owns:

- `.release4ReigningChampion`
- champion eyebrow/name/note/trophy
- hiding the old duplicate champion stat
- History heading overrides needed by the champion treatment

Breakpoints currently include:

- `820px`
- `430px`

This file is loaded after `release4-history.css`, so for selectors of similar strength it is the final CSS layer for current League History work.

### Layer E — pseudo-elements

Before assuming a visible line/image/gap belongs to an element's normal box, inspect `::before` and `::after`.

Current notable pseudo-element visuals include:

- shared authenticated `.heading` decorative left border plus St Giles watermark
- panel watermark layers
- Tynecastle table watermarks
- League History skyline/watermark layers
- Bounce Legacy gold bottom rule
- honour-card / spotlight decorative marks
- mobile-nav section labels

A visible line can therefore be a border or a pseudo-element from a parent, not from the card beside it.

### Layer F — runtime DOM injection

`app/Release4HistoryPrestige.tsx` currently:

1. finds the rendered League History page;
2. finds its Heading child;
3. reads the champion dynamically from the existing history/stat DOM;
4. creates the Reigning Champion plaque if it is not already present;
5. appends that plaque to the heading;
6. uses a `MutationObserver` to keep the presentation synced.

Therefore the champion plaque is not visible by reading `LeagueApp.tsx` alone.

For any future visual change involving the champion plaque, inspect both:

- `Release4HistoryPrestige.tsx`
- `release4-history-champion.css`

If the requested geometry conflicts with the parent Heading layout, consider changing the injection parent rather than accumulating more CSS overrides.

---

## 3. Page-by-page visual map

### Global authenticated shell

**Renderer:** `LeagueApp.tsx`

**Base owner:** `release.module.css`

**Main selectors/concepts:**

- shell
- sidebar
- brand
- nav
- profile
- main
- hero
- gwCard / gwRow
- content
- page

**Potential later overrides:**

- `pre-v2-compact-restoration.css` for mobile hero/GW card
- `mobile-member-nav.css` for sidebar/nav below 900px

**Best edit location:**

- desktop/general shell: `release.module.css`
- mobile nav: `mobile-member-nav.css`
- compact mobile hero/GW selector: `pre-v2-compact-restoration.css`

### Shared authenticated page headings

**Renderer:** `Heading()` helper in `LeagueApp.tsx`

**Base owner:** `release.module.css`

The shared heading has its own spacing/decorative treatment and is reused across pages.

**Risk:** modifying `.heading` globally can alter every authenticated page.

**Best edit rule:** if only one page should change, scope the override through that page container instead of editing `.heading` globally.

### Dashboard

**Renderer:** `LeagueApp.tsx` Dashboard view plus specialist components

**Base owner:** `release.module.css`

**Specialist overrides:**

- `pre-v2-compact-restoration.css` — action grid / compact mobile header
- `dashboard-fixture-rows.css` — weekly-picks rows
- `gameweek-recap-order.css` — recap placement

**Best edit rule:** identify whether the request concerns dashboard structure, action controls, fixture rows, or recap order before selecting a file.

### Make My Pick / fixture picker

**Renderer:** `LeagueApp.tsx`

**Base owner:** `release.module.css`

Important classes include selection/fixture-picker rules such as:

- `selectionRow`
- `fixturePicker`
- `fixturePickerTrigger`
- `fixturePickerMenu`
- `fixturePickerSearchWrap`
- `fixturePickerResults`
- `fixturePickerOption`

**Best edit location:** `release.module.css` unless a dedicated later override is introduced.

### Fixtures

**Renderer:** `LeagueApp.tsx`

**Base owner:** `release.module.css`

Check shared row/field styles and mobile rules before changing geometry.

### League Table

**Renderer:** `LeagueApp.tsx`, table components such as `CanonicalLeagueTable.tsx`, and public equivalent where relevant.

**Base owner:** component/module styles plus `release.module.css` depending on view.

**Major visual override:** `league-table.css`

**Decorative layer:** `tynecastle-watermark.css`

**Best edit rule:** table dimensions/header/row styling usually belong in `league-table.css`; watermark art belongs in `tynecastle-watermark.css`.

### Results

**Renderer:** `LeagueApp.tsx`

**Base owner:** `release.module.css`

Important shared selector:

- `resultRow`

Inspect responsive rules in the CSS module before introducing a new global override.

### League History

**Renderer:** `LeagueApp.tsx`

**Base owner:** `release.module.css`

**Release 4 visual owner:** `release4-history.css`

**Champion owner:**

- `Release4HistoryPrestige.tsx`
- `release4-history-champion.css`

Key structure:

1. shared Heading — League History title/subtitle
2. runtime Reigning Champion plaque currently attached to Heading
3. `historyHero` — Bounce Legacy
4. `historyStatsBand`
5. Roll of Honour / honour panel
6. archive controls
7. current/archive season presentation
8. history tables/gameweek archive

**Known high-risk layers:**

- shared Heading decoration from `release.module.css`
- `historyPage::before` and `historyPage::after`
- `historyHero::before` / `historyHero::after`
- Release 4 global `[class*="..."]` rules
- champion runtime insertion

**Best edit procedure:** never alter League History by screenshot alone. Inspect the target's parent plus all matching rules in the CSS module, `release4-history.css`, and `release4-history-champion.css` first.

### Players

**Renderer:** `LeagueApp.tsx` plus profile/avatar components where used.

**Base owner:** `release.module.css` and specialist component CSS where applicable.

Profile portrait behaviour is functional/data-driven; visual edits should not alter storage/resolution logic.

### About

**Renderer:** `LeagueApp.tsx`

**Base owner:** `release.module.css`

Key area: about tabs / sections.

### Alerts

**Renderer:** `LeagueApp.tsx`

**Base owner:** `release.module.css`

Key area: alert rows and status styling.

### Admin

**Renderer:** `LeagueApp.tsx` plus `app/admin-controls/*` and specialist admin portals.

**Base owner:** `release.module.css` plus component-specific styles where present.

Admin visual changes require care because rows/forms commonly share generic selectors such as `.row`, `.field`, `.buttonRow`, `.formGrid`.

### Public landing / public league table

**Renderer:** `PublicLeagueTable.tsx` and page-level public rendering.

**Base owner:** `PublicLeagueTable.module.css` plus global public styles.

**Later mobile owner:** `public-mobile-tuning.css`

**Table owner:** `league-table.css`

Do not use authenticated `release.module.css` as the first choice for public-only fixes.

---

## 4. Current breakpoint map

Breakpoints are not fully centralised. This is one reason tablet/mobile edits can appear inconsistent.

Known active breakpoints include:

- `900px` — mobile member nav / some broader responsive layouts
- `820px` — Release 4 champion/History heading tablet stacking
- `760px` — public mobile/table layouts
- `720px` — table watermark/table-era responsive rules in older layers
- `650px` — core authenticated mobile layout, dashboard fixture rows, History Release 4 mobile treatment
- `560px` — compact authenticated hero/GW control, narrow nav
- `430px` — champion plaque narrow-phone treatment
- `390px` — narrow league-table columns

### Breakpoint rule for future edits

Before adding a new breakpoint:

1. check whether an existing breakpoint already controls the same component;
2. verify iPad portrait widths, not only iPhone widths;
3. avoid creating near-duplicate breakpoints for the same visual unless there is a documented reason;
4. add any new breakpoint to this list.

---

## 5. Specificity and override hazards

### Broad generated-class matching

Patterns such as:

```css
[class*="historyPage"]
[class*="heading"]
[class*="hero"]
[class*="playerCell"]
```

are used because CSS-module names are hashed.

They are powerful but can match more than intended. Always scope them through the narrowest stable parent possible.

### `!important`

Several restoration/mobile/Release-specific files use `!important`.

If a change in `release.module.css` appears to do nothing, search the later global files for a matching `!important` rule before adding another one.

### Flex/grid parent geometry

A child set to `width:100%` is still constrained by the geometry of its flex/grid parent.

Before changing child width, inspect:

- parent display mode
- grid template columns
- flex basis/grow/shrink
- parent padding/borders
- sibling width
- `align-items` / `align-self`

The Reigning Champion plaque issue is the reference example: the apparent card-width problem was strongly influenced by the shared Heading parent and its decoration/layout.

### Hidden space

When a gap appears, inspect all of:

- parent `gap`
- child `margin`
- parent `margin-bottom`
- padding
- pseudo-elements
- absolutely positioned elements
- hidden elements that remain in flow

Do not assume the nearest visible card owns the whitespace.

---

## 6. Visual asset map

Frequently used identity assets include:

- `/assets/hearts-crest.png`
- `/assets/st-giles-round.jpg`
- `/assets/st-giles-heart.jpg`
- `/assets/edinburgh-skyline.jpg`
- `/assets/tynecastle-building-watermark.png`
- `/assets/bounce-cup.png`

### Asset edit rule

Before changing opacity/position of an image visible on screen, search for both:

- direct `<img>` / component usage;
- CSS `background` usage, including `::before` / `::after`.

A single asset may be present in multiple visual layers simultaneously.

---

## 7. Mandatory workflow for future visual changes

For every visual request, follow this sequence before writing CSS.

### Step 1 — identify the visible element

Record:

- page/view
- visible text or class landmark
- component that renders it
- whether it is normal React DOM or runtime-injected DOM

### Step 2 — identify the parent geometry

Inspect at least one parent level above the target.

For width/alignment/spacing problems, inspect up to the nearest page/container boundary.

### Step 3 — build the cascade list

List every stylesheet loaded after the base style that can match the target or parent.

Check:

- specificity
- source order
- `!important`
- pseudo-elements
- media query currently active

### Step 4 — choose one owner

Prefer changing the stylesheet that already owns that visual concern.

Examples:

- league table geometry -> `league-table.css`
- dashboard fixture rows -> `dashboard-fixture-rows.css`
- mobile nav -> `mobile-member-nav.css`
- Release 4 History atmosphere/cards -> `release4-history.css`
- Release 4 champion plaque -> `release4-history-champion.css`

Avoid adding a new override file for a concern that already has a clear owner.

### Step 5 — make the smallest scoped change

Do not alter a shared class such as `.heading`, `.panel`, `.hero` or `.row` globally when the request concerns only one screen.

Scope through a page/feature parent.

### Step 6 — verify deployment SHA before judging the UI

Before concluding that a visual change failed:

1. confirm the Vercel deployment is `READY`;
2. confirm its `githubCommitSha` equals the branch head being tested;
3. confirm the branch alias points at that deployment;
4. then refresh/reload the device preview.

This avoids mistaking deployment/cache delay for a CSS failure.

### Step 7 — verify target widths

For responsive work, explicitly test the relevant bands rather than only one mobile width:

- narrow phone (~390px)
- modern iPhone portrait (~430px)
- tablet/iPad portrait (~768px)
- tablet/desktop boundary (~900px)
- desktop

### Step 8 — update this guide when architecture changes

If a new visual override file, bridge, breakpoint, shared component or major asset layer is added, update `VISUAL-ARCHITECTURE.md` in the same PR.

---

## 8. Rules for Release 4 specifically

Release 4 is a presentation/visual-identity release.

Unless the task explicitly requires behaviour changes:

- preserve scoring logic;
- preserve season/history data logic;
- preserve archive behaviour;
- preserve selection behaviour;
- preserve API/data access;
- prefer CSS/presentation components;
- keep Release 4 changes on `feat/release-4-visual-identity` / PR #60 until release approval.

For League History, current Release 4 ownership is:

- structure/data: `LeagueApp.tsx`
- base styles: `release.module.css`
- prestige/history visual layer: `release4-history.css`
- champion runtime presentation: `Release4HistoryPrestige.tsx`
- champion CSS: `release4-history-champion.css`

---

## 9. Technical debt / future consolidation opportunities

This guide documents the current system; it does not require an immediate refactor.

However, repeated visual friction is being caused by:

1. multiple global override stylesheets after the main CSS module;
2. broad `[class*="..."]` selectors;
3. `!important`-heavy restoration layers;
4. overlapping mobile breakpoints;
5. runtime DOM injection for some visual-only features;
6. shared primitives such as `.heading`, `.hero`, `.panel` carrying decorative styling and layout simultaneously.

A future visual-system cleanup could gradually move toward:

- page-level visual wrappers with stable global data attributes/classes;
- explicit design tokens for maroon/gold/surfaces/spacing/radii;
- central breakpoint variables/conventions;
- fewer broad generated-class selectors;
- fewer `!important` declarations;
- React-rendered presentation components instead of DOM mutation where practical;
- one documented owner per visual concern.

Do not undertake that refactor opportunistically during a small release fix. It should be planned as its own controlled release/workstream.

---

## 10. Quick ownership lookup

| Visual target | First file to inspect | Also inspect |
|---|---|---|
| Authenticated shell/sidebar | `release.module.css` | `mobile-member-nav.css` |
| Authenticated mobile hero/GW selector | `pre-v2-compact-restoration.css` | `release.module.css` |
| Shared page heading | `release.module.css` | page-specific later overrides |
| Dashboard action buttons | `pre-v2-compact-restoration.css` | `release.module.css` |
| Dashboard weekly-pick rows | `dashboard-fixture-rows.css` | `release.module.css` |
| Dashboard recap placement | `gameweek-recap-order.css` | renderer/component |
| Fixture picker | `release.module.css` | `LeagueApp.tsx` |
| League tables | `league-table.css` | `tynecastle-watermark.css`, component styles |
| Public mobile header/table | `public-mobile-tuning.css` | `PublicLeagueTable.module.css`, `league-table.css` |
| League History general | `release4-history.css` | `release.module.css` |
| Reigning Champion plaque | `release4-history-champion.css` | `Release4HistoryPrestige.tsx`, Heading base styles |
| Mobile member navigation | `mobile-member-nav.css` | `release.module.css` |
| St Giles/Tynecastle decorative layer | relevant CSS pseudo-element/background | asset usage elsewhere |

---

**Maintenance status:** this document describes the Release 4 branch architecture as of PR #60. Keep it updated whenever visual ownership or stylesheet order changes.
