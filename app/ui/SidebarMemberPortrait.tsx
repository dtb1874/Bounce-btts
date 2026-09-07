"use client";

import { useEffect, useState } from "react";

type Portrait = { id: string; displayName?: string; portraitUrl?: string | null };

type SidebarMemberPortraitProps = {
  displayName: string;
};

function normalise(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase();
}

/** Declarative replacement candidate for the current MobileSidebarPortrait DOM bridge. */
export default function SidebarMemberPortrait({ displayName }: SidebarMemberPortraitProps) {
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/member-portraits", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as { portraits?: Portrait[] };
        const target = normalise(displayName);
        const match = (data.portraits ?? []).find((row) => row.displayName && normalise(row.displayName) === target);
        if (!cancelled) setPortraitUrl(match?.portraitUrl ?? null);
      } catch {
        if (!cancelled) setPortraitUrl(null);
      }
    })();

    return () => { cancelled = true; };
  }, [displayName]);

  return (
    <div className="mobileSidebarPortraitHost uiFoundationSidebarPortrait" aria-label={`${displayName} profile picture`}>
      {portraitUrl ? (
        <img className="mobileSidebarPortraitImage" src={portraitUrl} alt={`${displayName} profile picture`} />
      ) : (
        <span className="mobileSidebarPortraitInitials">{initials(displayName)}</span>
      )}
    </div>
  );
}
