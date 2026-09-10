# Bounce BTTS 2.0 — Visual Architecture

Status: Phase 1 architecture map
Programme: #78
Design system/shell: #80

This document describes the V2 visual ownership model. It supplements the historical root `VISUAL-ARCHITECTURE.md`, which remains useful when carrying 1.x fixes forward but must not be treated as the target architecture for new V2 presentation.

## 1. Ownership rule

Every V2 surface must have one clear structural owner and one clear styling owner. New V2 work must not reintroduce runtime DOM mutation, broad generated-class substring selectors, or one-off global override files merely to win specificity.

If a visual change requires a new override layer, stop and determine whether the owning component or shared V2 primitive should be changed instead.

## 2. Current V2 ownership

### Authenticated application shell

**Structure:** `app/ui/AuthenticatedShellFrame.tsx`

**Canonical navigation data:** `app/ui/navigation.ts`

**Shared tokens:** `app/ui-foundation.css`

**Responsive shell styling:** `app/ui-foundation-shell-responsive.css`

Stable semantic hooks include:

- `uiFoundationShell`
- `uiFoundationSidebar`
- `uiFoundationSidebarOpen`
- `uiFoundationMobileMenu`
- `uiFoundationScrim`
- `uiFoundationMain`
- `uiFoundationNav`
- `uiFoundationNavItem-*`

V2-specific semantic hooks use the `v2*` prefix. These are explicit class names, not CSS-module hash fragments.

### Member portrait in shell

**Structure/data display:** `app/ui/SidebarMemberPortrait.tsx`

The shell may position/style the portrait, but portrait fetching and fallback remain owned by the portrait component until #64 establishes the shared canonical profile editor/source.

### Page surfaces during migration

Until each V2 phase migrates a page, the page's existing renderer and UI Foundation styles remain authoritative inside `v2Main`. The shell must not reach into page internals with generic descendant overrides to make legacy pages look V2-complete.

That separation is deliberate: each page will be migrated with an explicit boundary and parity check.

## 3. V2 shared design system

`app/ui-foundation.css` owns only product-wide presentation tokens/primitives:

- colour;
- typography aliases;
- spacing;
- radii;
- motion durations/easing;
- surface/border values;
- shell sizing;
- reduced-motion baseline.

It must not contain page-specific Dashboard, Stat Centre or Admin layout rules.

### Card rule

`uiSurface` is an emphasis primitive, not a universal page wrapper. Page composition should primarily use spacing, typography, rows, dividers and continuous surfaces as specified in `docs/v2/DESIGN_CONTRACT.md`.

## 4. Shell behaviour contract

Desktop:

- persistent left navigation;
- grouped League / Explore / Manage hierarchy;
- member identity visible without becoming a large card;
- main content remains independent from sidebar presentation.

Mobile/tablet:

- compact top context bar;
- persistent bottom navigation for the four primary member destinations plus More;
- slide-out drawer for Explore and Admin destinations;
- safe-area aware top/bottom spacing;
- no two-column grid of large navigation cards.

The shell changes navigation presentation only. It does not own gameweek state, scoring, picks, stats or admin mutations.

## 5. Phase migration boundaries

### Phase 2 — Dashboard

New structural owner should be a dedicated Dashboard V2 component or a clearly bounded section extracted from `LeagueApp.tsx`. Dashboard-specific visual rules should live beside that owner or in a clearly named V2 dashboard stylesheet/module.

Do not implement the Dashboard redesign as a large global selector layer over the current DOM.

### Phase 3 — Stat Centre

Canonical statistics calculations must be separated from presentation before/while the new Stat Centre composition is built. Public and authenticated renderers consume the same calculated model.

### Phase 4 — Admin

Admin shell/workspace ownership should be extracted from generic `LeagueApp.tsx` presentation where practical. Shared form/action primitives may be introduced, but permissions and mutations remain in canonical server/API paths.

### Phase 5+ — Remaining pages

Each page receives an explicit structural/styling owner. Do not keep appending V2 page rules to `ui-foundation-shell-responsive.css`.

## 6. CSS rules for V2

Allowed/preferred:

- explicit semantic classes;
- CSS Modules scoped to a component/page;
- shared V2 tokens;
- narrowly scoped global rules for genuine app-shell/system ownership;
- media/container queries documented by their owner.

Avoid/prohibit for new V2 work:

- `[class*="..."]` selectors targeting generated module class fragments;
- `!important` as routine specificity management;
- runtime `MutationObserver` visual injection;
- patch scripts that rewrite React/CSS during build;
- page-specific rules hidden in shell/global files;
- repeated one-off breakpoints for the same component.

## 7. V2 breakpoint strategy

The shell currently owns these broad modes:

- `<= 430px`: narrow phone adjustments;
- `<= 900px`: mobile/tablet shell with top/bottom navigation and drawer;
- `901–1180px`: compact persistent desktop sidebar;
- `> 1180px`: standard desktop shell.

Individual pages may use their own component-appropriate breakpoints, but should not copy the shell breakpoints automatically. Prefer content-driven breakpoints and document them with the page owner.

## 8. Hotfix carry-forward

While 1.x remains live:

1. production fixes are built/tested on the 1.x line;
2. after production stabilises, assess whether the same bug/behaviour exists in V2;
3. carry the canonical logic fix into `v2/product-redesign` without copying obsolete presentation overrides;
4. update the V2 parity/architecture docs if the fix changes a durable contract.

## 9. Review checklist

Before merging a V2 visual PR into `v2/product-redesign`:

- one structural owner is identifiable;
- one styling owner is identifiable;
- no new generated-class substring selector was added;
- no runtime DOM mutation was introduced;
- no new generic card wrapper became mandatory for unrelated content;
- current behaviour/parity is accounted for;
- mobile and iPad states are explicitly considered;
- loading/error/live states are not deferred without reason;
- Vercel preview/build succeeds;
- relevant V2 guardrails succeed.
