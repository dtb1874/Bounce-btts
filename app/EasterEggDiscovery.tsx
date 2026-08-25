"use client";

import { useEffect, useRef } from "react";

const TAP_WINDOW_MS = 2600;
const REQUIRED_TAPS = 3;

export default function EasterEggDiscovery() {
  const taps = useRef(0);
  const lastTapAt = useRef(0);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const crest = target?.closest?.('aside img[src*="/assets/hearts-crest.png"]') as HTMLElement | null;
      if (!crest) return;

      const now = Date.now();
      if (now - lastTapAt.current > TAP_WINDOW_MS) taps.current = 0;
      lastTapAt.current = now;
      taps.current += 1;

      crest.animate(
        [
          { transform: "scale(1) rotate(0deg)" },
          { transform: "scale(1.035) rotate(-1deg)" },
          { transform: "scale(1) rotate(0deg)" },
        ],
        { duration: 180, easing: "ease-out" },
      );

      if (taps.current < REQUIRED_TAPS) return;
      taps.current = 0;

      const sidebar = crest.closest("aside");
      const hiddenEgg = sidebar?.querySelector('button[aria-label=" "]') as HTMLButtonElement | null;
      hiddenEgg?.click();
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
