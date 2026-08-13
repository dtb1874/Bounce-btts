Bounce BTTS v1.4.7.1
13 Aug 2026

HOTFIX
- Adds a persistent Exit emulation control whenever Ultimate Admin user emulation is active.
- Exit returns immediately to the real Ultimate Admin account and Admin > Users.
- Fixes Demo Guest emulation profile resolution so the emulated identity is correctly recognised.
- Emulation remains read-only.
- Preserves all v1.4.7 visual/admin layout work and all v1.4.6 functional fixes.

Compatibility
- No database migration.
- No API changes.
- app/LeagueApp.tsx only.

Verification build included before release to main.
