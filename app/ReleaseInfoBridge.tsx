"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CURRENT_RELEASE, RELEASE_HISTORY_CATCHUP } from "@/lib/release-info";

function findReleaseHistoryRoot() {
  const heading = Array.from(document.querySelectorAll("h3")).find((node) => (node.textContent ?? "").trim() === "Release History");
  return heading?.parentElement ?? null;
}

function updateFooterVersion() {
  const footer = Array.from(document.querySelectorAll("footer")).find((node) => (node.textContent ?? "").includes("MADE BY THE ARTIST, FOR THE BOUNCE"));
  if (!footer) return;
  const text = footer.textContent ?? "";
  footer.textContent = /·\s*v[^\s]+\s*$/.test(text)
    ? text.replace(/·\s*v[^\s]+\s*$/, `· v${CURRENT_RELEASE.version}`)
    : `${text.trim()} · v${CURRENT_RELEASE.version}`;
}

export default function ReleaseInfoBridge() {
  const [target, setTarget] = useState<Element | null>(null);

  useEffect(() => {
    let host: HTMLDivElement | null = null;
    const sync = () => {
      updateFooterVersion();
      const root = findReleaseHistoryRoot();
      if (!root) {
        setTarget(null);
        return;
      }

      const oldLatest = Array.from(root.querySelectorAll("details")).find((node) => (node.textContent ?? "").includes("v1.6.3"));
      if (oldLatest instanceof HTMLElement) oldLatest.style.display = "none";

      if (!host) {
        host = document.createElement("div");
        host.dataset.releaseInfoCanonical = "true";
      }
      if (!root.contains(host)) {
        const intro = root.querySelector("p");
        if (intro?.nextSibling) root.insertBefore(host, intro.nextSibling);
        else root.appendChild(host);
      }
      setTarget(host);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      host?.remove();
    };
  }, []);

  if (!target) return null;

  return createPortal(
    <div className="releaseInfoCanonicalList" aria-label={`Current release v${CURRENT_RELEASE.version}, ${CURRENT_RELEASE.date}`}>
      {RELEASE_HISTORY_CATCHUP.map((release, index) => (
        <details className="releaseInfoCanonicalItem" key={release.version} open={index === 0}>
          <summary>
            <span><strong>v{release.version}</strong> · {release.date}</span>
            <small>{release.summary}</small>
          </summary>
          <ul>{release.changes.map((change) => <li key={change}>{change}</li>)}</ul>
        </details>
      ))}
    </div>,
    target,
  );
}
