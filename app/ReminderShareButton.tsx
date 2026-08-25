"use client";

import { useState } from "react";

type SubmittedPick = { name: string; fixture: string };
type Props = {
  gameweekNumber: number;
  seasonLabel: string;
  deadline: string;
  missingNames: string[];
  submittedPicks: SubmittedPick[];
  disabled?: boolean;
};

function deadlineLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.arcTo(x + w, y, x + w, y + h, radius); ctx.arcTo(x + w, y + h, x, y + h, radius); ctx.arcTo(x, y + h, x, y, radius); ctx.arcTo(x, y, x + w, y, radius); ctx.closePath();
}
async function canvasBlob(canvas: HTMLCanvasElement) {
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not create reminder image.")), "image/png"));
}
function initials(name: string) { return name.split(/\s+/).filter(Boolean).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase(); }
function fitText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, start: number, min = 17) {
  let size = start;
  while (size > min) { ctx.font = `800 ${size}px Arial`; if (ctx.measureText(value).width <= maxWidth) break; size -= 1; }
  return size;
}
async function loadCanvasImage(src: string) {
  return await new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = () => resolve(null); image.src = src;
  });
}

export default function ReminderShareButton({ gameweekNumber, seasonLabel, deadline, missingNames, submittedPicks, disabled }: Props) {
  const [sharing, setSharing] = useState(false);

  async function share() {
    if (sharing || disabled || !missingNames.length) return;
    setSharing(true);
    try {
      const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1350;
      const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Image sharing is not supported in this browser.");
      const [crest, cup] = await Promise.all([loadCanvasImage("/assets/hearts-crest.png"), loadCanvasImage("/assets/bounce-cup.png")]);

      const bg = ctx.createLinearGradient(0, 0, 1080, 1350); bg.addColorStop(0, "#160c12"); bg.addColorStop(.55, "#240e18"); bg.addColorStop(1, "#0d090c"); ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1350);
      ctx.save(); ctx.globalAlpha = .075; ctx.strokeStyle = "#d7b36d"; ctx.lineWidth = 2;
      for (let x = -500; x < 1300; x += 86) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 720, 720); ctx.stroke(); }
      for (let y = 300; y < 1300; y += 118) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1080, y - 210); ctx.stroke(); }
      ctx.restore();

      const head = ctx.createLinearGradient(0, 0, 1080, 240); head.addColorStop(0, "#7b193b"); head.addColorStop(.6, "#59152f"); head.addColorStop(1, "#281019"); ctx.fillStyle = head; ctx.fillRect(0, 0, 1080, 230);
      ctx.fillStyle = "#d8b76f"; ctx.fillRect(0, 218, 1080, 6);
      if (crest) { ctx.save(); ctx.globalAlpha = .22; ctx.drawImage(crest, 815, 18, 190, 190); ctx.restore(); }
      if (cup) { ctx.save(); ctx.globalAlpha = .92; ctx.drawImage(cup, 902, 40, 92, 160); ctx.restore(); }
      ctx.fillStyle = "#f5e8dd"; ctx.font = "900 66px Georgia"; ctx.fillText("BOUNCE", 62, 84);
      ctx.fillStyle = "#e2be73"; ctx.font = "900 29px Arial"; ctx.fillText("BTTS LEAGUE · PICK REMINDER", 62, 135);
      ctx.fillStyle = "#d7c2b3"; ctx.font = "800 22px Arial"; ctx.fillText(`SEASON ${seasonLabel} · GAMEWEEK ${gameweekNumber}`, 62, 177);

      // Deadline is deliberately prominent and above the player lists.
      ctx.fillStyle = "rgba(216,183,111,.13)"; roundedRect(ctx, 62, 260, 956, 112, 22); ctx.fill(); ctx.strokeStyle = "rgba(216,183,111,.45)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#d8b76f"; ctx.font = "900 22px Arial"; ctx.fillText("DEADLINE", 92, 300);
      ctx.fillStyle = "#f5e8dd"; ctx.font = "900 34px Arial"; ctx.fillText(deadlineLabel(deadline), 92, 344);

      const leftX = 62, rightX = 558, colW = 460, cardY = 410, cardH = 760;
      const drawCard = (x: number, title: string, subtitle: string, accent: string) => {
        ctx.fillStyle = "rgba(37,14,23,.94)"; roundedRect(ctx, x, cardY, colW, cardH, 28); ctx.fill(); ctx.strokeStyle = "rgba(216,183,111,.27)"; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = accent; ctx.font = "900 20px Arial"; ctx.fillText(title, x + 28, cardY + 43);
        ctx.fillStyle = "#a99588"; ctx.font = "700 16px Arial"; ctx.fillText(subtitle, x + 28, cardY + 70);
      };
      drawCard(leftX, "STILL TO PICK", `${missingNames.length} outstanding`, "#f0c875");
      drawCard(rightX, "PICKS IN", `${submittedPicks.length} submitted`, "#83d6a3");

      const missingRowH = Math.min(118, 610 / Math.max(1, missingNames.length));
      missingNames.forEach((name, index) => {
        const y = cardY + 118 + index * missingRowH;
        ctx.fillStyle = "#d8b76f"; ctx.beginPath(); ctx.arc(leftX + 48, y, 23, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#251018"; ctx.font = "900 17px Arial"; ctx.textAlign = "center"; ctx.fillText(initials(name), leftX + 48, y + 6); ctx.textAlign = "left";
        ctx.fillStyle = "#f5e9df"; const size = fitText(ctx, name, colW - 115, 29); ctx.font = `800 ${size}px Arial`; ctx.fillText(name, leftX + 88, y + 9);
        if (index < missingNames.length - 1) { ctx.strokeStyle = "rgba(216,183,111,.12)"; ctx.beginPath(); ctx.moveTo(leftX + 28, y + missingRowH / 2); ctx.lineTo(leftX + colW - 28, y + missingRowH / 2); ctx.stroke(); }
      });

      const submittedRowH = Math.min(115, 610 / Math.max(1, submittedPicks.length));
      submittedPicks.forEach((pick, index) => {
        const y = cardY + 110 + index * submittedRowH;
        ctx.fillStyle = "#2f8d55"; ctx.beginPath(); ctx.arc(rightX + 42, y, 20, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "white"; ctx.font = "900 18px Arial"; ctx.textAlign = "center"; ctx.fillText("✓", rightX + 42, y + 6); ctx.textAlign = "left";
        ctx.fillStyle = "#f5e9df"; const nameSize = fitText(ctx, pick.name, colW - 100, 25); ctx.font = `800 ${nameSize}px Arial`; ctx.fillText(pick.name, rightX + 76, y - 3);
        ctx.fillStyle = "#b9a99c"; const fixtureSize = fitText(ctx, pick.fixture, colW - 102, 17, 13); ctx.font = `700 ${fixtureSize}px Arial`; ctx.fillText(pick.fixture, rightX + 76, y + 25);
        if (index < submittedPicks.length - 1) { ctx.strokeStyle = "rgba(216,183,111,.1)"; ctx.beginPath(); ctx.moveTo(rightX + 24, y + submittedRowH / 2); ctx.lineTo(rightX + colW - 24, y + submittedRowH / 2); ctx.stroke(); }
      });

      ctx.fillStyle = "#d8b76f"; ctx.font = "800 22px Arial"; ctx.fillText("bounce-btts.vercel.app", 62, 1284);
      ctx.fillStyle = "#8d7c72"; ctx.font = "700 18px Arial"; ctx.textAlign = "right"; ctx.fillText("MADE BY THE ARTIST, FOR THE BOUNCE", 1018, 1284); ctx.textAlign = "left";

      const blob = await canvasBlob(canvas); const file = new File([blob], `bounce-gw${gameweekNumber}-pick-reminder.png`, { type: "image/png" });
      const shareData: ShareData = { title: `Bounce BTTS · GW${gameweekNumber} Pick Reminder`, text: `GW${gameweekNumber} pick reminder · ${missingNames.length} still to pick`, files: [file] };
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) await navigator.share(shareData);
      else { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); window.alert("Reminder image created. Share the downloaded image to WhatsApp."); }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      window.alert(error instanceof Error ? error.message : "Could not create reminder image.");
    } finally { setSharing(false); }
  }

  return <button type="button" className="dashboardGoldAction dashboardAdminAction" onClick={share} disabled={disabled || sharing || !missingNames.length} aria-label={missingNames.length ? `Share reminder for ${missingNames.length} missing picks` : "All picks are in"}>{sharing ? "Creating…" : missingNames.length ? "Remind Picks" : "All Picks In ✓"}</button>;
}
