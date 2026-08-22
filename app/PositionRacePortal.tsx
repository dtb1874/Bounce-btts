"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { exportAnimatedShare } from "@/lib/animated-share";
import styles from "./PositionRacePortal.module.css";

type Profile = { id: string; display_name: string; active: boolean; role: string };
type Gameweek = { id: string; number: number };
type Prediction = { gameweek_id: string; member_id: string; points_awarded: number | null };
type Adjustment = { gameweek_id: string; member_id: string; points: number; reason: string };
type RaceRow = { id: string; name: string; points: number; wins: number; zeroZero: number; position: number };
type RaceFrame = { gameweek: number; rows: RaceRow[] };
type Props = { profiles: Profile[]; gameweeks: Gameweek[]; predictions: Prediction[]; adjustments: Adjustment[]; seasonLabel: string };

const PALETTE = ["#f1c46f", "#ef7e8c", "#7fc7ff", "#89d6a6", "#c99cff", "#ff9e67", "#8fd9d1", "#d8d0c2", "#f29fd2", "#a9c978"];
const MS_PER_GW = 650;
const SHARE_STEPS_PER_GW = 12;

function buildFrames({ profiles, gameweeks, predictions, adjustments }: Omit<Props, "seasonLabel">): RaceFrame[] {
  const players = profiles.filter((profile) => profile.active && profile.role !== "guest");
  const scoredWeeks = [...gameweeks]
    .filter((gw) => predictions.some((p) => p.gameweek_id === gw.id && p.points_awarded != null) || adjustments.some((a) => a.gameweek_id === gw.id))
    .sort((a, b) => a.number - b.number);
  const totals = new Map(players.map((player) => [player.id, { points: 0, wins: 0, zeroZero: 0 }]));
  return scoredWeeks.map((gw) => {
    for (const player of players) {
      const total = totals.get(player.id)!;
      const prediction = predictions.find((p) => p.gameweek_id === gw.id && p.member_id === player.id && p.points_awarded != null);
      const adjustment = adjustments.find((a) => a.gameweek_id === gw.id && a.member_id === player.id);
      const ignoreMissedAdjustment = Boolean(prediction && adjustment?.reason.trim().toLowerCase() === "missed selection");
      if (prediction?.points_awarded != null) {
        total.points += prediction.points_awarded;
        if (prediction.points_awarded === 3) total.wins += 1;
        if (prediction.points_awarded === -1) total.zeroZero += 1;
      }
      if (adjustment && !ignoreMissedAdjustment) total.points += adjustment.points;
    }
    const rows = players.map((player) => ({ id: player.id, name: player.display_name, ...totals.get(player.id)!, position: 0 }))
      .sort((a, b) => b.points - a.points || a.zeroZero - b.zeroZero || b.wins - a.wins || a.name.localeCompare(b.name));
    rows.forEach((row, index) => { row.position = index + 1; });
    return { gameweek: gw.number, rows };
  });
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function rowPosition(frames: RaceFrame[], frameIndex: number, playerId: string) {
  return frames[frameIndex]?.rows.find((row) => row.id === playerId)?.position ?? 1;
}

function pointsAtProgress(frames: RaceFrame[], playerId: string, progress: number) {
  if (!frames.length) return [] as Array<{ index: number; position: number; moving?: boolean }>;
  const clamped = Math.max(0, Math.min(frames.length - 1, progress));
  const whole = Math.floor(clamped);
  const frac = clamped - whole;
  const points = Array.from({ length: whole + 1 }, (_, index) => ({ index, position: rowPosition(frames, index, playerId) }));
  if (frac > 0 && whole < frames.length - 1) {
    const from = rowPosition(frames, whole, playerId);
    const to = rowPosition(frames, whole + 1, playerId);
    points.push({ index: whole + frac, position: from + (to - from) * frac, moving: true });
  }
  return points;
}

export default function PositionRacePortal(props: Props) {
  const [target, setTarget] = useState<Element | null>(null);
  const frames = useMemo(() => buildFrames(props), [props.profiles, props.gameweeks, props.predictions, props.adjustments]);
  const players = useMemo(() => frames.at(-1)?.rows.map((row) => ({ id: row.id, name: row.name })) ?? [], [frames]);
  const colourById = useMemo(() => new Map(players.map((player, index) => [player.id, PALETTE[index % PALETTE.length]])), [players]);
  const [progress, setProgress] = useState(Math.max(0, frames.length - 1));
  const [playing, setPlaying] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let host: HTMLDivElement | null = null;
    const placeHost = () => {
      const form = document.querySelector("#current-form");
      const dashboard = document.querySelector(".compactDashboard");
      if (!form || !dashboard || !dashboard.contains(form)) return;
      if (!host) {
        host = document.createElement("div");
        host.className = "positionRaceDashboardHost";
      }
      if (form.nextElementSibling !== host) form.insertAdjacentElement("afterend", host);
      setTarget(host);
    };
    placeHost();
    const observer = new MutationObserver(placeHost);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); host?.remove(); };
  }, []);

  useEffect(() => {
    if (!target) return;
    if (frames.length < 2) {
      setProgress(Math.max(0, frames.length - 1));
      setPlaying(false);
      return;
    }
    setProgress(0);
    setPlaying(true);
  }, [target, frames.length]);

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    let raf = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = now - previous;
      previous = now;
      setProgress((current) => {
        const next = current + elapsed / MS_PER_GW;
        if (next >= frames.length - 1) {
          setPlaying(false);
          return frames.length - 1;
        }
        return next;
      });
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [playing, frames.length]);

  if (!target) return null;
  const displayIndex = Math.max(0, Math.min(frames.length - 1, Math.ceil(progress - 0.001)));
  const currentFrame = frames[displayIndex];
  const width = 640, height = 300, left = 42, right = 612, top = 20, bottom = 250;
  const xFor = (index: number) => frames.length <= 1 ? (left + right) / 2 : left + (index / (frames.length - 1)) * (right - left);
  const yFor = (position: number) => top + ((position - 1) / Math.max(1, players.length - 1)) * (bottom - top);

  function move(delta: number) {
    setPlaying(false);
    setProgress((value) => Math.max(0, Math.min(frames.length - 1, Math.round(value) + delta)));
  }

  async function shareAnimation() {
    if (!frames.length || sharing) return;
    setSharing(true);
    try {
      const shareFrameCount = frames.length === 1 ? 1 : (frames.length - 1) * SHARE_STEPS_PER_GW + 1;
      await exportAnimatedShare({
        width: 1080,
        height: 1080,
        frameCount: shareFrameCount,
        frameDurationMs: Math.round(MS_PER_GW / SHARE_STEPS_PER_GW),
        finalHoldMs: 1600,
        filename: `bounce-league-race-${props.seasonLabel.replace(/[^0-9a-z]+/gi, "-")}.mp4`,
        title: `Bounce BTTS League Race · ${props.seasonLabel}`,
        drawFrame: (ctx, shareIndex) => {
          const shareProgress = frames.length === 1 ? 0 : Math.min(frames.length - 1, shareIndex / SHARE_STEPS_PER_GW);
          const shareDisplayIndex = Math.max(0, Math.min(frames.length - 1, Math.ceil(shareProgress - 0.001)));
          ctx.fillStyle = "#120d12"; ctx.fillRect(0, 0, 1080, 1080);
          ctx.fillStyle = "#651b35"; ctx.fillRect(0, 0, 1080, 152);
          ctx.fillStyle = "#f2dfcc"; ctx.font = "900 48px Georgia"; ctx.fillText("BOUNCE", 54, 62);
          ctx.fillStyle = "#d8b76f"; ctx.font = "900 29px Arial"; ctx.fillText("BTTS LEAGUE · POSITION RACE", 54, 106);
          ctx.fillStyle = "#e7d6c6"; ctx.font = "700 17px Arial"; ctx.fillText(`SEASON ${props.seasonLabel}`, 54, 135);
          ctx.fillStyle = "#d8b76f"; ctx.font = "900 35px Arial"; ctx.textAlign = "right"; ctx.fillText(`GW ${frames[shareDisplayIndex].gameweek}`, 1025, 94); ctx.textAlign = "left";
          const gx0 = 105, gx1 = 1020, gy0 = 210, gy1 = 760;
          const sx = (index: number) => frames.length <= 1 ? (gx0 + gx1) / 2 : gx0 + (index / (frames.length - 1)) * (gx1 - gx0);
          const sy = (position: number) => gy0 + ((position - 1) / Math.max(1, players.length - 1)) * (gy1 - gy0);
          for (let rank = 1; rank <= players.length; rank++) {
            const y = sy(rank);
            ctx.strokeStyle = "rgba(216,183,111,.13)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx0, y); ctx.lineTo(gx1, y); ctx.stroke();
            ctx.fillStyle = "#9c8b7e"; ctx.font = "700 15px Arial"; ctx.fillText(String(rank), 68, y + 5);
          }
          frames.forEach((frame, index) => {
            ctx.fillStyle = "#8e8177"; ctx.font = "700 13px Arial"; ctx.textAlign = "center"; ctx.fillText(`GW${frame.gameweek}`, sx(index), gy1 + 34); ctx.textAlign = "left";
          });
          players.forEach((player, playerIndex) => {
            const colour = PALETTE[playerIndex % PALETTE.length];
            const pts = pointsAtProgress(frames, player.id, shareProgress);
            ctx.strokeStyle = colour; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath();
            pts.forEach((point, index) => { if (index === 0) ctx.moveTo(sx(point.index), sy(point.position)); else ctx.lineTo(sx(point.index), sy(point.position)); });
            ctx.stroke();
            const last = pts.at(-1);
            if (last) { ctx.fillStyle = colour; ctx.beginPath(); ctx.arc(sx(last.index), sy(last.position), 9, 0, Math.PI * 2); ctx.fill(); }
          });
          players.forEach((player, playerIndex) => {
            const col = playerIndex % 4, row = Math.floor(playerIndex / 4), x = 72 + col * 252, y = 850 + row * 66;
            const colour = PALETTE[playerIndex % PALETTE.length];
            ctx.fillStyle = colour; ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#120d12"; ctx.font = "900 12px Arial"; ctx.textAlign = "center"; ctx.fillText(initials(player.name), x, y + 4); ctx.textAlign = "left";
            ctx.fillStyle = "#f1e5dc"; ctx.font = "800 16px Arial"; ctx.fillText(player.name, x + 30, y + 6);
          });
          ctx.fillStyle = "#8f8177"; ctx.font = "700 14px Arial"; ctx.fillText("1 = top of the league · positions use official Bounce tie-break rules", 54, 1027);
        },
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not create animated share.");
    } finally { setSharing(false); }
  }

  return createPortal(
    <section className={`${styles.shell} ${sharing ? styles.sharing : ""}`} aria-label="League position race">
      <div className={styles.head}>
        <div className={styles.title}><span>SEASON STORY</span><h3>League Position Race</h3><p>League position by gameweek.</p></div>
        <div className={styles.topActions}>
          <button className={`${styles.shareButton} dataShareButton shareCompactWhatsApp`} type="button" onClick={shareAnimation}>{sharing ? "Creating…" : "Share race"}</button>
          <div className={styles.picker}>
            <button type="button" onClick={() => move(-1)} aria-label="Previous gameweek">‹</button>
            <span>{currentFrame ? `GW ${currentFrame.gameweek}` : "—"}</span>
            <button type="button" onClick={() => move(1)} aria-label="Next gameweek">›</button>
            <button className={styles.playButton} type="button" onClick={() => { if (frames.length < 2) return; if (!playing && progress >= frames.length - 1) setProgress(0); setPlaying((value) => !value); }}>{playing ? "Pause" : "Play"}</button>
          </div>
        </div>
      </div>
      {currentFrame ? <>
        <div className={styles.graphWrap}>
          <svg className={styles.graph} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`League positions through gameweek ${currentFrame.gameweek}`}>
            {players.map((_, index) => { const rank = index + 1; const y = yFor(rank); return <g key={`rank-${rank}`}><line className={styles.grid} x1={left} x2={right} y1={y} y2={y}/><text className={styles.rank} x={16} y={y + 4}>{rank}</text></g>; })}
            {frames.map((frame, index) => <text key={frame.gameweek} className={styles.gwLabel} x={xFor(index)} y={bottom + 30} textAnchor="middle">GW{frame.gameweek}</text>)}
            {players.map((player, playerIndex) => {
              const points = pointsAtProgress(frames, player.id, progress);
              const polyline = points.map((point) => `${xFor(point.index)},${yFor(point.position)}`).join(" ");
              const last = points.at(-1);
              const colour = colourById.get(player.id) ?? PALETTE[playerIndex % PALETTE.length];
              return <g key={player.id}><polyline className={styles.raceLine} points={polyline} style={{ stroke: colour }}/>{points.filter((point) => !point.moving).map((point) => <circle key={`${player.id}-${point.index}`} className={styles.raceDot} cx={xFor(point.index)} cy={yFor(point.position)} r={3} style={{ fill: colour }}/>) }{last ? <circle className={styles.raceDot} cx={xFor(last.index)} cy={yFor(last.position)} r={5} style={{ fill: colour }}/> : null}</g>;
            })}
          </svg>
        </div>
        <div className={styles.legend}>{players.map((player, index) => <div key={player.id} className={styles.legendItem}><span className={styles.avatar} style={{ background: colourById.get(player.id) ?? PALETTE[index % PALETTE.length] }}>{initials(player.name)}</span><strong>{player.name}</strong></div>)}</div>
      </> : <div className={styles.empty}>The race starts once the first gameweek has been scored.</div>}
      <div className={styles.foot}><span>{frames.length} scored gameweek{frames.length === 1 ? "" : "s"}</span><span>~0.65 sec per GW</span></div>
    </section>, target,
  );
}
