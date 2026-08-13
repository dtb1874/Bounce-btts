BOUNCE BTTS LEAGUE — v1.4.6
================================
13 August 2026

BASELINE
- Built directly from GitHub main v1.4.5.
- Compatibility pass preserves the v1.4.5 collapsible fixture/results behaviour,
  scoring, alerts, gameweek controls, searchable admin fixture picker and role model.

CHANGES
1. Fixture duplication
   - Client fixture lists de-duplicate the same real-world match using kickoff +
     normalised home/away identity.
   - Existing selected fixture IDs are preferred so historic/current picks are not
     orphaned by display de-duplication.
   - API-Football import now falls back to same kickoff + normalised teams before
     inserting a new row, covering provider naming differences such as:
       Notts County / Notts
       Leicester City / Leicester
       Bradford City / Bradford
       Peterborough United / Peterborough
       Wycombe Wanderers / Wycombe

2. League Admin > Selections reliability
   - Unsaved bulk selections are no longer reset by the 45-second live refresh.
   - Admin can enter all players, review them, then press Save all once.
   - Duplicate pending selections remain blocked before save.

3. Member mobile cleanup
   - No member features are removed.
   - Mobile dashboard order prioritises:
       Make My Pick
       League Table
       Recent Form
       Everyone's Picks / live results
       Remaining quick links
   - Touch targets and selection status presentation improved.

4. Visual identity
   - Maroon remains the primary scheme with gold text/accent treatment.
   - St Giles / Edinburgh mosaic treatment strengthened subtly across key surfaces.
   - Existing Hearts / Bounce visual assets are retained.

5. Weekly Picks combined odds
   - Individual fixture odds remain unchanged.
   - Combined accumulator odds now show a bookmaker-style whole-number fractional
     price, rounded DOWN: e.g. 79.77/1 displays as 79/1.

FILES CHANGED
- app/LeagueApp.tsx
- app/release.module.css
- lib/api-football.ts
- lib/fractional.ts
- README_BOUNCE_BTTS_v1.4.6.txt

NO DATABASE MIGRATION REQUIRED
- This release intentionally avoids destructive fixture cleanup in Supabase.
- Existing duplicate rows are suppressed safely in the UI; new API refreshes use
  the stronger matching rule to prevent the same naming-variant duplication from
  being created again.

RELEASE CHECKS
- npm build must pass before release artifact is produced.
- Confirm Member mobile dashboard hierarchy.
- Confirm Admin > Selections can hold all unsaved picks for >45 seconds.
- Confirm Save all commits the batch.
- Confirm Fixtures / Make My Pick / Results do not show duplicate matches.
- Confirm current selections still resolve to their saved fixture IDs.
- Confirm weekly picks image shows combined odds as x/1.
