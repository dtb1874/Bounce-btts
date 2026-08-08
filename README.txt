Bounce BTTS — unique selections validation fix

Replace app/LeagueApp.tsx in the GitHub repository with this file.

Fixes:
- Unique fixtures were incorrectly treated as duplicates because the validation regarded a missing match (-1) as a duplicate index.
- Duplicate fixture protection still remains active when two players genuinely select the same fixture.
- Removes a duplicated error notification in the save failure handler.

No database migration is required.
