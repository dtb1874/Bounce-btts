"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./race-share.module.css";

type SharedPlayer = { id: string; name: string; colour: string };
type SharedFrame = { gameweek: number; positions: Record<string, number> };
type SharedRacePayload = { v: 1; seasonLabel: string; players: SharedPlayer[]; frames: SharedFrame[]; selected: string[] };
type RacePoint = { index: number; position: number; moving?: boolean };

const MS_PER_GW = 650;

function decodePayload(value: string): SharedRacePayload | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as SharedRacePayload;
    if (parsed?.v !== 1 || !Array.isArray(parsed.players) || !Array.isArray(parsed.frames)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function rowPosition(frames: SharedFrame[], frameIndex: number, playerId: string) {
  return frames[frameIndex]?.positions[playerId] ?? 1;
}

function pointsAtProgress(frames: SharedFrame[], playerId: string, progress: number): RacePoint[] {
  if (!frames.length) return [];
  const clamped = Math.max(0, Math.min(frames.length - 1, progress));
  const whole = Math.floor(clamped);
  const frac = clamped - whole;
  const points: RacePoint[] = Array.from({ length: whole + 1 }, (_, index) => ({ index, position: rowPosition(frames, index, playerId) }));
  if (frac > 0 && whole < frames.length - 1) {
    const from = rowPosition(frames, whole, playerId);
    const to = rowPosition(frames, whole + 1, playerId);
    points.push({ index: whole + frac, position: from + (to - from) * frac, moving: true });
  }
  return points;
}

export default function RaceSharePage() {
  const [payload, setPayload] = useState<SharedRacePayload | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("d");
    if (!value) { setInvalid(true); return; }
    const decoded = decodePayload(value);
    if (!decoded) { setInvalid(true); return; }
    setPayload(decoded);
    setSelectedIds(new Set(decoded.selected?.length ? decoded.selected : decoded.players.map((player) => player.id)));
    setProgress(0);
    setPlaying(decoded.frames.length > 1);
  }, []);

  useEffect(() => {
    if (!payload || !playing || payload.frames.length < 2) return;
    let raf = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = now - previous;
      previous = now;
      setProgress((current) => {
        const next = current + elapsed / MS_PER_GW;
        if (next >= payload.frames.length - 1) {
          setPlaying(false);
          return payload.frames.length - 1;
        }
        return next;
      });
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [payload, playing]);

  const visiblePlayers = useMemo(() => payload?.players.filter((player) => selectedIds.has(player.id)) ?? [], [payload, selectedIds]);

  if (invalid) return <main className={styles.page}><section className={styles.card}><span className={styles.kicker}>BOUNCE BTTS</span><h1>League Position Race</h1><p>This shared race link is invalid or incomplete.</p></section></main>;
  if (!payload) return <main className={styles.page}><section className={styles.card}><p>Loading race…</p></section></main>;

  const { frames, players } = payload;
  const displayIndex = Math.max(0, Math.min(frames.length - 1, Math.ceil(progress - 0.001)));
  const currentFrame = frames[displayIndex];
  const width = 720, height = 360, left = 52, right = 690, top = 26, bottom = 300;
  const xFor = (index: number) => frames.length <= 1 ? (left + right) / 2 : left + (index / (frames.length - 1)) * (right - left);
  const yFor = (position: number) => top + ((position - 1) / Math.max(1, players.length - 1)) * (bottom - top);

  function move(delta: number) {
    setPlaying(false);
    setProgress((value) => Math.max(0, Math.min(frames.length - 1, Math.round(value) + delta)));
  }

  function togglePlayer(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function togglePlay() {
    if (frames.length < 2) return;
    if (!playing && progress >= frames.length - 1) setProgress(0);
    setPlaying((value) => !value);
  }

  function showAll() {
    setSelectedIds(new Set(players.map((player) => player.id)));
  }

  return <main className={styles.page}>
    <section className={styles.card}>
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>BOUNCE BTTS · SHARED RACE</span>
          <h1>League Position Race</h1>
          <p>Season {payload.seasonLabel} · tap players to show or hide lines.</p>
        </div>
        <div className={styles.controls}>
          <button type="button" onClick={() => move(-1)} aria-label="Previous gameweek">‹</button>
          <span>{currentFrame ? `GW ${currentFrame.gameweek}` : "—"}</span>
          <button type="button" onClick={() => move(1)} aria-label="Next gameweek">›</button>
          <button type="button" className={styles.play} onClick={togglePlay}>{playing ? "Pause" : "Play"}</button>
        </div>
      </header>

      <div className={styles.graphWrap}>
        <svg className={styles.graph} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`League positions through gameweek ${currentFrame?.gameweek ?? ""}`}>
          {players.map((_, index) => { const rank = index + 1; const y = yFor(rank); return <g key={`rank-${rank}`}><line className={styles.grid} x1={left} x2={right} y1={y} y2={y}/><text className={styles.rank} x={20} y={y + 4}>{rank}</text></g>; })}
          {frames.map((frame, index) => <text key={frame.gameweek} className={styles.gwLabel} x={xFor(index)} y={bottom + 34} textAnchor="middle">GW{frame.gameweek}</text>)}
          {visiblePlayers.map((player) => {
            const points = pointsAtProgress(frames, player.id, progress);
            const polyline = points.map((point) => `${xFor(point.index)},${yFor(point.position)}`).join(" ");
            const last = points.at(-1);
            return <g key={player.id}><polyline className={styles.raceLine} points={polyline} style={{ stroke: player.colour }}/>{points.slice(0, -1).filter((point) => !point.moving).map((point) => <circle key={`${player.id}-${point.index}`} className={styles.raceDot} cx={xFor(point.index)} cy={yFor(point.position)} r={3.5} style={{ fill: player.colour }}/>) }{last ? <circle className={styles.raceDot} cx={xFor(last.index)} cy={yFor(last.position)} r={6} style={{ fill: player.colour }}/> : null}</g>;
          })}
        </svg>
      </div>

      <div className={styles.legendTop}><span>{visiblePlayers.length} of {players.length} players shown</span><button type="button" onClick={showAll}>Show all</button></div>
      <div className={styles.legend}>{players.map((player) => {
        const selected = selectedIds.has(player.id);
        return <button key={player.id} type="button" className={`${styles.legendItem} ${selected ? "" : styles.legendOff}`} onClick={() => togglePlayer(player.id)} aria-pressed={selected}>
          <span className={styles.avatar} style={{ background: player.colour }}>{initials(player.name)}</span><strong>{player.name}</strong>
        </button>;
      })}</div>
      <footer className={styles.footer}><span>1 = top of the league</span><span>~0.65 sec per GW</span></footer>
    </section>
  </main>;
}
