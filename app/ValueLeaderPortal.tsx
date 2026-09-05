"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";

type Profile = { id: string; display_name: string; active: boolean; role: string };
type Prediction = { member_id: string; fixture_id: string; points_awarded: number | null };
type Fixture = { id: string; home_score?: number | null; away_score?: number | null; status?: string | null };
type FixtureStats = {
  id: string;
  homeShots: number | null;
  awayShots: number | null;
  homeShotsOnTarget: number | null;
  awayShotsOnTarget: number | null;
  homeScore: number | null;
  awayScore: number | null;
};
type StatsPayload = { fixtures?: FixtureStats[]; coverage?: number; finished?: number; pending?: number; backfilled?: number; error?: string };
type Row = {
  id: string;
  name: string;
  picks: number;
  wins: number;
  shots: number;
  shotsOnTarget: number;
  goals: number;
  avgShots: number;
  avgShotsOnTarget: number;
  avgGoals: number;
  conversion: number | null;
  shotsPerGoal: number | null;
  bttsRate: number;
};

async function accessToken() {
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token ?? "";
}

function findValueLeaderCard() {
  const labels = Array.from(document.querySelectorAll("span"));
  const label = labels.find((node) => /^VALUE LEADERS?$/.test(node.textContent?.trim() ?? ""));
  return label?.parentElement ?? null;
}

function rounded(value: number, digits = 1) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function leader(rows: Row[], metric: (row: Row) => number | null, direction: "high" | "low" = "high") {
  const scored = rows.map((row) => ({ row, value: metric(row) })).filter((item): item is { row: Row; value: number } => item.value != null && Number.isFinite(item.value));
  if (!scored.length) return null;
  const target = direction === "high" ? Math.max(...scored.map((item) => item.value)) : Math.min(...scored.map((item) => item.value));
  const names = scored.filter((item) => Math.abs(item.value - target) < 0.0001).map((item) => item.row.name).sort((a, b) => a.localeCompare(b));
  return { names, value: target };
}

