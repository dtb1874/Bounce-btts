"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type SharedRacePayload = {
  v: 1;
  seasonLabel: string;
  players: Array<{ id: string; name: string; colour: string }>;
  frames: Array<{ gameweek: number; positions: Record<string, number> }>;
  selected: string[];
};

function decodePayload(value: string): SharedRacePayload | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as SharedRacePayload;
    if (parsed?.v !== 1 || !Array.isArray(parsed.players) || !Array.isArray(parsed.frames)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function shorten(url: string) {
  const parsedUrl = new URL(url, window.location.origin);
  if (parsedUrl.origin !== window.location.origin || parsedUrl.pathname !== "/race-share") return url;
  const encoded = parsedUrl.searchParams.get("d");
  if (!encoded) return url;

  const payload = decodePayload(encoded);
  if (!payload) return url;

  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return url;

  const response = await fetch("/api/race-share", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ payload }),
  });
  if (!response.ok) return url;

  const result = await response.json() as { url?: string };
  return result.url ? new URL(result.url, window.location.origin).toString() : url;
}

export default function ShortRaceShareBridge() {
  useEffect(() => {
    if (!navigator.share) return;
    const original = navigator.share.bind(navigator);
    const wrapped = async (data?: ShareData) => {
      if (!data?.url) return original(data);
      try {
        const shortUrl = await shorten(data.url);
        return original({ ...data, url: shortUrl });
      } catch {
        return original(data);
      }
    };

    Object.defineProperty(navigator, "share", { configurable: true, value: wrapped });
    return () => {
      try { Object.defineProperty(navigator, "share", { configurable: true, value: original }); } catch {}
    };
  }, []);

  return null;
}
