BOUNCE BTTS LEAGUE — v1.4.3.1 TYPECHECK HOTFIX — 11 AUG 2026
================================================================

This supersedes the failed v1.4.3 upload.

CAUSE OF THE FAILED VERCEL BUILD
- The v1.4.3 League History hero pluralisation compared the fixed rollOfHonour tuple length (2) with 1.
- Next.js compiled the UI, then TypeScript correctly rejected that impossible comparison during type checking.

FIX
- Removed the impossible tuple-length comparison and uses the correct fixed wording: "2 champions crowned".
- No feature rollback: the enhanced League History, trophy presentation, enhanced League Table and universal searchable Admin → Selections fixture picker all remain.

FILES
- app/LeagueApp.tsx
- app/release.module.css

UNCHANGED
- Scoring logic
- Supabase/database
- API routes
- package.json/dependencies
- Vercel configuration

VALIDATION
- Standalone TypeScript type-check of LeagueApp with dependency stubs: PASS after hotfix.
- CSS module reference audit: PASS.
- CSS brace balance: PASS.

Upload both files over the failed v1.4.3 files in GitHub main. Vercel will redeploy automatically.
