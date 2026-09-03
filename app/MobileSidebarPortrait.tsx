"use client";

import { useEffect, useState } from "react";

type Portrait = { id: string; displayName?: string; portraitUrl?: string | null };

function normalise(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export default function MobileSidebarPortrait() {
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | null = null;

    const resolvePortrait = async () => {
      const aside = document.querySelector('main[class*="shell"] > aside');
      if (!aside) return;

      try {
        const response = await fetch("/api/member-portraits", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as { portraits?: Portrait[] };
        const rows = (data.portraits ?? []).filter((row) => row.displayName && row.portraitUrl);
        const drawerText = normalise(aside.textContent ?? "");
        const match = rows.find((row) => drawerText.includes(normalise(row.displayName ?? "")));
        if (!cancelled) setPortraitUrl(match?.portraitUrl ?? null);
      } catch {
        if (!cancelled) setPortraitUrl(null);
      }
    };

    void resolvePortrait();
    observer = new MutationObserver(() => void resolvePortrait());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    const aside = document.querySelector('main[class*="shell"] > aside');
    if (!aside) return;
    let host = aside.querySelector<HTMLDivElement>(".mobileSidebarPortraitHost");
    if (!portraitUrl) {
      host?.remove();
      return;
    }
    if (!host) {
      host = document.createElement("div");
      host.className = "mobileSidebarPortraitHost";
      host.setAttribute("aria-label", "Your profile picture");
      aside.appendChild(host);
    }
    host.innerHTML = "";
    const image = document.createElement("img");
    image.src = portraitUrl;
    image.alt = "Your profile picture";
    image.className = "mobileSidebarPortraitImage";
    host.appendChild(image);
    return () => host?.remove();
  }, [portraitUrl]);

  return null;
}
