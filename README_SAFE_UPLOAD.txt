BOUNCE BTTS — CORRECTED FULL RELEASE

IMPORTANT
Do not use GitHub's normal Add file > Upload files page for this release. That page flattened the folders previously.

Use github.dev instead:
1. Open the Bounce-btts repository in GitHub on a computer.
2. Press the full-stop key (.) to open the repository in GitHub's web editor.
3. Extract this ZIP on your computer.
4. In the Explorer panel, drag the extracted folders and files onto the repository root.
5. Confirm existing folders such as app, lib, public and supabase merge rather than becoming loose files.
6. Open Source Control, stage all changes, use commit message:
   Deploy management gameweek alerts users and seasons release
7. Commit and sync/push.

The corrected release includes fixes for:
- LeagueApp access-token naming build error
- middleware cookie typing build error
- preserved nested folder structure

The Supabase migration 20260807_expand_users_and_preserve_history.sql was already run successfully and does not need to be run again.
