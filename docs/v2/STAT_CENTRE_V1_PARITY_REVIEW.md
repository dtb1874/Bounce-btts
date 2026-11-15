# Bounce 2.0 — Stat Centre vs V1 feature-parity audit
Date: 15 November 2026

## Exact basis
Compared **production V1 `main:app/LeagueApp.tsx`**, specifically `LeagueTable` (the League Table/Stat Centre view), and `main:app/ValueLeaderPortal.tsx`, with `v2/phase-4-cohesion-parity:app/v2/V2StatCentre.tsx`, `V2ShotPerformance.tsx` and `lib/league-stats.ts`.

The `lib/league-stats.ts` content on `main` and V2 was identical at the time of review. This common calculator drives the V2 record and player metrics. The feature audit below is **code-level**, not real-device or logged-in numeric equivalence testing.

## V1 league snapshot → V2 League tab
| V1 metric | V2 location | Result |
| --- | --- | --- |
| League leader and points | Hero + League Overview | Present |
| Season pot | League Overview | Present |
| League strike rate / BTTS wins | Hero + League Overview | Present |
| 6-week form leader(s) | Hero + League Overview | Present |
| BTTS leader(s) | League Overview | **Restored** (previously buried in Records as BTTS King) |
| Creature of Habit incl. tied leaders and repeat record | League Overview | Present |
| Goals in finished selected fixtures | League Overview | Present |
| Finished picks and recorded selections | League Overview | Present |
| Current full league standings and P / W / score-nil / 0–0 / points | League Overview table | Present |

## V1 individual player stats → V2 Players tab
Strike rate; points per pick; current BTTS streak; best BTTS streak; longest winless run; average selected odds; average winning odds; biggest winning odds; total goals; average goals per finished pick; match result split (home/draw/away); favourite competition; most-picked team and repeat-team win/loss breakdown — all present via canonical `playerInsights` and V2 player panels. Portraits remain available.

## V1 expanded records → V2 Records tab
All ten categories are preserved with joint-winner handling through shared `seasonFacts`:
1. Goal Magnet(s)
2. BTTS King(s)
3. Home-Win Hunter(s)
4. Away-Win Hunter(s)
5. Draw Magnet(s)
6. Biggest Odds Winner(s)
7. Longest BTTS Streak(s)
8. Longest Winless Run(s)
9. Value Leader(s) (minimum five priced finished picks)
10. Most Picked Team(s) with member breakdown.

The old League Table's expanded "more stats" area is a dedicated Records tab in V2.

## Recent form
The Stat Centre Form & Trends tab displays the canonical last six scored gameweeks, member totals and colour-coded outcomes. The V2 Dashboard retains separate 6/12/18-week form selectors through `V2DashboardParity`. The Stat Centre now uses filled, matching +3/+1/−1 result tiles.

## V1 Value Leader Portal → V2 Players / Shot Performance
- The five awards **Chance Magnet**, **Sharpshooter**, **Clinical Picker**, **Shot Shy** and **Coldest Finisher** all appear.
- Member covered pick counts, average shots, shots on target, average goals and conversion appear.
- **Shots per goal restored** as its own table column (V1 displayed this within the conversion column or mobile detail).
- V2 filters complete shot data through the same plausibility rule as V1 (rejects nonfinite/negative figures, shots on target exceeding shots, and zero total shots where goals > 0). Displayed coverage uses valid rows rather than trusting an API count which may include stale invalid records.
- Shots API backfill requires live credentials and may write stats on GET, so it was not exercised for this visual/source-only audit.

## Presentation fixes during review
- Separate recap heading/Share button, with explicit mobile layout for tight widths.
- Increased form heading/action spacing, honours header rhythm, and section padding.
- Replaced microscopic Shot Performance typography with readable sizes, touch-sized Refresh button, and horizontally scrollable complete table on mobile.
- Preserved muted dashboard canvas and existing maroon/gold accent palette.

## Outstanding release certification
- Logged-in end-to-end parity against V1 actual current season values for all categories and roles (not available through source inspection alone).
- Shot API coverage, team/provider backfill and conversion figures verified against real results, without mutating production.
- iPhone/iPad screenshot confirmation of recap and form header spacing, nested tables and long names.
- Browser performance and prior Chrome/Vercel preview authentication issues.

**Conclusion:** All identified V1 Stat Centre and Value Leader statistics now have an implementation in V2. Do not claim a fully verified like-for-like release until the authenticated numeric and device tests pass.
