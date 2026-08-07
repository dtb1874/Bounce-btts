UPLOAD FROM THE MAIN GITHUB REPOSITORY PAGE

1. Extract this ZIP.
2. Open the main page of dtb1874/Bounce-btts.
3. Choose Add file > Upload files.
4. Drag ALL extracted folders/files into the upload area.
5. Commit with: Add API Football importer and admin alerts

The Supabase schema migration has already been applied to the linked project.
API_FOOTBALL_KEY must remain configured in Vercel Production and Preview.

After Vercel shows READY:
- Sign in as admin.
- Open Admin > Alerts.
- Press Run fixture update now once.
- The panel will show requests used/remaining, fixtures changed, odds imported and alerts created.

Automatic schedule:
- Two UTC schedules are registered, at 07:00 and 08:00 UTC.
- The route only imports when the local Europe/London hour is 08:00, so it remains 08:00 through BST/GMT changes.
- The non-matching UTC run exits without calling API-Football.

Free-plan protections:
- maximum 75 API requests per import;
- stops with at least 8 daily requests remaining when quota headers are available;
- imports UK fixtures for up to three gameweek Saturdays;
- prioritises odds for eligible fixtures only;
- page visits never call API-Football.
