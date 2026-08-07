# Bounce BTTS League — Production Build

Private, mobile-friendly weekly BTTS prediction league for iPhone, Android and desktop.

## Live features included

- Username/password login using reusable `user1`–`user12` slots
- `user1` permanently assigned to DTB as an active administrator
- Admin → Users shows the stored league usernames and passwords, with controls to change, generate and copy them
- Dave S starts as the second administrator
- Current roster: DTB, Dave S, Turnsy Fitchett, Ryan, Dave Pickup, Yacky, Ian and Kevin Pickup
- One unique fixture per player per gameweek
- UK Saturday 3pm fixtures only; Hearts and Hibs fixtures are rejected
- Members can change only their own pick before the deadline
- Admin fixture entry, fractional BTTS odds, results, scoring and gameweek controls
- Scoring: BTTS +3, one-sided score +1, 0–0 −1
- Tiebreaks: points, fewest 0–0s, most BTTS wins, alphabetical
- Public read-only `/table` page for WhatsApp sharing
- Weekly WhatsApp-ready pick sharing grouped by competition, with fractional and combined odds
- One daily automation route for provider fixtures/results when `API_FOOTBALL_KEY` is configured
- Manual operation remains fully available when no football-provider key is present
- Edinburgh/Hearts concept styling, permanent desktop sidebar, left slide-out mobile menu, EST 2024 branding

## Existing infrastructure

The production Supabase project and its schema have already been prepared. Do not put secret keys in GitHub.

## Vercel environment variables

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

Optional for automated fixture/result checks:

- `API_FOOTBALL_KEY`

Without `API_FOOTBALL_KEY`, admins can still add fixtures, odds and results manually from the app.

## First launch

1. Deploy the repository to Vercel.
2. Open the live site. With no users yet, it redirects to `/setup`.
3. Choose the simple password for `user1` / DTB.
4. Press **Create league accounts**.
5. Save or copy the generated usernames and passwords.
6. Continue to login and sign in as `user1`.

After setup, passwords remain available to administrators under **Admin → Users**. They are encrypted in the database and are never exposed to ordinary members or public visitors.

## Daily operation

- Admin → Fixtures: add a fixture and fractional BTTS odds.
- Admin → Gameweek: set the lock deadline, lock/complete a week or create the next gameweek.
- Admin → Results: enter full-time scores; points update automatically.
- Share weekly picks from the dashboard or fixtures page.
- Share `/table` with non-members for read-only standings.

## Deployment

Upload the contents of this project to the top level of the `dtb1874/Bounce-btts` GitHub repository. Vercel is connected to the repository and should deploy the new commit automatically.
