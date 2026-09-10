# Bounce BTTS 2.0 — Master Product & UX Blueprint

Status: Phase 0 working contract
Parent programme: #78
Phase: #79
Integration branch: `v2/product-redesign`
Production line: `main` (1.x until explicit V2 release approval)
1.x staging line: `preview/1.x-hotfix`

## 1. Product intent

Bounce 2.0 is a coordinated product redesign, not a reskin and not a rewrite of trusted league rules. The target is a premium, purpose-built football product that feels easy to understand on first use while retaining the full depth of the current league.

The redesign must improve four things together:

1. **Clarity** — the next useful action or most important information is obvious.
2. **Quality** — typography, composition, interaction, imagery and motion feel considered and consistent.
3. **Speed** — both actual loading time and perceived responsiveness improve.
4. **Depth without clutter** — advanced features remain available but are revealed progressively rather than competing for attention.

The three priority experiences are Dashboard, Stat Centre and Admin, but **every surface must be migrated through the same V2 method and design language**. V2 is not complete if the priority screens feel new while secondary screens remain legacy islands.

## 2. Non-negotiable product principles

### 2.1 Cards are emphasis components, not the default layout

The current product overuses bordered, rounded containers. In V2, information hierarchy should primarily come from:

- spacing and rhythm;
- typography and scale;
- aligned groups and rows;
- thin dividers;
- section bands and continuous surfaces;
- subtle tonal changes;
- progressive disclosure;
- occasional inset panels only where a contained interaction genuinely benefits from one.

Cards remain appropriate for things that deserve emphasis: the current pick, a champion treatment, an alert requiring attention, a featured analytical insight or a focused confirmation. A page must not become a stack of near-identical rounded boxes.

### 2.2 Premium football editorial, not generic SaaS dashboard

The visual direction is a restrained blend of premium sports editorial and private members-club character:

- deep maroon and near-black foundations;
- selective, not ubiquitous, gold;
- strong display and information typography;
- subtle Edinburgh / St Giles / Hearts-inspired architectural texture;
- depth through tonal layering, not shadows everywhere;
- compact, confident controls;
- restrained motion;
- high-quality portrait, trophy and prestige treatments where relevant.

Do not invent marketing slogans or filler copy to make screens feel designed.

### 2.3 Functionality is preserved unless explicitly retired

Mock-ups never define feature removal. If a feature exists in 1.x and has not been explicitly retired, it must be represented in the V2 parity matrix and given a natural home.

### 2.4 Trusted business logic stays canonical

Do not rewrite scoring, gameweek eligibility, duplicate-pick protection, historical rules, Supabase data ownership or API/provider integrations simply because the presentation changes. V2 should reuse proven logic through stable services/helpers and replace the presentation/interaction layer around it.

### 2.5 Mobile-first means designed for mobile, not compressed desktop

Primary validation devices:

- narrow iPhone;
- large iPhone;
- iPad portrait;
- iPad landscape;
- desktop.

Core controls must have comfortable touch targets. Dense tables must be deliberately designed for narrow screens rather than relying on horizontal scrolling as the default answer.

## 3. V2 page method

Every migrated surface must pass the same design/build sequence before it is considered finished:

1. Define the page's primary purpose and the user's main question/action.
2. Establish information hierarchy before layout styling.
3. Design the mobile interaction model first.
4. Define loading, stale, empty, error, locked, live and completed states where relevant.
5. Map the page to shared V2 visual primitives and one clear visual owner.
6. Define required data and performance/caching behaviour.
7. Verify all 1.x functionality through the feature-parity matrix.
8. Validate at all target breakpoints and applicable roles.

No page should be considered done because the happy-path screenshot looks good.

## 4. Information architecture

### 4.1 Member mental model

The normal member experience should answer these questions in roughly this order:

1. **What do I need to do now?**
2. **How am I doing?**
3. **What is happening with everyone else's picks?**
4. **What happened recently?**
5. **What deeper stats/history can I explore?**

