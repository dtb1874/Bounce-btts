"use client";

import { useEffect } from "react";

export default function StatsCentreEnhancer() {
  useEffect(() => {
    const apply = () => {
      const buttons = Array.from(document.querySelectorAll("button, a"));
      for (const element of buttons) {
        if ((element.textContent ?? "").trim() !== "League Table") continue;
        const target = element.querySelector("strong") ?? element;
        if ((target.textContent ?? "").trim() === "League Table") target.textContent = "Stats Centre";
      }
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
