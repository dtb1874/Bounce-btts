"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { exportAnimatedShare } from "@/lib/animated-share";
import type { LeagueStatsFixture, LeagueStatsPrediction } from "@/lib/league-stats";
import styles from "./SweepTracker.module.css";

type Gameweek = { id: string; number: number };
type Point = { gameweek: number; goalsAway: number };
type AnimatedPoint = Point & { index: number; moving?: boolean };

type Props = {
  seasonLabel: string;
  gameweeks: Gameweek[];
  predictions: LeagueStatsPrediction[];
  fixtures: LeagueStatsFixture[];
};

const FINISHED = new Set(["FT", "AET", "PEN"]);
const MS_PER_GW = 650;
const SHARE_STEPS_PER_GW = 12;

function buildPoints({ gameweeks, predictions, fixtures }: Omit<Props, "seasonLabel">): Point[] {
  const fixtureById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  return [...gameweeks]
    .sort((a, b) => a.number - b.number)
    .map((gw) => {
      const weekPicks = predictions.filter((prediction) => prediction.gameweek_id === gw.id);
      if (!weekPicks.length) return null;
      const selectedFixtures = weekPicks.map((prediction) => fixtureById.get(prediction.fixture_id)).filter(Boolean) as LeagueStatsFixture[];
      if (selectedFixtures.length !== weekPicks.length) return null;
      if (!selectedFixtures.every((fixture) => fixture.home_score != null && fixture.away_score != null && (!fixture.status || FINISHED.has(fixture.status)))) return null;
      const goalsAway = selectedFixtures.reduce((sum, fixture) => {
        const home = fixture.home_score ?? 0;
        const away = fixture.away_score ?? 0;
        if (home > 0 && away > 0) return sum;
        if (home === 0 && away === 0) return sum + 2;
        return sum + 1;
      }, 0);
      return { gameweek: gw.number, goalsAway };
    })
    .filter((point): point is Point => Boolean(point));
}

function pointsAtProgress(points: Point[], progress: number): AnimatedPoint[] {
  if (!points.length) return [];
  const clamped = Math.max(0, Math.min(points.length - 1, progress));
  const whole = Math.floor(clamped);
  const frac = clamped - whole;
  const visible: AnimatedPoint[] = points.slice(0, whole + 1).map((point, index) => ({ ...point, index }));
  if (frac > 0 && whole < points.length - 1) {
    const from = points[whole];
    const to = points[whole + 1];
    visible.push({
      gameweek: to.gameweek,
      goalsAway: from.goalsAway + (to.goalsAway - from.goalsAway) * frac,
      index: whole + frac,
      moving: true,
    });
  }
  return visible;
}

