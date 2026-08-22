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

type Props = {
  profiles: Profile[];
  gameweeks: Gameweek[];
  predictions: Prediction[];
  adjustments: Adjustment[];
  seasonLabel: string;
};

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

    const rows = players.map((player) => {
      const total = totals.get(player.id)!;
      return { id: player.id, name: player.display_name, ...total, position: 0 };
    }).sort((a, b) => b.points - a.points || a.zeroZero - b.zeroZero || b.wins - a.wins || a.name.localeCompare(b.name));
    rows.forEach((row, index) => { row.position = index + 1; });
    return { gameweek: gw.number, rows };
  });
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export default function PositionRacePortal(props: Props) {
  const [target, setTarget] = useState<Element | null>(null);
  const frames = useMemo(() => buildFrames(props), [props.profiles, props.gameweeks, props.predictions, props.adjustments]);
  const [frameIndex, setFrameIndex] = useState(Math.max(0, frames.length - 1));
  const [playing, setPlaying] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const findTarget = () => setTarget(document.querySelector(".compactDashboard"));
    findTarget();
    const observer = new MutationObserver(findTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setFrameIndex(Math.max(0, frames.length - 1));
  }, [frames.length]);

  useEffect(() => {
    if (!target || frames.length < 2) return;
    setFrameIndex(0);
    setPlaying(true);
  }, [target, frames.length]);

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const timer = window.setTimeout(() => {
      setFrameIndex((current) => {
        if (current >= frames.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [playing, frameIndex, frames.length]);

  if (!target) return null;
  const frame = frames[frameIndex];

  async function shareAnimation() {
    if (!frames.length || sharing) return;
    setSharing(true);
    try {
      await exportAnimatedShare({
        width: 720,
        height: 900,
        frameCount: frames.length,
        frameDurationMs: 700,
        finalHoldMs: 1400,
        filename: `bounce-league-race-${props.seasonLabel.replace(/[^0-9a-z]+/gi, "-")}.mp4`,
        title: `Bounce BTTS League Race · ${props.seasonLabel}`,
        drawFrame: (ctx, index) => {
          const current = frames[index];
          ctx.fillStyle = "#120d12";
          ctx.fillRect(0, 0, 720, 900);
          ctx.fillStyle = "#651b35";
          ctx.fillRect(0, 0, 720, 142);
          ctx.fillStyle = "#f2dfcc";
          ctx.font = "900 42px Georgia";
          ctx.fillText("BOUNCE", 40, 58);
          ctx.fillStyle = "#d8b76f";
          ctx.font = "900 28px Arial";
          ctx.fillText("BTTS LEAGUE", 40, 98);
          ctx.fillStyle = "#e7d6c6";
          ctx.font = "700 17px Arial";
          ctx.fillText(`SEASON ${props.seasonLabel} · LEAGUE POSITION RACE`, 40, 126);
          ctx.fillStyle = "#d8b76f";
          ctx.font = "900 34px Arial";
          ctx.textAlign = "right";
          ctx.fillText(`GW ${current.gameweek}`, 680, 88);
          ctx.textAlign = "left";

          current.rows.forEach((row, rowIndex) => {
            const y = 174 + rowIndex * 78;
            ctx.fillStyle = rowIndex === 0 ? "rgba(116,32,52,.78)" : rowIndex % 2 === 0 ? "#1c161d" : "#171218";
            roundedRect(ctx, 34, y, 652, 64, 12);
            ctx.fill();
            ctx.fillStyle = "#d8b76f";
            ctx.font = "900 20px Arial";
            ctx.fillText(String(row.position), 52, y + 40);
            ctx.fillStyle = "#f3e7de";
            ctx.font = "900 23px Arial";
            ctx.fillText(row.name, 105, y + 40);
            ctx.fillStyle = "#f3cf91";
            ctx.font = "900 22px Arial";
            ctx.textAlign = "right";
            ctx.fillText(`${row.points} pts`, 660, y + 40);
            ctx.textAlign = "left";
          });
          ctx.fillStyle = "#8f8177";
          ctx.font = "700 14px Arial";
          ctx.fillText("Position after each scored gameweek · Bounce BTTS League", 40, 862);
        },
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not create animated share.");
    } finally {
      setSharing(false);
    }
  }

  return createPortal(
    <section className={`${styles.shell} ${sharing ? styles.sharing : ""}`} aria-label="League position race">
      <div className={styles.head}>
        <div><span>SEASON STORY</span><h3>League Position Race</h3><p>Watch the table move gameweek by gameweek.</p></div>
        <div className={styles.controls}>
          <button className="dataShareButton shareCompactWhatsApp" type="button" onClick={shareAnimation}>{sharing ? "Creating…" : "Share race"}</button>
          <button type="button" onClick={() => { setPlaying(false); setFrameIndex((value) => Math.max(0, value - 1)); }} aria-label="Previous gameweek">‹</button>
          <span className={styles.gwBadge}>{frame ? `GW ${frame.gameweek}` : "—"}</span>
          <button type="button" onClick={() => { setPlaying(false); setFrameIndex((value) => Math.min(frames.length - 1, value + 1)); }} aria-label="Next gameweek">›</button>
          <button type="button" onClick={() => { if (frames.length < 2) return; if (!playing && frameIndex >= frames.length - 1) setFrameIndex(0); setPlaying((value) => !value); }}>{playing ? "Pause" : "Play"}</button>
        </div>
      </div>
      {frame ? <div className={styles.board}>{frame.rows.map((row) => <div key={row.id} className={`${styles.row} ${row.position === 1 ? styles.leader : ""}`} style={{ transform: `translateY(${(row.position - 1) * 30}px)` }}><span className={styles.pos}>{row.position}</span><strong className={styles.name}>{row.name}</strong><span className={styles.pts}>{row.points} pts</span></div>)}</div> : <div className={styles.empty}>The race starts once the first gameweek has been scored.</div>}
      <div className={styles.foot}><span>{frames.length} scored gameweek{frames.length === 1 ? "" : "s"}</span><span>~0.65 sec per GW</span></div>
    </section>,
    target,
  );
}
