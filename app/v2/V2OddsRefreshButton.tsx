"use client";

import { useState } from "react";
import { token } from "./admin/helpers";

type Props = { gameweekId: string; onChanged?: () => Promise<void> | void; className?: string };

export default function V2OddsRefreshButton({ gameweekId, onChanged, className = "" }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/provider-sync", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ oddsOnly: true, gameweekIds: [gameweekId] }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Odds refresh failed.");
      setMessage(`Odds refreshed${typeof payload.oddsUpdated === "number" ? ` · ${payload.oddsUpdated} updated` : ""}`);
      if (onChanged) await onChanged();
      else window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Odds refresh failed.");
    } finally {
      setBusy(false);
    }
  }

  return <span className={className}><button type="button" onClick={() => void refresh()} disabled={busy}>{busy ? "Refreshing…" : "Refresh odds"}</button>{message ? <small>{message}</small> : null}</span>;
}
