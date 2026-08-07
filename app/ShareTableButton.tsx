"use client";

import { useState } from "react";
import type { PublicStandingRow } from "@/lib/public-table";

type ShareTableButtonProps = {
  rows: PublicStandingRow[];
  seasonLabel: string;
  prizePot: number;
  gameweekNumber?: number | null;
  className?: string;
  compact?: boolean;
};

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function drawWindowGrid(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  columns: number,
  rows: number,
) {
  context.strokeRect(x, y, width, height);

  for (let i = 1; i < columns; i += 1) {
    const colX = x + (width / columns) * i;
    context.beginPath();
    context.moveTo(colX, y);
    context.lineTo(colX, y + height);
    context.stroke();
  }

  for (let i = 1; i < rows; i += 1) {
    const rowY = y + (height / rows) * i;
    context.beginPath();
    context.moveTo(x, rowY);
    context.lineTo(x + width, rowY);
    context.stroke();
  }
}

function drawTynecastleFacadeWatermark(
  context: CanvasRenderingContext2D,
  canvasWidth: number,
  tableTop: number,
  tableHeight: number,
) {
  const drawingWidth = 1080;
  const drawingHeight = 520;
  const scale = Math.min(
    (canvasWidth * 0.86) / drawingWidth,
    (tableHeight * 0.92) / drawingHeight,
  );
  const x = (canvasWidth - drawingWidth * scale) / 2;
  const y = tableTop + (tableHeight - drawingHeight * scale) / 2;

  context.save();
  context.translate(x, y);
  context.scale(scale, scale);

  context.globalAlpha = 0.12;
  context.strokeStyle = "#d8bf84";
  context.fillStyle = "#d8bf84";
  context.lineWidth = 3;
  context.lineCap = "round";
  context.lineJoin = "round";

  // Stadium roof strip and upper frontage.
  context.strokeRect(55, 38, 970, 28);
  for (let i = 1; i < 22; i += 1) {
    const mullion = 55 + (970 / 22) * i;
    context.beginPath();
    context.moveTo(mullion, 38);
    context.lineTo(mullion, 66);
    context.stroke();
  }

  // Main facade body.
  context.strokeRect(72, 66, 936, 278);
  for (let i = 1; i < 17; i += 1) {
    const mullion = 72 + (936 / 17) * i;
    context.beginPath();
    context.moveTo(mullion, 66);
    context.lineTo(mullion, 344);
    context.stroke();
  }

  [118, 176, 234, 292].forEach((lineY) => {
    context.beginPath();
    context.moveTo(72, lineY);
    context.lineTo(1008, lineY);
    context.stroke();
  });

  // Central sign and crest.
  context.font = "700 20px Georgia, serif";
  context.textAlign = "center";
  context.fillText("TYNECASTLE PARK", 540, 104);

  context.beginPath();
  context.moveTo(540, 125);
  context.lineTo(582, 150);
  context.lineTo(566, 205);
  context.lineTo(540, 228);
  context.lineTo(514, 205);
  context.lineTo(498, 150);
  context.closePath();
  context.stroke();

  context.beginPath();
  context.arc(540, 174, 30, 0, Math.PI * 2);
  context.stroke();

  // Glazing emphasis around the middle strip.
  drawWindowGrid(context, 92, 124, 388, 94, 6, 2);
  drawWindowGrid(context, 600, 124, 388, 94, 6, 2);
  drawWindowGrid(context, 92, 236, 388, 72, 6, 1);
  drawWindowGrid(context, 600, 236, 388, 72, 6, 1);

  // Lower brick/entrance zone.
  context.strokeRect(72, 344, 936, 78);
  [150, 264, 380, 702, 816, 932].forEach((doorX) => {
    context.strokeRect(doorX, 350, 48, 62);
  });
  context.strokeRect(448, 350, 184, 62);

  // Centre lower sign strip.
  context.beginPath();
  context.moveTo(418, 338);
  context.lineTo(662, 338);
  context.stroke();

  // Forecourt diamond and centre motif.
  context.beginPath();
  context.moveTo(540, 498);
  context.lineTo(782, 430);
  context.lineTo(540, 360);
  context.lineTo(298, 430);
  context.closePath();
  context.stroke();

  context.beginPath();
  context.moveTo(540, 474);
  context.lineTo(728, 430);
  context.lineTo(540, 385);
  context.lineTo(352, 430);
  context.closePath();
  context.stroke();

  context.beginPath();
  context.moveTo(540, 455);
  context.bezierCurveTo(575, 430, 590, 400, 540, 382);
  context.bezierCurveTo(490, 400, 505, 430, 540, 455);
  context.closePath();
  context.stroke();

  context.beginPath();
  context.arc(540, 420, 26, 0, Math.PI * 2);
  context.stroke();

  context.restore();
}

