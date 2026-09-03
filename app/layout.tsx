import "./globals.css";
import "./tynecastle-watermark.css";
import "./league-table.css";
import "./pre-v2-compact-restoration.css";
import "./public-mobile-tuning.css";
import "./league-stats.css";
import "./dashboard-fixture-rows.css";
import "./gameweek-recap-order.css";
import "./mobile-member-nav.css";
import "./release4-history.css";
import "./release4-history-champion.css";
import "./release4-admin-users-tidy.css";
import type { Metadata, Viewport } from "next";
import ShortRaceShareBridge from "./ShortRaceShareBridge";
import SharePortraitShareBridge from "./SharePortraitShareBridge";
import EasterEggDiscovery from "./EasterEggDiscovery";
import Release4HistoryPrestige from "./Release4HistoryPrestige";

export const metadata: Metadata = {
  title: "Bounce BTTS League",
  description: "Private weekly both-teams-to-score prediction league",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#071120",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><ShortRaceShareBridge /><SharePortraitShareBridge /><EasterEggDiscovery /><Release4HistoryPrestige />{children}</body>
    </html>
  );
}
