import "./globals.css";
import "./tynecastle-watermark.css";
import "./league-table.css";
import "./public-v2.css";
import "./user-heart-watermark.css";
import "./dashboard-preview-overrides.css";
import "./v2-completion.css";
import V2CompletionEnhancer from "./V2CompletionEnhancer";
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

const primaryNavScrollFix = `
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var button = target.closest('nav[aria-label="Primary navigation"] button');
    if (!button) return;
    var label = (button.textContent || '').trim();
    if (!/^(Table|Home|Pick|Stats)/.test(label)) return;
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      });
    });
  }, true);
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <V2CompletionEnhancer />
        <script dangerouslySetInnerHTML={{ __html: primaryNavScrollFix }} />
      </body>
    </html>
  );
}
