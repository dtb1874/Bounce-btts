# Bounce BTTS canonical v1.6 foundation

This branch is deliberately isolated from production. It exists to turn the current working application into one canonical, reproducible codebase before any further major feature work.

## Non-negotiable behaviour

- Production/main is not modified while this branch is being developed and validated.
- League scoring remains +3 BTTS, +1 score-nil and -1 for 0-0.
- One player pick per gameweek and one use of each fixture per gameweek remain enforced.
- Normal member picks are only allowed for the actual open/current gameweek; admin overrides remain separate.
- Gameweek opening time, deadline, eligible weekday and eligible kick-off rule are admin-controlled per gameweek.
- Hearts and Hibs fixtures remain excluded from normal eligible fixture imports.
- Public view stays read-only and never exposes private future selections.
- Fixture-bearing share images use one canonical competition ordering rule; standings shares retain standings order.
- Mobile member journeys remain simple: Make My Pick, League Table, Current Form and weekly selections stay prominent.
- Maroon/gold and the subtle Edinburgh/Heart visual identity are preserved.

## Stabilisation sequence

1. Create shared rule modules for gameweek eligibility and competition ordering.
2. Route the API-Football importer through the gameweek rule module so admin controls are real, not cosmetic.
3. Route every fixture-bearing share path through one competition-order module.
4. Replace unsafe duplicate-team suffix stripping with provider-ID-first / conservative normalisation.
5. Retire duplicate legacy fixture sync endpoints or make them delegate to the canonical importer.
6. Bake the currently deployed application state into checked-in source files.
7. Remove historical build-time Python patching after the baked source produces an equivalent preview build.
8. Remove obsolete duplicate root source files and orphan share components.
9. Consolidate the clean-install schema/migrations so a new environment matches production behaviour.
10. Pin dependency resolution with a lockfile and verify a clean reproducible build.

## Release gate

Nothing from this branch is promoted to main until:

- exact candidate SHA is known;
- Vercel preview is READY;
- Next.js compile, type validation and static generation complete;
- changed files are reviewed against the current production main;
- no unrelated UI/scoring/selection changes are present;
- current production remains untouched throughout validation.
