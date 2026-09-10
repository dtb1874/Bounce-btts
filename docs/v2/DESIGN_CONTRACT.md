# Bounce BTTS 2.0 — Design Contract

Status: Phase 0 design guardrail
Programme: #78

This document exists to stop V2 drifting back toward the current blocky, card-heavy presentation while individual pages are rebuilt.

## 1. Core rule

> **Cards are emphasis components, not the default page structure.**

A V2 page should read as one composed product surface. Do not create a separate rounded rectangle around every fact, metric, row, action or subsection.

## 2. Preferred hierarchy tools

Use these before adding a card:

1. spacing and whitespace;
2. typography scale/weight;
3. alignment;
4. tonal background zones;
5. thin dividers;
6. grouped rows;
7. section labels;
8. inset bands;
9. tabs/segmented navigation;
10. selective colour/status emphasis.

Only after those fail to communicate containment or importance should an elevated/inset card be introduced.

## 3. When cards are appropriate

Cards/panels are encouraged for:

- the member's current pick when it is the primary gameweek object;
- champion / honours prestige treatments;
- a focused warning or intervention;
- a featured analytical insight;
- a destructive-action confirmation;
- an independent object that needs its own interaction boundary.

They are not the default wrapper for:

- every statistic;
- every fixture;
- every member row;
- every admin field group;
- every heading plus paragraph;
- every secondary action;
- every table section.

## 4. Surface language

The intended visual character is:

- premium football editorial;
- private league / members-club atmosphere;
- deep near-black and maroon layered surfaces;
- controlled gold highlights;
- subtle Edinburgh / St Giles architectural texture;
- restrained radii;
- minimal shadow use;
- confident typography;
- compact but comfortable control density.

The interface should not resemble a generic SaaS admin dashboard, a bootstrap template or a grid of colourful widgets.

## 5. Composition examples

### Dashboard

Prefer:

`Gameweek hero → league snapshot band → picks/live flow → table/form → recap/secondary material`

Avoid:

`GW card → pick card → position card → form card → picks card → recap card → share card`

### Stat Centre

Prefer:

`headline insight strip → analytical navigation → main story/chart/table → supporting grouped rows/drill-down`

Avoid:

`12 equal statistic tiles followed by another grid of statistic tiles`.

### Admin

Prefer:

`current state/attention summary → routine actions → management workspace → advanced controls`

Avoid:

`one card for Users + one card for Fixtures + one card for Results + one card for Gameweek + one card for Seasons` as the primary experience.

## 6. Typography

V2 should use typography as a structural tool.

- Strong, concise page titles.
- Section headings visibly distinct from data labels.
- Numeric/stat values should have controlled emphasis rather than all being oversized.
- Supporting labels should be calm and readable.
- Avoid excessive uppercase; reserve it for small status/eyebrow labels.
- Long names/team labels must wrap or responsively fit rather than clip important information.

## 7. Gold usage

Gold signals prestige, selection, priority or important action. It should not become the default text/border colour.

Use gold for:

- champion/honours prestige;
- selected navigation or active control state;
- a primary/high-value action where appropriate;
- key result/stat emphasis;
- subtle lines/ornament in premium moments.

Do not outline every surface in gold.

## 8. Edinburgh / Hearts identity

Identity should be atmospheric rather than literal.

Appropriate:

- mosaic geometry;
- stone/architectural line work;
- restrained skyline/roofline fragments;
- maroon/gold palette cues;
- subtle etched texture.

Avoid:

- large decorative photography behind dense content;
- visual texture that harms contrast;
- repeated obvious landmarks on every screen;
- turning the product into a football-club fan site.

## 9. Controls

Controls should feel smooth and obvious:

- immediate pressed/selected states;
- minimum comfortable touch targets;
- clear primary/secondary/destructive hierarchy;
- consistent fields, toggles, segmented controls and confirmation patterns;
- advanced controls hidden behind deliberate disclosure where appropriate;
- no tiny icon-only controls for important actions without accessible labels.

## 10. Data rows and tables

Dense data is part of Bounce and should remain readable rather than converted into dozens of cards.

Preferred:

- aligned semantic tables where they fit;
- responsive row layouts;
- sticky/clear column meaning where useful;
- grouped date/competition/member rows;
- inline status and supporting detail;
- collapsible secondary detail.

Avoid converting every table row into a large mobile card unless the data relationship genuinely demands it.

## 11. Motion

- Typical state transitions: ~150–250ms.
- Motion should explain change, not decorate idle screens.
- Avoid long page-entry animations.
- Live updates should feel stable rather than constantly pulsing/reflowing.
- Respect reduced motion.

## 12. Loading

A premium experience should not repeatedly replace whole pages with spinners.

- Preserve already-loaded content while refreshing where safe.
- Use skeletons only where they match eventual geometry.
- Keep primary actions/state available independently of slow secondary content.
- Use compact inline progress for action-specific loading.
- Avoid layout shift.

## 13. Responsive rule

Mobile is not a fallback breakpoint. The component composition must be intentionally defined at mobile width first, then expanded for iPad/desktop.

A desktop version should usually gain width, supporting columns or persistent navigation — not an entirely different visual system.

## 14. Page review questions

Before accepting any V2 page, ask:

1. If all borders/radii disappeared, would hierarchy still make sense?
2. Is the primary action obvious within two seconds?
3. Is there any card whose only purpose is to wrap content?
4. Can secondary depth be revealed rather than permanently shown?
5. Does the screen feel like the same product as Dashboard, Stat Centre and Admin?
6. Does it remain comfortable on an iPhone without hiding important capability?
7. Is gold being used deliberately rather than habitually?
8. Does the page remain understandable in loading, empty, error, locked and live states?

If the answer to #1 is no, the composition is too dependent on boxes.
