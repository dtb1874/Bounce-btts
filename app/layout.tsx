import "./globals.css";
import "./tynecastle-watermark.css";
import "./league-table.css";
import "./public-v2.css";
import "./user-heart-watermark.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Bounce BTTS League",
  description: "Private weekly both-teams-to-score prediction league",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#12090f",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
