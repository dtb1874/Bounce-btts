# UI Foundation Behaviour Contract

Baseline: production `main` at `5c3d4be4d301d5d97e28478460cfc7fddf7d9ecf`.

This release is an architecture/presentation migration only. The preview must remain behaviour-neutral unless a later product change is explicitly approved outside this release.

## Non-negotiable preserved behaviour

- Authentication, approval and active-user gating.
- Member/admin/guest role boundaries and all admin permissions.
- Current-season and gameweek selection rules, including configured opening/deadline behaviour.
- Fixture eligibility and selection behaviour.
- Pick submission, locking, editing rules and duplicate-prevention behaviour.
- BTTS scoring, points awards, league ranking and tie handling.
- Live fixture/status behaviour and all provider/data-source contracts.
- Results, gameweek recap, archive/history and Roll of Honour data.
- Shot Performance calculations, coverage warnings, refresh/backfill behaviour and joint-leader display.
- Player/profile data, usernames, avatars/portraits and profile edit permissions.
- Public/private league views and public league-table behaviour.
- Sharing flows, native-share/WhatsApp fallbacks and generated share assets.
- Alerts, admin controls, bulk operations and existing error/retry semantics.
- Existing Supabase schema/API contracts unless a migration is independently required and explicitly approved.

## Allowed changes

- Component extraction and clearer ownership boundaries.
- Moving presentation from global overrides into scoped component/module styles.
- Introducing shared design tokens and behaviour-free UI primitives.
- Replacing runtime visual bridges with declarative React structure when output and behaviour remain equivalent.
- Consolidating duplicated responsive rules where the rendered result is intentionally unchanged.
- Removing superseded CSS only after its selector/DOM dependency has been proven unnecessary.
- Adding architecture documentation and regression coverage.

## Not allowed in this release

- Scoring or game-rule changes.
- New product features or statistics.
- Provider/API changes.
- Data-model redesign.
- Permission changes.
- Intentional content, interaction or navigation changes.
- Broad visual redesign disguised as refactoring.
- Big-bang replacement of `LeagueApp.tsx` or the styling stack.

## Migration rules

1. Work page-by-page, with one clear visual owner at the end of each migrated area.
2. Every phase ends at a commit that can act as a rollback point.
3. Before deleting a global rule, identify all matching DOM and breakpoints.
4. Before replacing a portal/bridge, record what it locates, injects, observes or reorders.
5. Preserve the current production DOM/interaction contract where automated or structural checks depend on it; change selectors only together with their callers/tests.
6. A phase that starts requiring material scoring, API or Supabase changes is paused and separated from this release.
7. Preview SHA must be verified before diagnosing an unchanged visual as a code failure.
8. Validate member, admin and public surfaces where relevant.
9. Validate narrow iPhone, large iPhone, iPad portrait, iPad landscape and desktop at meaningful checkpoints.
10. No production merge without explicit user approval.

## Release gates

For each page/phase:

- TypeScript/build validation passes.
- Release Guardrails relevant to the changed area pass.
- No known behaviour regression is introduced.
- Responsive ownership is documented rather than duplicated.
- The phase has a named rollback commit.

For final merge:

- Behaviour contract remains satisfied.
- Major temporary bridges and redundant override layers are removed or intentionally documented.
- `VISUAL-ARCHITECTURE.md` is updated to describe the simplified final architecture.
- Preview deployment, CI/Release Guardrails and agreed device checks pass.
- Explicit production-merge approval is received.
