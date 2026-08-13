BOUNCE BTTS LEAGUE — v1.4.7
================================
13 August 2026

Purpose
- Follow-up visual and browser-layout release built directly on v1.4.6.
- No functionality removed.
- No database migration required.

Changes
1. Admin > Users browser cleanup
   - Compact rows instead of very tall account blocks.
   - Name, password, role and actions align as a proper desktop management grid.
   - Action buttons remain available: Active, Generate, Copy, Emulate, Save.

2. Admin > Results browser cleanup
   - Compact fixture / home score / away score / Save FT rows.
   - Less empty width and vertical spacing.
   - Recalculate Gameweek Points remains unchanged.

3. Stronger Bounce branding
   - More obvious maroon and warm-gold hierarchy.
   - Heart of Midlothian pavement mosaic motif made deliberately more visible in authenticated app surfaces.
   - The mosaic is the Edinburgh reference; this release does NOT introduce St Giles Cathedral/church imagery.
   - Dashboard/page headings/panels receive a stronger visual identity rather than the very subtle v1.4.6 treatment.

Preserved from v1.4.6
- Admin bulk selection draft protection across 45-second refreshes.
- Fixture de-duplication handling.
- Bookmaker-style combined accumulator odds rounded down to x/1.
- Existing collapsible fixture/results layout.
- Existing scoring, alerts, roles and gameweek controls.

Release check
- npm run build must pass before the ZIP is produced.