Navigation should support that mental model instead of exposing every destination with equal visual weight.

### 4.2 Admin mental model

Admin should answer:

1. **Does anything need attention?**
2. **What state is the current gameweek in?**
3. **What routine action do I need to perform?**
4. **Where are the deeper member/fixture/result/season controls?**

Routine controls should be obvious. Advanced and potentially destructive controls should remain available but visually subordinate until needed.

### 4.3 Navigation grouping

V2 should preserve access to all current areas while simplifying visible choice. The exact control treatment will be established in Phase 1, but the conceptual grouping is:

**Primary member destinations**
- Dashboard
- Make My Pick
- Stat Centre
- Results / Picks

**Explore**
- Fixtures
- Players
- League History
- About

**Admin-only**
- League Control / Admin
- Alerts

Public visitors retain a coherent public league/statistics/history-facing experience as approved by parity requirements.

## 5. Priority experience — Dashboard

Issue references: #71, #72, #81.

### 5.1 Purpose

The Dashboard is the gameweek command centre. A member should understand their current status within seconds.

### 5.2 Lifecycle-aware composition

The top of the Dashboard changes emphasis with the gameweek lifecycle without changing navigation destination.

**Picks open / no pick**
- Current GW and deadline are clear.
- `Make your pick` is the dominant action.
- Available supporting context is secondary.

**Picks open / submitted**
- Current selection becomes the hero information.
- `Change pick` is available without competing with the pick itself.
- League position/form snapshot follows naturally.

**Locked / upcoming**
- Pick is confirmed and no longer presented as editable.
- Reveal/all-picks context becomes more prominent when rules allow it.

**In play**
- Own fixture score/status is prominent.
- Member pick states communicate what the live matches mean to the Bounce league: landed, needs team, waiting, failed.
- Aggregate live state and presentation-only provisional movement can be shown without writing provisional scoring into authoritative results.

**Complete**
- The page transitions naturally toward gameweek outcome, league impact and recap.
- Existing Gameweek Recap and sharing capability are retained.

### 5.3 Dashboard visual structure

Avoid one-card-per-concept. Prefer a continuous page with:

- gameweek hero zone;
- league snapshot band;
- flowing member-picks/live section;
- compact table/form treatment;
- recap/secondary actions further down;
- selective prestige elements such as honours/champion where appropriate.

### 5.4 Performance expectation

Dashboard critical information should use data already required for the authenticated shell wherever sensible. Non-critical secondary content should not block the primary state. Previously loaded content should not unnecessarily blank during gameweek changes.

## 6. Priority experience — Stat Centre

Issue references: #33, #34, #72, #82.

### 6.1 Purpose

Stat Centre should explain the league, not merely expose a collection of numbers.

### 6.2 Proposed structure

Four analytical modes should be explored during implementation:

- **League** — headline season context, leaders and standout patterns.
- **Players** — select a member and move into a profile-style analytical view.
- **Form & Trends** — time/range-based recent performance, streaks and movement.
- **Records** — meaningful season records and historical comparisons where data quality allows.

The exact labels can be refined during visual implementation, but the information architecture must remain simple and consistent.

### 6.3 Canonical analytics requirement

Public and authenticated League Stats must be fed by one season-scoped calculation/data model. Shared statistics must not be independently calculated on different surfaces.

The canonical layer must preserve:

- joint-holder handling;
- qualification thresholds;
- Most Picked Team rules;
- Creature of Habit;
- Value/odds qualifications;
- shot metrics where available;
- current scoring definitions;
- season scoping.

### 6.4 Presentation principle

Headline metrics should have deliberate hierarchy. Dense secondary statistics should use grouped rows, tables, charts or drill-down sections rather than dozens of equal-weight cards.

A metric should ideally answer a useful question: who is in form, who is clinical, who takes riskier picks, who repeats teams, who is improving, etc.

## 7. Priority experience — Admin

Issue references: #63, #64, #72, #83.

