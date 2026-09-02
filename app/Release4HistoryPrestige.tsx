"use client";

import { useEffect } from "react";

function textOf(root: Element | null, selector: string) {
  return root?.querySelector(selector)?.textContent?.trim() || "—";
}

export default function Release4HistoryPrestige() {
  useEffect(() => {
    function applyPrestigeHeader() {
      const page = document.querySelector('[class*="historyPage"]');
      if (!page) return;

      const heading = Array.from(page.children).find((child) => child.matches('[class*="heading"]')) as HTMLElement | undefined;
      if (!heading) return;

      const statsBand = page.querySelector('[class*="historyStatsBand"]');
      const honourGrid = page.querySelector('[class*="honourGrid"]');
      const champion = textOf(statsBand, "article:first-child strong");
      const championSeason = textOf(honourGrid, "article:first-child span");

      let plaque = page.querySelector(":scope > .release4ReigningChampion") as HTMLElement | null;
      const nestedPlaque = heading.querySelector(":scope > .release4ReigningChampion") as HTMLElement | null;

      if (!plaque && nestedPlaque) {
        plaque = nestedPlaque;
        heading.insertAdjacentElement("afterend", plaque);
      }

      if (!plaque) {
        plaque = document.createElement("aside");
        plaque.className = "release4ReigningChampion";
        plaque.setAttribute("aria-label", "Reigning Bounce champion");

        const copy = document.createElement("div");
        copy.className = "release4ReigningChampionCopy";

        const eyebrow = document.createElement("span");
        eyebrow.className = "release4ReigningChampionEyebrow";

        const name = document.createElement("strong");
        name.className = "release4ReigningChampionName";

        const note = document.createElement("small");
        note.className = "release4ReigningChampionNote";
        note.textContent = "Current holder of the Bounce Cup";

        const trophyWrap = document.createElement("div");
        trophyWrap.className = "release4ReigningChampionTrophy";
        const trophy = document.createElement("img");
        trophy.src = "/assets/bounce-cup.png";
        trophy.alt = "";
        trophy.setAttribute("aria-hidden", "true");
        trophyWrap.appendChild(trophy);

        copy.append(eyebrow, name, note);
        plaque.append(copy, trophyWrap);
        heading.insertAdjacentElement("afterend", plaque);
      }

      const eyebrow = plaque.querySelector(".release4ReigningChampionEyebrow");
      const name = plaque.querySelector(".release4ReigningChampionName");
      const nextEyebrow = championSeason === "—" ? "REIGNING CHAMPION" : `REIGNING CHAMPION · ${championSeason}`;
      if (eyebrow?.textContent !== nextEyebrow) eyebrow!.textContent = nextEyebrow;
      if (name?.textContent !== champion) name!.textContent = champion;
    }

    applyPrestigeHeader();
    const observer = new MutationObserver(() => applyPrestigeHeader());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
