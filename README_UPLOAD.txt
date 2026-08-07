BOUNCE BTTS — GAMEWEEK + LEAGUE TABLE UPDATE

Upload the contents of this folder to the ROOT of the GitHub repository and replace matching files.

Included changes:
- View any of 38 gameweeks in Make My Pick and Admin Selections.
- Members can view future gameweeks but cannot select before Monday 08:00 UK time.
- Admins can select at any time.
- Admin can create additional gameweeks beyond 38.
- Admin saves/reloads return to the same page, admin tab and selected gameweek.
- League tables show score–nil (S-N) results worth +1.
- Shared league-table image/text shows season and selected gameweek.
- Fixtures page remains the broad two-week all-fixtures view.

Database migrations for the 38 gameweeks, Monday opening enforcement and score-nil field have already been applied.

Suggested commit message:
Add future gameweeks, opening rules and score-nil table

ADDITIONAL SHARED PICKS FORMAT
- Player name is shown first.
- 'BTTS YES' has been removed.
- Competition/league headings have been removed.
- Picks remain ordered using the existing bookmaker competition order.
