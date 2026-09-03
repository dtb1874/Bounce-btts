"use client";

import { useEffect, useState } from "react";

type Portrait = { id: string; displayName?: string; portraitUrl?: string | null };
type Identity = { name: string; portraitUrl: string | null };

function normalise(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase();
}

export default function MobileSidebarPortrait() {
  const [identity, setIdentity] = useState<Identity | null>(null);

  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | null = null;
    let resolving = false;
    let timer = 0;

    const setResolvedIdentity = (next: Identity) => {
      if (cancelled) return;
      setIdentity((current) => current?.name === next.name && current.portraitUrl === next.portraitUrl ? current : next);
    };

    const resolvePortrait = async () => {
      if (resolving) return;
      const aside = document.querySelector('main[class*="shell"] > aside');
      if (!aside) return;
      resolving = true;
      try {
        const response = await fetch("/api/member-portraits", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as { portraits?: Portrait[] };
        const rows = (data.portraits ?? []).filter((row) => row.displayName);
        const drawerText = normalise(aside.textContent ?? "");
        const match = rows.find((row) => drawerText.includes(normalise(row.displayName ?? "")));
        const name = match?.displayName?.trim() || "Member";
        setResolvedIdentity({ name, portraitUrl: match?.portraitUrl ?? null });
      } catch {
        setResolvedIdentity({ name: "Member", portraitUrl: null });
      } finally {
        resolving = false;
      }
    };

    const scheduleResolve = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void resolvePortrait(), 80);
    };

    scheduleResolve();
    observer = new MutationObserver(scheduleResolve);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    const aside = document.querySelector('main[class*="shell"] > aside');
    if (!aside || !identity) return;
    let host = aside.querySelector<HTMLDivElement>(".mobileSidebarPortraitHost");
    if (!host) {
      host = document.createElement("div");
      host.className = "mobileSidebarPortraitHost";
      aside.appendChild(host);
    }
    host.setAttribute("aria-label", `${identity.name} profile picture`);
    host.innerHTML = "";

    if (identity.portraitUrl) {
      const image = document.createElement("img");
      image.src = identity.portraitUrl;
      image.alt = `${identity.name} profile picture`;
      image.className = "mobileSidebarPortraitImage";
      host.appendChild(image);
    } else {
      const fallback = document.createElement("span");
      fallback.className = "mobileSidebarPortraitInitials";
      fallback.textContent = initials(identity.name);
      host.appendChild(fallback);
    }

    return () => host?.remove();
  }, [identity]);

  return null;
}
