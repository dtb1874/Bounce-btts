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

function MemberRows({ rows, mobile = false }: { rows: Row[]; mobile?: boolean }) {
  if (!rows.length) return <small className="shotStatsEmpty">No finished picks with complete shot statistics yet.</small>;
  if (mobile) {
    return <div className="shotStatsMobileRows">{rows.map((row) => (
      <article className="shotStatsMobileRow" key={row.id}>
        <div className="shotStatsMobileMember"><strong>{row.name}</strong><small>{row.picks} covered pick{row.picks === 1 ? "" : "s"}</small></div>
        <div className="shotStatsMobileMetrics">
          <span><small>AVG TOTAL SHOTS</small><b>{rounded(row.avgShots)}</b></span>
          <span><small>AVG ON TARGET</small><b>{rounded(row.avgShotsOnTarget)}</b></span>
          <span><small>AVG GOALS</small><b>{rounded(row.avgGoals)}</b></span>
          <span><small>SHOT CONVERSION</small><b>{row.conversion == null ? "—" : `${rounded(row.conversion)}%`}</b></span>
          <span><small>SHOTS / GOAL</small><b>{row.shotsPerGoal == null ? "—" : rounded(row.shotsPerGoal)}</b></span>
        </div>
      </article>
    ))}</div>;
  }
  return <>{rows.map((row) => (
    <div className="shotStatsTableRow" key={row.id}>
      <span><strong>{row.name}</strong><small>{row.picks} covered pick{row.picks === 1 ? "" : "s"}</small></span>
      <span>{rounded(row.avgShots)}</span>
      <span>{rounded(row.avgShotsOnTarget)}</span>
      <span>{rounded(row.avgGoals)}</span>
      <span>{row.conversion == null ? "—" : `${rounded(row.conversion)}%`}<small>{row.shotsPerGoal == null ? "—" : `${rounded(row.shotsPerGoal)} shots/goal`}</small></span>
    </div>
  ))}</>;
}

export default function ValueLeaderPortal({ profiles, predictions, fixtures }: { profiles: Profile[]; predictions: Prediction[]; fixtures: Fixture[] }) {
  const [target, setTarget] = useState<Element | null>(null);
  const [open, setOpen] = useState(false);
  const [mobileTableOpen, setMobileTableOpen] = useState(false);
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

  useEffect(() => {
    if (!mobileTableOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileTableOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [mobileTableOpen]);

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
    if (open && !payload && !loading && !error) void loadStats();
  }, [open, payload, loading, error]);

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
  const coverageLabel = payload && finished > 0 ? `${coverage}/${finished} GAME DATA AVAILABLE` : "PARTIAL GAME DATA";

  const card = createPortal(
    <div className="shotStatsReplacement" onClick={(event) => event.stopPropagation()}>
      <span className="shotStatsEyebrow">SHOT PERFORMANCE <b className="shotStatsCoverageBadge">{coverageLabel}</b></span>
      <strong className="shotStatsLead">{primary ? primary.names.join(", ") : "—"}</strong>
      <small className="shotStatsLeadDetail">{primary ? `${rounded(primary.value)} average total shots across both teams in covered picks` : "Open for direct match-stat performance"}</small>
      <button type="button" className="shotStatsToggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? "Hide shot stats −" : "View shot stats +"}
      </button>

      {open && (
        <div className="shotStatsBody">
          <div className="shotStatsExplainer">
            <strong>What you are looking at</strong>
            <small>Every figure is based on the full match each member selected, so “shots” means the home and away teams added together. We then average those match totals across that member’s covered picks.</small>
            <small><b>Avg total shots</b> = both teams’ shots per selected match. <b>Avg on target</b> = both teams’ shots on target. <b>Avg goals</b> = final goals in the selected match.</small>
            <small><b>Shot conversion</b> = goals ÷ total shots. <b>Shots/goal</b> = total shots ÷ goals. BTTS success is deliberately kept out of this table because it is already tracked elsewhere in the league and is not a shot-performance metric.</small>
            <small>{loading ? "Loading match data…" : `${coverage}/${finished} finished selected fixtures currently have full shot coverage.`}</small>
            {Number(payload?.pending ?? 0) > 0 && <small>{payload?.pending} older fixture{payload?.pending === 1 ? "" : "s"} still await a stats backfill. Use Refresh stats to process the next batch.</small>}
            {error && <small className="shotStatsError">Stats could not be loaded: {error}. Automatic retries have stopped; use Refresh stats to try again.</small>}
            <button type="button" className="shotStatsRefresh" onClick={() => void loadStats()} disabled={loading}>{loading ? "Refreshing…" : error ? "Try stats again" : "Refresh stats"}</button>
          </div>

          <div className="shotStatsAwards">
            <article><span>CHANCE MAGNET</span><strong>{chanceMagnet?.names.join(", ") ?? "—"}</strong><small>{chanceMagnet ? `${rounded(chanceMagnet.value)} avg total shots` : "Awaiting data"}</small><em>Highest average total shots across both teams in selected matches.</em></article>
            <article><span>SHARPSHOOTER</span><strong>{sharpshooter?.names.join(", ") ?? "—"}</strong><small>{sharpshooter ? `${rounded(sharpshooter.value)} avg on target` : "Awaiting data"}</small><em>Highest average shots on target across both teams.</em></article>
            <article><span>CLINICAL PICKER</span><strong>{clinical?.names.join(", ") ?? "—"}</strong><small>{clinical ? `${rounded(clinical.value)}% conversion` : "Awaiting data"}</small><em>Highest goals-to-total-shots conversion across covered picks.</em></article>
            <article><span>SHOT SHY</span><strong>{shotShy?.names.join(", ") ?? "—"}</strong><small>{shotShy ? `${rounded(shotShy.value)} avg on target` : "Awaiting data"}</small><em>Lowest average shots on target across both teams.</em></article>
            <article><span>COLDEST FINISHER</span><strong>{lowestConversion?.names.join(", ") ?? "—"}</strong><small>{lowestConversion ? `${rounded(lowestConversion.value)}% conversion` : "Awaiting data"}</small><em>Lowest goals-to-total-shots conversion across covered picks.</em></article>
          </div>

          <button type="button" className="shotStatsMobileOpen" onClick={() => setMobileTableOpen(true)}>View full member stats ↗</button>
          <div className="shotStatsTableWrap">
            <div className="shotStatsTableHead"><span>Member</span><span>Avg shots</span><span>Avg SoT</span><span>Avg goals</span><span>Conversion</span></div>
            <MemberRows rows={rows}/>
          </div>
        </div>
      )}
    </div>,
    target,
  );

  const mobileOverlay = mobileTableOpen ? createPortal(
    <div className="shotStatsOverlay" role="dialog" aria-modal="true" aria-label="Full member shot statistics" onClick={() => setMobileTableOpen(false)}>
      <section className="shotStatsOverlayCard" onClick={(event) => event.stopPropagation()}>
        <header><div><span>SHOT PERFORMANCE</span><h2>Member stats</h2><small>Current season · {coverage}/{finished} covered finished picks</small></div><button type="button" aria-label="Close member stats" onClick={() => setMobileTableOpen(false)}>×</button></header>
        <div className="shotStatsOverlayKey"><small><b>All shot figures combine both teams in the selected match.</b> Conversion = goals ÷ shots. Shots/goal = total shots ÷ goals.</small></div>
        <MemberRows rows={rows} mobile/>
      </section>
    </div>,
    document.body,
  ) : null;

  return <>{card}{mobileOverlay}</>;
}
