# Bounce BTTS Release Process

This document defines the permanent release discipline for Bounce BTTS.

## Source of truth

- `main` must always contain the exact application source that production builds.
- Builds must not rewrite tracked application files.
- No historical release-patch chain may be added back into `npm run build`.
- Shared league rules belong in canonical modules under `lib/` and must be reused by UI, admin routes and background jobs.

## Branching

1. Start every fix, feature or release branch from the current `main` head.
2. Never continue ordinary development from an old release/hotfix branch.
3. Keep changes as small and independently testable as practical.
4. Open a pull request to `main` and use its Vercel preview for validation.

## Candidate validation

Before merge:

- confirm the exact branch/head SHA being tested;
- install dependencies from `package-lock.json` with `npm ci`;
- run the production build and TypeScript validation;
- confirm the build does not modify tracked source files;
- review the branch diff against current `main` for unrelated changes;
- test the Vercel preview, with mobile-first checks on iPhone/iPad Safari and Chrome for Dashboard, Make My Pick, fixture search, League Table, Results, League History, navigation/collapsibles, Admin Gameweek controls and sharing;
- verify fixture-bearing shares use the canonical competition-order rules and table/archive shares preserve standings order;
- verify gameweek opening/deadline/fixture eligibility is driven by the canonical gameweek rule modules.

## Database changes

- Every schema/function/policy change must be represented by a migration in `supabase/migrations`.
- Do not rely on undocumented production-only schema edits.
- Migrations should be idempotent where practical and safe for rebuilt/test environments.

## Dependencies

- `package-lock.json` is authoritative.
- Production/CI installs use `npm ci`.
- Dependency upgrades are explicit changes, reviewed like application code.

## Production promotion

1. Merge only the exact validated PR head SHA.
2. Wait for the exact merged SHA to deploy to production.
3. Confirm Vercel reports `READY`, `target=production`, the expected production aliases are attached and `aliasError=null`.
4. Smoke-test the live site.
5. If anything is wrong, fix it on a fresh branch from the new `main`; do not patch production during deployment.

## Architecture guardrails

The repository must not reintroduce:

- build-time Python/source patch chains;
- duplicate root copies of canonical `app/` or `lib/` files;
- independent fixture-import implementations with their own weekday/kickoff rules;
- duplicated hard-coded competition orderings when `lib/competition-order.ts` can be used;
- unsafe fixture dedupe that removes meaningful club-name suffixes such as City, United, Rovers, Town or County.

The goal is simple: a commit should be reproducible, previewable and identical in source whether run locally, in CI or on Vercel production.
