"use client";

import { useEffect } from "react";

export default function StatsCentreEnhancer() {
  useEffect(() => {
    const apply = () => {
      const buttons = Array.from(document.querySelectorAll('nav[class*="nav"] button'));
      for (const element of buttons) {
        const text = (element.textContent ?? "").replace(/^\s*☷\s*/, "").trim();
        if (text !== "League Table") continue;
        for (const node of Array.from(element.childNodes)) {
          if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").includes("League Table")) {
            node.textContent = (node.textContent ?? "").replace("League Table", "Stats Centre");
          }
        }
      }
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
