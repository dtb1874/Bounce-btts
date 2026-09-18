"use client";

import { useEffect } from "react";

export default function EasterEggDiscovery() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const crest = target?.closest?.(
        'aside img[src*="/assets/hearts-crest.png"], img.dashboardBrandCrest',
      ) as HTMLElement | null;
      if (!crest) return;

      crest.animate(
        [
          { transform: "scale(1) rotate(0deg)" },
          { transform: "scale(1.035) rotate(-1deg)" },
          { transform: "scale(1) rotate(0deg)" },
        ],
        { duration: 180, easing: "ease-out" },
      );

      const hiddenEgg = document.querySelector('aside button[aria-label=" "]') as HTMLButtonElement | null;
      hiddenEgg?.click();
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
