# Bounce BTTS League V2

A production-oriented Next.js starter for a private, cross-platform football prediction league.

## What is already implemented

- Mobile-first sports-broadcast visual design
- Works as a web app in Safari, Chrome, iOS and Android
- Demo navigation for home, eligible fixtures, league table and admin control room
- One prediction per member per gameweek
- Database uniqueness rule preventing two members selecting the same fixture
- Automatic points:
  - BTTS: +3
  - One side scores and one side nil: +1
  - 0-0: -1
- Tiebreak order:
  1. Most points
  2. Fewest 0-0s
  3. Most BTTS wins
  4. Alphabetical
- Supabase schema with Row Level Security
- Approved-member and admin roles
- Members can alter only their own prediction
- Admin-only fixture/member/gameweek control
- API-Football fixture importer
- Filters to UK countries, exactly 15:00 Europe/London, no Heart of Midlothian
- Automatic final-score importer
- Scheduled-job configuration
- Audit log table

## Current demo

`app/page.tsx` contains realistic demo data so the design can be reviewed immediately. It does not pretend to be connected to a live database.

## Accounts required before it can be live

1. A Supabase project
2. An API-Football key
3. A Vercel account or equivalent hosting
4. A domain is optional

No service credentials are included in this ZIP.

## Run locally

Install Node.js 20 or newer, then:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

The visual demo works with `NEXT_PUBLIC_DEMO_MODE=true`.

## Connect Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Add the public URL, anonymous key and service-role key to `.env.local`.
4. Enable email OTP or magic-link authentication.
5. Create the first user, then set their `profiles.role` to `admin` and `approved` to `true`.
6. Keep the service-role key server-side only.

## Deploy

Import the repository into Vercel, add the environment variables and deploy. The application then has one permanent URL suitable for WhatsApp.

## Important production work still needed

The package provides the architecture, database security, synchronisation routes and polished demo interface. Before inviting real users, the frontend data layer must be switched from its in-file demo arrays to Supabase queries/mutations, and authentication screens must be wired to Supabase Auth. This cannot be completed responsibly without the actual Supabase project URL and keys.

The result-sync cron in `vercel.json` runs every ten minutes during Saturday afternoon. Confirm the selected hosting plan supports that cadence; otherwise use Supabase scheduled functions or a paid Vercel plan.

## Recommended league rules to confirm later

- Exact weekly lock time
- Treatment of postponed, abandoned and rescheduled fixtures
- Whether selections are visible before lock
- Which UK competitions are approved
- Whether members may change picks before lock
