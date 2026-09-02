"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Profile = { id: string; display_name: string; active: boolean; role: string };
type Prediction = { member_id: string; fixture_id: string; points_awarded: number | null };
type Fixture = { id: string; odds_fractional?: string | null };

type Row = { id: string; name: string; priced: number; roi: number | null; rounded: number | null };

function oddsRatio(value: string | null | undefined) {
  if (!value) return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return numerator / denominator;
}

function findValueLeaderCard() {
  const labels = Array.from(document.querySelectorAll("span"));
  const label = labels.find((node) => /^VALUE LEADERS?$/.test(node.textContent?.trim() ?? ""));
  return label?.parentElement ?? null;
}

export default function ValueLeaderPortal({ profiles, predictions, fixtures }: { profiles: Profile[]; predictions: Prediction[]; fixtures: Fixture[] }) {
  const [target, setTarget] = useState<Element | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const locate = () => setTarget(findValueLeaderCard());
    locate();
    const observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const rows = useMemo<Row[]>(() => {
    const fixtureMap = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
    return profiles
      .filter((profile) => profile.active && profile.role !== "guest")
      .map((profile) => {
        const pricedFinished = predictions
          .filter((prediction) => prediction.member_id === profile.id && prediction.points_awarded !== null)
          .map((prediction) => ({ points: prediction.points_awarded as number, odds: oddsRatio(fixtureMap.get(prediction.fixture_id)?.odds_fractional) }))
          .filter((pick): pick is { points: number; odds: number } => pick.odds !== null);
        const profit = pricedFinished.reduce((sum, pick) => sum + (pick.points === 3 ? pick.odds : -1), 0);
        const roi = pricedFinished.length >= 5 ? (profit / pricedFinished.length) * 100 : null;
        return {
          id: profile.id,
          name: profile.display_name,
          priced: pricedFinished.length,
          roi,
          rounded: roi === null ? null : Math.round(roi * 10) / 10,
        };
      });
  }, [fixtures, predictions, profiles]);

  const qualified = useMemo(() => rows.filter((row) => row.rounded !== null).sort((a, b) => (b.rounded as number) - (a.rounded as number) || a.name.localeCompare(b.name)), [rows]);
  const pending = useMemo(() => rows.filter((row) => row.rounded === null).sort((a, b) => b.priced - a.priced || a.name.localeCompare(b.name)), [rows]);

  if (!target) return null;

  let previousScore: number | null = null;
  let previousRank = 0;

  return createPortal(
    <div style={{ marginTop: 10, width: "100%" }} onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        style={{ width: "100%", border: "1px solid rgba(217,184,95,.34)", background: "rgba(217,184,95,.07)", color: "#d9b85f", borderRadius: 8, padding: "8px 10px", fontSize: 11, fontWeight: 900, letterSpacing: ".05em", cursor: "pointer" }}
      >
        {open ? "Hide value table −" : "View value table +"}
      </button>
      {open && (
        <div style={{ marginTop: 9, display: "grid", gap: 7, textAlign: "left" }}>
          {qualified.length > 0 ? qualified.map((row, index) => {
            if (previousScore !== row.rounded) {
              previousRank = index + 1;
              previousScore = row.rounded;
            }
            const rank = previousRank;
            return (
              <div key={row.id} style={{ display: "grid", gridTemplateColumns: "28px minmax(0,1fr) auto", gap: 8, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,.08)", paddingBottom: 6 }}>
                <b style={{ color: "#d9b85f", fontSize: 12 }}>{rank}</b>
                <span style={{ color: "#f4e5d6", fontSize: 12, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}<small style={{ display: "block", color: "#a99ba0", fontWeight: 600 }}>{row.priced} priced finished picks</small></span>
                <b style={{ color: "#f4e5d6", fontSize: 12 }}>{(row.rounded as number) >= 0 ? "+" : ""}{(row.rounded as number).toFixed(1)}%</b>
              </div>
            );
          }) : <small style={{ color: "#a99ba0" }}>No player has reached 5 priced finished picks yet.</small>}
          {pending.length > 0 && (
            <div style={{ marginTop: 3, paddingTop: 7, borderTop: "1px solid rgba(217,184,95,.2)" }}>
              <small style={{ color: "#d9b85f", fontWeight: 900, letterSpacing: ".05em" }}>NOT YET QUALIFIED</small>
              <div style={{ display: "grid", gap: 5, marginTop: 6 }}>
                {pending.map((row) => <small key={row.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, color: "#b9adb2" }}><span>{row.name}</span><b>{row.priced}/5</b></small>)}
              </div>
            </div>
          )}
          <small style={{ color: "#8f8589", lineHeight: 1.35 }}>Theoretical ROI uses the existing £1-per-priced-pick Value Leader calculation.</small>
        </div>
      )}
    </div>,
    target,
  );
}
