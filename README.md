# Bounce BTTS consolidated production update

Upload everything inside this folder to the root of the existing GitHub repository and replace matching files.

This package supersedes the earlier public-table, history and admin-selection packages. It includes:

- Unauthenticated visitors see only the live, read-only league table at the main website address.
- A Member login button is displayed on the public table.
- `/table` remains a permanent public-table address.
- The dashboard mini league table layout is repaired.
- Public and member league-table pages include a branded JPEG **Share table snapshot** control for WhatsApp.
- League History includes 2024/25, 2025/26 and the current 2026/27 season.
- New gameweeks default to Friday at 5pm UK time.
- Hearts and Hibs fixtures are excluded.
- Admin → Selections allows admins to add, replace or remove a pick for any active player, including after the normal deadline.
- A player who has no selection when the deadline passes automatically receives **-1 point**.
- Admin → Selections includes a points-adjustment control so the -1 can be amended or removed at admin discretion.
- Missed-selection penalties count toward points and games played, but do not count as a 0-0 result for tie-break purposes.
- Adding a valid late selection removes the automatic missed-selection penalty; explicit admin adjustments remain under admin control.
- All admin changes are written to the audit log.

Suggested commit message:

`Add automatic missed-pick penalty and admin overrides`