function drawChart(ctx: CanvasRenderingContext2D, points: Point[], progress: number, seasonLabel: string) {
  const width = 900, height = 620;
  ctx.fillStyle = "#120d12";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#651b35";
  ctx.fillRect(0, 0, width, 128);
  ctx.fillStyle = "#f2dfcc";
  ctx.font = "900 40px Georgia";
  ctx.fillText("BOUNCE", 42, 54);
  ctx.fillStyle = "#d8b76f";
  ctx.font = "900 27px Arial";
  ctx.fillText("BTTS LEAGUE", 42, 91);
  ctx.fillStyle = "#e7d6c6";
  ctx.font = "700 17px Arial";
  ctx.fillText(`SEASON ${seasonLabel} · GOALS AWAY FROM THE SWEEP`, 42, 115);

  const visible = pointsAtProgress(points, progress);
  const maxValue = Math.max(3, ...points.map((point) => point.goalsAway));
  const left = 70, right = 850, top = 175, bottom = 510;
  const xFor = (index: number) => points.length === 1 ? (left + right) / 2 : left + (index / (points.length - 1)) * (right - left);
  const yFor = (value: number) => bottom - (value / maxValue) * (bottom - top);

  ctx.strokeStyle = "rgba(216,183,111,.16)";
  ctx.lineWidth = 1;
  for (let value = 0; value <= maxValue; value += 1) {
    const y = yFor(value);
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    ctx.fillStyle = "#9f8f83"; ctx.font = "700 13px Arial"; ctx.fillText(String(value), 48, y + 4);
  }

  points.forEach((point, index) => {
    ctx.fillStyle = "#9f8f83";
    ctx.font = "700 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`GW ${point.gameweek}`, xFor(index), bottom + 28);
  });

  if (visible.length) {
    ctx.strokeStyle = "#d8b76f";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    visible.forEach((point, index) => {
      const x = xFor(point.index);
      const y = yFor(point.goalsAway);
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    visible.forEach((point) => {
      const x = xFor(point.index);
      const y = yFor(point.goalsAway);
      ctx.fillStyle = "#6f2036";
      ctx.strokeStyle = "#f0cd87";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, point.moving ? 9 : 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (!point.moving) {
        ctx.fillStyle = "#f2dfcc";
        ctx.font = "900 15px Arial";
        ctx.textAlign = "center";
        ctx.fillText(String(point.goalsAway), x, y - 16);
      }
    });

    const displayIndex = Math.max(0, Math.min(points.length - 1, Math.ceil(progress - 0.001)));
    const display = points[displayIndex];
    ctx.textAlign = "left";
    ctx.fillStyle = "#f2dfcc"; ctx.font = "900 24px Arial";
    ctx.fillText(`GW ${display.gameweek}: ${display.goalsAway} goal${display.goalsAway === 1 ? "" : "s"} away`, 42, 568);
  }
  ctx.textAlign = "left";
  ctx.fillStyle = "#8f8177"; ctx.font = "700 13px Arial";
  ctx.fillText("0 means every selected match landed BTTS · score-nil = 1 · 0-0 = 2", 42, 596);
}

export default function SweepTracker(props: Props) {
  const [target, setTarget] = useState<Element | null>(null);
  const points = useMemo(() => buildPoints(props), [props.gameweeks, props.predictions, props.fixtures]);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const findTarget = () => setTarget(document.querySelector('section[class*="leaguePage"]'));
    findTarget();
    const observer = new MutationObserver(findTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  if (!target) return null;
  const maxValue = Math.max(3, ...points.map((point) => point.goalsAway));
  const latest = points[points.length - 1];
  const viewWidth = 620, viewHeight = 250, left = 34, right = 600, top = 22, bottom = 205;
  const coords = points.map((point, index) => ({
    ...point,
    x: points.length === 1 ? (left + right) / 2 : left + (index / (points.length - 1)) * (right - left),
    y: bottom - (point.goalsAway / maxValue) * (bottom - top),
  }));
  const polyline = coords.map((point) => `${point.x},${point.y}`).join(" ");

  async function shareAnimation() {
    if (!points.length || sharing) return;
    setSharing(true);
    try {
      const frameCount = points.length === 1 ? 1 : (points.length - 1) * SHARE_STEPS_PER_GW + 1;
      await exportAnimatedShare({
        width: 900,
        height: 620,
        frameCount,
        frameDurationMs: Math.round(MS_PER_GW / SHARE_STEPS_PER_GW),
        finalHoldMs: 1400,
        filename: `bounce-sweep-tracker-${props.seasonLabel.replace(/[^0-9a-z]+/gi, "-")}.mp4`,
        title: `Bounce BTTS · Goals Away From The Sweep · ${props.seasonLabel}`,
        drawFrame: (ctx, index) => {
          const progress = points.length === 1 ? 0 : Math.min(points.length - 1, index / SHARE_STEPS_PER_GW);
          drawChart(ctx, points, progress, props.seasonLabel);
        },
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not create animated share.");
    } finally {
      setSharing(false);
    }
  }

  return createPortal(<section className={`${styles.shell} ${sharing ? styles.sharing : ""}`}>
    <div className={styles.head}>
      <div><span>WEEKLY NEAR-MISS TRACKER</span><h3>Goals Away From The Sweep</h3><p>How many extra goals were needed for every selected match to land BTTS.</p></div>
      <button className="dataShareButton shareCompactWhatsApp" type="button" onClick={shareAnimation}>{sharing ? "Creating…" : "Share tracker"}</button>
    </div>
    {points.length ? <>
      <svg className={styles.chart} viewBox={`0 0 ${viewWidth} ${viewHeight}`} role="img" aria-label="Goals away from all BTTS wins by gameweek">
        {Array.from({ length: maxValue + 1 }, (_, value) => {
          const y = bottom - (value / maxValue) * (bottom - top);
          return <g key={value}><line className={styles.grid} x1={left} x2={right} y1={y} y2={y}/><text className={styles.axisText} x={8} y={y + 3}>{value}</text></g>;
        })}
        {coords.map((point) => <text key={`gw-${point.gameweek}`} className={styles.axisText} x={point.x} y={bottom + 24} textAnchor="middle">GW {point.gameweek}</text>)}
        <polyline className={styles.line} points={polyline}/>
        {coords.map((point) => <g key={point.gameweek}><circle className={styles.dot} cx={point.x} cy={point.y} r={5}/><text className={styles.value} x={point.x} y={point.y - 10} textAnchor="middle">{point.goalsAway}</text></g>)}
      </svg>
      <div className={styles.summary}><span>0 = complete BTTS sweep</span><strong>{latest ? `Latest: GW ${latest.gameweek} · ${latest.goalsAway} away` : ""}</strong></div>
    </> : <div className={styles.summary}><span>The tracker starts once a gameweek is fully scored.</span></div>}
  </section>, target);
}