### 7.1 Purpose

Admin becomes a league control centre rather than an exposed collection of management forms.

### 7.2 Landing hierarchy

The Admin entry state should summarise only real, actionable information that already exists or is explicitly added through approved work:

- current gameweek state;
- picks submitted / missing;
- fixture availability;
- provider/import state where reliable data exists;
- unresolved alerts;
- quick route to routine gameweek actions.

Do not invent fake health/activity telemetry to make the page look sophisticated.

### 7.3 Detailed management areas

Existing capabilities remain available:

- Users
- Selections
- Fixtures
- Results
- Gameweek
- Seasons

But the V2 interaction model should prioritise routine actions and group advanced/dangerous controls clearly.

### 7.4 Outstanding work integrated into Admin

**Scalable members (#63)**
- remove fixed assumptions around twelve users;
- safe user creation and slot/order handling;
- responsive member management as league size grows.

**Shared portrait management (#64)**
- one canonical portrait editor used by Admin and member self-service;
- members may only edit themselves server-side;
- admins retain override authority;
- one portrait source propagates throughout all portrait-enabled surfaces.

### 7.5 Destructive/schedule actions

Moving gameweeks, inserting one-offs, finalising a season and similar operations must clearly explain consequences before confirmation. The visual hierarchy should distinguish routine configuration from actions with broad downstream effects.

## 8. Remaining authenticated surfaces

### Make My Pick

Retain all eligibility, search/filter and duplicate-pick prevention. The selection experience should become faster to scan, with the active gameweek/deadline context clearly visible and filters/search subordinate to the pick task.

### Fixtures

Fixture browsing should remain gameweek-aware and preserve broad catalogue access. Use compact editorial fixture rows and clear date/competition grouping rather than repeated oversized cards.

### Results / Everyone's Picks

Prioritise member, fixture and outcome relationships. Live/FT/upcoming states and scoring effects should be easy to parse. Sharing remains accessible without dominating the reading flow.

### Players

Profiles should use the same member identity and analytical primitives as Stat Centre and portrait management. Avoid duplicating calculation logic or visual profile systems.

### League History

Preserve historical standings, archive and scoring correctness. Integrate #32 so the full weekly archive can be collapsed independently. Prestige/champion/honours treatment should use shared history/awards primitives rather than bespoke local markup.

### Alerts

Keep actionable severity and resolution clarity. Avoid excessive card framing; use grouped incident/event rows and restrained emphasis.

### About / Release History

Retain necessary league/product information without allowing informational content to dictate the main application navigation hierarchy.

## 9. Public experience

The public surface should look like the same product, not a separate legacy site. Shared league statistics must use the canonical analytics layer from #34. Public table/stat/history/awards access should reuse the same underlying display primitives where permissions permit.

## 10. Outstanding approved/banked work integration

### #31 End-of-Season Awards / Champion Reveal

**Status in V2:** Prepared for later unless separately brought forward.

V2 must leave natural ownership for:
- Awards navigation/public access;
- champion prestige treatment;
- honours archive;
- member portraits;
- season finalisation entry point in Admin;
- award-specific media/show presentation.

Do not prematurely implement the final season mutation or headline award list simply to fill space in V2.

### #42 Secondary live-score provider/conflict handling

**Status in V2:** Architectural preparation / backend workstream.

New V2 live-match components should consume provider-agnostic match state rather than embedding API-Football-specific assumptions into UI components. Existing regressive-update protection remains authoritative until the dual-source design is separately implemented and validated.

### #32 History weekly archive

**Status in V2:** Improve in V2.

### #33 Stats UX / Creature of Habit

**Status in V2:** Improve/New in V2 through the canonical Stat Centre rebuild.

### #34 Public/auth stats drift

**Status in V2:** Must fix before V2 release.

### #63 More than twelve users

**Status in V2:** New in V2 unless separately delivered to 1.x first.

### #64 Self-service portraits

**Status in V2:** New in V2 unless separately delivered to 1.x first.

### #71 Live Dashboard

**Status in V2:** Core V2 Dashboard behaviour.

### #72 Premium redesign

**Status in V2:** Core programme direction.

## 11. Visual system requirements for Phase 1

Phase 1 must define and implement reusable primitives for at least:

- page shell and content rhythm;
- page/section headings;
- status labels and live states;
- grouped information rows;
- compact stat bands;
- tabs/segmented navigation;
- action hierarchy;
- form controls;
- filters/search;
- tables and responsive data rows;
- selective inset/emphasis panels;
- dialogs/confirmations;
- alerts/feedback/toasts;
- portraits/member identity;
- fixture score rows;
- loading/skeleton states.

A generic `Card` component should not become the universal wrapper for the above.

## 12. Motion and interaction

- Most UI transitions should be approximately 150–250ms.
- Motion communicates state/change; it should not delay access to content.
- Respect reduced-motion preferences.
- Press/selected/focus states must feel immediate on touch devices.
- Loading transitions should preserve layout where practical to avoid jarring shifts.

## 13. Performance contract

V2 should improve both actual and perceived performance.

Principles:

- preserve lazy loading of broad/archive data where it genuinely reduces startup cost;
- prefetch likely next destinations only when cheap and useful;
- cache previously fetched screen data within the session where correctness permits;
- do not refetch stable data on every visual tab change;
- avoid blank-page transitions when switching gameweeks or analytical modes;
- keep primary Dashboard state independent from slow secondary modules;
- use skeletons sparingly and match final geometry;
- monitor API/provider call volume when increasing prefetch behaviour.

Performance changes must not weaken scoring/data freshness guarantees.

## 14. Accessibility and usability contract

Premium quality includes:

- comfortable touch targets;
- strong contrast without overusing gold;
- readable body and table type at mobile widths;
- keyboard/focus support on web/iPad keyboards;
- semantic control labels;
- clear selected/open/locked/live/error states that do not rely solely on colour;
- predictable back/close behaviour;
- no hidden critical action behind hover-only affordances.

## 15. Branching and production safety

- `main` remains live 1.x.
- `preview/1.x-hotfix` remains available for current-version staging.
- `v2/product-redesign` is the long-lived V2 integration line.
- V2 phases/features branch from `v2/product-redesign` and PR back into it.
- No V2 phase is merged directly to `main`.
- Relevant 1.x production hotfixes must be brought into V2 deliberately.
- V2 preview validation can be aggressive; production data mutations must remain appropriately guarded.

## 16. Delivery phases

### Phase 0 — Product contract
- master blueprint;
- parity matrix;
- issue map;
- acceptance criteria.

### Phase 1 — Design system and shell
- V2 tokens/primitives;
- navigation;
- responsive application frame;
- loading/interaction conventions.

### Phase 2 — Dashboard
- complete gameweek lifecycle;
- member status/actions;
- live/complete experience.

### Phase 3 — Stat Centre
- canonical stats architecture;
- new information hierarchy;
- player/trend drill-downs.

### Phase 4 — Admin
- control-centre landing;
- redesigned management flows;
- scalable users/portrait ownership.

### Phase 5+ — Remaining surfaces
- Make My Pick;
- Fixtures;
- Results;
- Players;
- History;
- public product;
- secondary/sharing/information surfaces.

### Phase 6 — Release candidate
- full parity;
- role/device testing;
- real-use preview period;
- explicit cutover approval.

## 17. Definition of V2 preview readiness

The V2 branch is ready for meaningful user review when:

- the V2 shell/design system is in place;
- Dashboard is a complete vertical slice rather than a static mock;
- real current league data is rendered through trusted existing logic;
- mobile and iPad layouts are usable;
- navigation does not strand legacy functionality;
- loading/error states exist for the reviewed path;
- CI/architecture guardrails pass;
- Vercel preview is READY.

The first meaningful preview should demonstrate the intended product quality, not merely prove that a new colour palette compiles.
