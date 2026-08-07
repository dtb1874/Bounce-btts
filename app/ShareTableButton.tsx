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

function drawWindow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.strokeRect(x, y, width, height);
  context.beginPath();
  context.moveTo(x + width / 2, y);
  context.lineTo(x + width / 2, y + height);
  context.moveTo(x, y + height / 2);
  context.lineTo(x + width, y + height / 2);
  context.stroke();
}

function drawTynecastleFacadeWatermark(
  context: CanvasRenderingContext2D,
  canvasWidth: number,
  tableTop: number,
  tableHeight: number,
) {
  const drawingWidth = 1000;
  const drawingHeight = 360;
  const scale = Math.min(
    (canvasWidth * 0.82) / drawingWidth,
    (tableHeight * 0.88) / drawingHeight,
  );
  const x = (canvasWidth - drawingWidth * scale) / 2;
  const y = tableTop + (tableHeight - drawingHeight * scale) / 2;

  context.save();
  context.translate(x, y);
  context.scale(scale, scale);

  // Keep the exported JPEG consistent with every live league table.
  context.globalAlpha = 0.12;
  context.strokeStyle = "#dfcfbd";
  context.fillStyle = "#dfcfbd";
  context.lineWidth = 4;
  context.lineCap = "round";
  context.lineJoin = "round";

  context.beginPath();
  context.moveTo(25, 340);
  context.lineTo(975, 340);
  context.moveTo(55, 340);
  context.lineTo(55, 160);
  context.lineTo(115, 130);
  context.lineTo(350, 130);
  context.lineTo(350, 100);
  context.lineTo(390, 100);
  context.lineTo(425, 65);
  context.lineTo(500, 28);
  context.lineTo(575, 65);
  context.lineTo(610, 100);
  context.lineTo(650, 100);
  context.lineTo(650, 130);
  context.lineTo(885, 130);
  context.lineTo(945, 160);
  context.lineTo(945, 340);
  context.stroke();

  context.strokeRect(390, 145, 220, 46);
  context.font = "700 18px Georgia, serif";
  context.textAlign = "center";
  context.fillText("TYNECASTLE PARK", 500, 175);

  context.beginPath();
  context.moveTo(350, 100);
  context.lineTo(350, 340);
  context.moveTo(650, 100);
  context.lineTo(650, 340);
  context.moveTo(425, 65);
  context.lineTo(500, 28);
  context.lineTo(575, 65);
  context.moveTo(390, 210);
  context.lineTo(610, 210);
  context.moveTo(55, 205);
  context.lineTo(350, 205);
  context.moveTo(650, 205);
  context.lineTo(945, 205);
  context.moveTo(55, 275);
  context.lineTo(350, 275);
  context.moveTo(650, 275);
  context.lineTo(945, 275);
  context.stroke();

  context.beginPath();
  context.moveTo(438, 340);
  context.lineTo(438, 245);
  context.quadraticCurveTo(438, 225, 458, 225);
  context.lineTo(542, 225);
  context.quadraticCurveTo(562, 225, 562, 245);
  context.lineTo(562, 340);
  context.moveTo(500, 225);
  context.lineTo(500, 340);
  context.moveTo(438, 275);
  context.lineTo(562, 275);
  context.moveTo(438, 307);
  context.lineTo(562, 307);
  context.stroke();

  [95, 170, 245, 680, 755, 830].forEach((windowX) =>
    drawWindow(context, windowX, 220, 48, 58),
  );
  drawWindow(context, 370, 220, 42, 58);
  drawWindow(context, 588, 220, 42, 58);

  context.beginPath();
  context.moveTo(70, 340);
  context.lineTo(70, 85);
  context.moveTo(930, 340);
  context.lineTo(930, 85);
  context.moveTo(58, 85);
  context.lineTo(82, 85);
  context.moveTo(918, 85);
  context.lineTo(942, 85);
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

  drawTynecastleFacadeWatermark(
    context,
    width,
    headerHeight,
    tableHeight,
  );

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
  labels.forEach((label, index) =>
    context.fillText(label, columns[index], 264),
  );

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
        (
          row as PublicStandingRow & {
            oneSided?: number;
            scoreNilCount?: number;
          }
        ).oneSided ??
          (
            row as PublicStandingRow & {
              scoreNilCount?: number;
            }
          ).scoreNilCount ??
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
  context.fillText(
    "Ties: fewest 0–0s, most BTTS wins, then alphabetical.",
    72,
    footerY + 48,
  );

  context.fillStyle = "#dbc1a6";
  context.font = "700 19px Arial, sans-serif";
  context.fillText(
    liveUrl.replace(/^https?:\/\//, ""),
    72,
    footerY + 86,
  );

  context.fillStyle = "#857b76";
  context.font = "500 15px Arial, sans-serif";
  context.fillText(
    `Live table snapshot • ${new Date().toLocaleString("en-GB")}`,
    770,
    footerY + 86,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(new Error("The table image could not be generated.")),
      "image/jpeg",
      0.94,
    );
  });

  return new File(
    [blob],
    `bounce-btts-table-${seasonLabel.replace("/", "-")}.jpg`,
    { type: "image/jpeg" },
  );
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
      const file = await createSnapshot(
        rows,
        seasonLabel,
        prizePot,
        gameweekNumber,
        liveUrl,
      );

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

      const browser = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };

      if (
        navigator.share &&
        (!browser.canShare || browser.canShare({ files: [file] }))
      ) {
        await navigator.share(shareData);
        setMessage("Shared");
      } else {
        const objectUrl = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = file.name;
        link.click();

        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
        window.open(
          `https://wa.me/?text=${encodeURIComponent(text)}`,
          "_blank",
          "noopener,noreferrer",
        );
        setMessage("JPEG downloaded — attach it in WhatsApp");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;

      setMessage(
        error instanceof Error
          ? error.message
          : "Could not share the table.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <span
      className={`tableShareControl ${compact ? "compact" : ""} ${className}`.trim()}
    >
      <button type="button" onClick={share} disabled={busy}>
        {busy
          ? "Creating JPEG…"
          : compact
            ? "Share snapshot"
            : "Share table snapshot"}
      </button>
      {message && <small>{message}</small>}
    </span>
  );
}