async function createSnapshot(
  rows: PublicStandingRow[],
  seasonLabel: string,
  prizePot: number,
  gameweekNumber: number | null,
  liveUrl: string,
) {
  const width = 1200;
  const rowHeight = 76;
  const headerHeight = 292;
  const footerHeight = 135;
  const tableHeight = Math.max(rows.length, 1) * rowHeight;
  const height = headerHeight + tableHeight + footerHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Your browser could not create the table image.");
  }

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#090a0e");
  background.addColorStop(0.58, "#121117");
  background.addColorStop(1, "#2b1018");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(116, 32, 52, 0.24)";
  context.beginPath();
  context.arc(1060, 120, 235, 0, Math.PI * 2);
  context.fill();

  drawTynecastleFacadeWatermark(context, width, headerHeight, tableHeight);

  context.fillStyle = "#e8dac7";
  context.font = "700 76px Georgia, serif";
  context.fillText("BOUNCE", 72, 104);
  context.fillStyle = "#c7af95";
  context.font = "600 28px Georgia, serif";
  context.fillText("BTTS LEAGUE", 76, 148);

  context.fillStyle = "#a68875";
  context.font = "600 18px Arial, sans-serif";
  context.fillText(
    `SEASON ${seasonLabel}${gameweekNumber ? `  •  GAMEWEEK ${gameweekNumber}` : ""}  •  EST 2024`,
    76,
    190,
  );

  context.fillStyle = "#e7d3bc";
  context.font = "700 22px Arial, sans-serif";
  context.fillText(`PRIZE POT £${prizePot.toFixed(0)}`, 930, 190);

  context.strokeStyle = "#69303e";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(72, 222);
  context.lineTo(1128, 222);
  context.stroke();

  const columns = [80, 160, 690, 785, 875, 975, 1080];
  const labels = ["POS", "PLAYER", "P", "W", "S-N", "0-0", "PTS"];
  context.fillStyle = "#9f9893";
  context.font = "700 18px Arial, sans-serif";
  labels.forEach((label, index) => context.fillText(label, columns[index], 264));

  rows.forEach((row, index) => {
    const y = headerHeight + index * rowHeight;

    if (index === 0) {
      context.fillStyle = "rgba(103, 31, 48, 0.78)";
      roundedRect(context, 60, y + 5, 1080, rowHeight - 10, 12);
      context.fill();
    } else if (index % 2 === 1) {
      context.fillStyle = "rgba(255,255,255,0.025)";
      context.fillRect(60, y + 5, 1080, rowHeight - 10);
    }

    context.fillStyle = index === 0 ? "#fff1df" : "#eee8e0";
    context.font = "700 24px Arial, sans-serif";
    context.fillText(String(index + 1), columns[0], y + 49);
    context.font = "700 25px Arial, sans-serif";
    context.fillText(row.name.slice(0, 34), columns[1], y + 49);
    context.font = "600 23px Arial, sans-serif";
    context.fillText(String(row.played), columns[2], y + 49);
    context.fillText(String(row.wins), columns[3], y + 49);
    context.fillText(
      String(
        (row as PublicStandingRow & { oneSided?: number; scoreNilCount?: number }).oneSided ??
          (row as PublicStandingRow & { scoreNilCount?: number }).scoreNilCount ??
          0,
      ),
      columns[4],
      y + 49,
    );
    context.fillText(String(row.zeroZeroCount), columns[5], y + 49);

    context.fillStyle = "#f0cfaa";
    context.font = "800 27px Arial, sans-serif";
    context.fillText(String(row.points), columns[6], y + 49);

    context.strokeStyle = "rgba(255,255,255,0.08)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(72, y + rowHeight);
    context.lineTo(1128, y + rowHeight);
    context.stroke();
  });

  const footerY = headerHeight + tableHeight;
  context.fillStyle = "#8f8781";
  context.font = "500 17px Arial, sans-serif";
  context.fillText("Ties: fewest 0–0s, most BTTS wins, then alphabetical.", 72, footerY + 48);

  context.fillStyle = "#dbc1a6";
  context.font = "700 19px Arial, sans-serif";
  context.fillText(liveUrl.replace(/^https?:\/\//, ""), 72, footerY + 86);

  context.fillStyle = "#857b76";
  context.font = "500 15px Arial, sans-serif";
  context.fillText(`Live table snapshot • ${new Date().toLocaleString("en-GB")}`, 770, footerY + 86);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("The table image could not be generated."))),
      "image/jpeg",
      0.94,
    );
  });

  return new File([blob], `bounce-btts-table-${seasonLabel.replace("/", "-")}.jpg`, {
    type: "image/jpeg",
  });
}

export default function ShareTableButton({
  rows,
  seasonLabel,
  prizePot,
  gameweekNumber = null,
  className = "",
  compact = false,
}: ShareTableButtonProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function share() {
    if (busy) return;
    setBusy(true);
    setMessage("");

    try {
      const liveUrl = `${window.location.origin}/table`;
      const file = await createSnapshot(rows, seasonLabel, prizePot, gameweekNumber, liveUrl);
      const text =
        `Bounce BTTS League table — Season ${seasonLabel}` +
        `${gameweekNumber ? ` — Gameweek ${gameweekNumber}` : ""}\n` +
        `See the live table: ${liveUrl}`;

      const shareData: ShareData = {
        title: "Bounce BTTS League Table",
        text,
        url: liveUrl,
        files: [file],
      };

      const browser = navigator as Navigator & { canShare?: (data: ShareData) => boolean };

      if (navigator.share && (!browser.canShare || browser.canShare({ files: [file] }))) {
        await navigator.share(shareData);
        setMessage("Shared");
      } else {
        const objectUrl = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = file.name;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
        setMessage("JPEG downloaded — attach it in WhatsApp");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage(error instanceof Error ? error.message : "Could not share the table.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className={`tableShareControl ${compact ? "compact" : ""} ${className}`.trim()}>
      <button type="button" onClick={share} disabled={busy}>
        {busy ? "Creating JPEG…" : compact ? "Share snapshot" : "Share table snapshot"}
      </button>
      {message && <small>{message}</small>}
    </span>
  );
}