export default function ValueLeaderPortal({ profiles, predictions, fixtures }: { profiles: Profile[]; predictions: Prediction[]; fixtures: Fixture[] }) {
  const [target, setTarget] = useState<Element | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<StatsPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const locate = () => setTarget(findValueLeaderCard());
    locate();
    const observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  async function loadStats() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/fixture-stats", {
        headers: { authorization: `Bearer ${await accessToken()}` },
        cache: "no-store",
      });
      const json = (await response.json()) as StatsPayload;
      if (!response.ok) throw new Error(json.error ?? "Could not load match statistics");
      setPayload(json);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load match statistics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && !payload && !loading) void loadStats();
  }, [open, payload, loading]);

  const rows = useMemo<Row[]>(() => {
    const statsMap = new Map((payload?.fixtures ?? []).map((row) => [row.id, row]));
    const fixtureMap = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
    return profiles
      .filter((profile) => profile.active && profile.role !== "guest")
      .map((profile) => {
        const memberPicks = predictions.filter((prediction) => prediction.member_id === profile.id && prediction.points_awarded !== null);
        const usable = memberPicks
          .map((prediction) => ({ prediction, fixture: fixtureMap.get(prediction.fixture_id), stats: statsMap.get(prediction.fixture_id) }))
          .filter((item) => item.stats && item.stats.homeShots != null && item.stats.awayShots != null && item.stats.homeShotsOnTarget != null && item.stats.awayShotsOnTarget != null);
        const shots = usable.reduce((sum, item) => sum + Number(item.stats!.homeShots) + Number(item.stats!.awayShots), 0);
        const shotsOnTarget = usable.reduce((sum, item) => sum + Number(item.stats!.homeShotsOnTarget) + Number(item.stats!.awayShotsOnTarget), 0);
        const goals = usable.reduce((sum, item) => sum + Number(item.stats!.homeScore ?? 0) + Number(item.stats!.awayScore ?? 0), 0);
        const wins = usable.filter((item) => item.prediction.points_awarded === 3).length;
        const picks = usable.length;
        return {
          id: profile.id,
          name: profile.display_name,
          picks,
          wins,
          shots,
          shotsOnTarget,
          goals,
          avgShots: picks ? shots / picks : 0,
          avgShotsOnTarget: picks ? shotsOnTarget / picks : 0,
          avgGoals: picks ? goals / picks : 0,
          conversion: shots > 0 ? (goals / shots) * 100 : null,
          shotsPerGoal: goals > 0 ? shots / goals : null,
          bttsRate: picks ? (wins / picks) * 100 : 0,
        };
      })
      .filter((row) => row.picks > 0)
      .sort((a, b) => b.picks - a.picks || a.name.localeCompare(b.name));
  }, [fixtures, payload, predictions, profiles]);

  const chanceMagnet = leader(rows, (row) => row.avgShots);
  const sharpshooter = leader(rows, (row) => row.avgShotsOnTarget);
  const clinical = leader(rows, (row) => row.conversion);
  const shotShy = leader(rows, (row) => row.avgShotsOnTarget, "low");
  const lowestConversion = leader(rows, (row) => row.conversion, "low");

  if (!target) return null;

  const coverage = Number(payload?.coverage ?? 0);
  const finished = Number(payload?.finished ?? 0);
  const primary = chanceMagnet;

  return createPortal(
    <div className="shotStatsReplacement" onClick={(event) => event.stopPropagation()}>
      <span className="shotStatsEyebrow">SHOT PERFORMANCE</span>
      <strong className="shotStatsLead">{primary ? primary.names.join(", ") : "—"}</strong>
      <small className="shotStatsLeadDetail">{primary ? `${rounded(primary.value)} avg combined shots` : "Open for direct match-stat performance"}</small>
      <button type="button" className="shotStatsToggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? "Hide shot stats −" : "View shot stats +"}
      </button>

      {open && (
        <div className="shotStatsBody">
          <div className="shotStatsExplainer">
            <strong>How these are calculated</strong>
            <small>Only finished picks with API-Football shot data are included. All figures come directly from Total Shots, Shots on Goal and the final score — there is no weighted or invented value score.</small>
            <small>Shot conversion = total goals ÷ total shots. Shots per goal = total shots ÷ total goals. BTTS rate = successful BTTS picks ÷ stat-covered finished picks.</small>
            <small>{loading ? "Loading match data…" : `${coverage}/${finished} finished selected fixtures currently have full shot coverage.`}</small>
            {Number(payload?.pending ?? 0) > 0 && <small>{payload?.pending} older fixture{payload?.pending === 1 ? "" : "s"} still await a stats backfill. Re-open later or use Refresh stats.</small>}
            {error && <small className="shotStatsError">{error}</small>}
            <button type="button" className="shotStatsRefresh" onClick={() => void loadStats()} disabled={loading}>{loading ? "Refreshing…" : "Refresh stats"}</button>
          </div>

          <div className="shotStatsAwards">
            <article><span>CHANCE MAGNET</span><strong>{chanceMagnet?.names.join(", ") ?? "—"}</strong><small>{chanceMagnet ? `${rounded(chanceMagnet.value)} avg combined shots` : "Awaiting data"}</small></article>
            <article><span>SHARPSHOOTER</span><strong>{sharpshooter?.names.join(", ") ?? "—"}</strong><small>{sharpshooter ? `${rounded(sharpshooter.value)} avg shots on target` : "Awaiting data"}</small></article>
            <article><span>CLINICAL PICKER</span><strong>{clinical?.names.join(", ") ?? "—"}</strong><small>{clinical ? `${rounded(clinical.value)}% shot conversion` : "Awaiting data"}</small></article>
            <article><span>SHOT SHY</span><strong>{shotShy?.names.join(", ") ?? "—"}</strong><small>{shotShy ? `${rounded(shotShy.value)} avg shots on target` : "Awaiting data"}</small></article>
            <article><span>COLDEST FINISHER</span><strong>{lowestConversion?.names.join(", ") ?? "—"}</strong><small>{lowestConversion ? `${rounded(lowestConversion.value)}% shot conversion` : "Awaiting data"}</small></article>
          </div>

          <div className="shotStatsTableWrap">
            <div className="shotStatsTableHead"><span>Member</span><span>Shots</span><span>SoT</span><span>Goals</span><span>Conv.</span><span>BTTS</span></div>
            {rows.length ? rows.map((row) => (
              <div className="shotStatsTableRow" key={row.id}>
                <span><strong>{row.name}</strong><small>{row.picks} stat-covered pick{row.picks === 1 ? "" : "s"}</small></span>
                <span>{rounded(row.avgShots)}</span>
                <span>{rounded(row.avgShotsOnTarget)}</span>
                <span>{rounded(row.avgGoals)}</span>
                <span>{row.conversion == null ? "—" : `${rounded(row.conversion)}%`}<small>{row.shotsPerGoal == null ? "—" : `${rounded(row.shotsPerGoal)} shots/goal`}</small></span>
                <span>{rounded(row.bttsRate)}%</span>
              </div>
            )) : <small className="shotStatsEmpty">No finished picks with complete shot statistics yet.</small>}
          </div>
        </div>
      )}
    </div>,
    target,
  );
}
