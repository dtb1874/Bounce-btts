# Bounce BTTS consolidated update

Upload everything inside this folder to the root of the existing GitHub repository and replace matching files.

This package includes the previously pending Friday-deadline and League History changes, plus:

- Unauthenticated visitors now see only the live, read-only league table at the main website address.
- A Member login button is displayed on the public table.
- `/table` remains a permanent public-table address.
- The dashboard mini league table layout is repaired so positions, names, wins, 0-0s and points remain in separate columns.
- Gameweek status spacing and progress bar styling are repaired.
- Public and member league-table pages include **Share table snapshot**.
- On supported phones, Share table snapshot creates a branded JPEG and opens the system share sheet so it can be sent through WhatsApp with the live-table link.
- On unsupported browsers, the JPEG downloads and WhatsApp opens with the live link ready.
- League History includes 2024/25, 2025/26 and the current 2026/27 season.
- New gameweeks default to Friday at 5pm UK time.
- Hearts and Hibs fixtures remain excluded.

Suggested commit message:

`Add public table, WhatsApp snapshot and repair dashboard table`
