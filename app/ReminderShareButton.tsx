"use client";

import { useState } from "react";

type Props = {
  gameweekNumber: number;
  deadline: string;
  missingNames: string[];
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
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

async function canvasBlob(canvas: HTMLCanvasElement) {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not create reminder image.")), "image/png");
  });
}

export default function ReminderShareButton({ gameweekNumber, deadline, missingNames, disabled }: Props) {
  const [sharing, setSharing] = useState(false);

  async function share() {
    if (sharing || disabled || !missingNames.length) return;
    setSharing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Image sharing is not supported in this browser.");

      const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
      bg.addColorStop(0, "#160d12");
      bg.addColorStop(0.55, "#250f19");
      bg.addColorStop(1, "#0e0b0e");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1080, 1350);

      ctx.fillStyle = "#6d1d38";
      ctx.fillRect(0, 0, 1080, 205);
      ctx.fillStyle = "rgba(216,183,111,.16)";
      ctx.fillRect(0, 198, 1080, 7);

      ctx.fillStyle = "#f3e3d4";
      ctx.font = "900 64px Georgia";
      ctx.fillText("BOUNCE", 64, 82);
      ctx.fillStyle = "#d8b76f";
      ctx.font = "900 31px Arial";
      ctx.fillText("BTTS LEAGUE · PICK REMINDER", 64, 134);
      ctx.fillStyle = "#d6c2b2";
      ctx.font = "700 23px Arial";
      ctx.fillText(`GAMEWEEK ${gameweekNumber}`, 64, 174);

      ctx.fillStyle = "#f3e3d4";
      ctx.font = "900 55px Georgia";
      ctx.fillText("Still to make a pick", 64, 292);
      ctx.fillStyle = "#bba99a";
      ctx.font = "700 25px Arial";
      ctx.fillText(`${missingNames.length} player${missingNames.length === 1 ? "" : "s"} outstanding`, 64, 338);

      const cardX = 64, cardY = 390, cardW = 952;
      const rowH = 104;
      const cardH = Math.max(190, missingNames.length * rowH + 46);
      ctx.fillStyle = "rgba(75,22,38,.72)";
      roundedRect(ctx, cardX, cardY, cardW, cardH, 28);
      ctx.fill();
      ctx.strokeStyle = "rgba(216,183,111,.36)";
      ctx.lineWidth = 2;
      ctx.stroke();

      missingNames.forEach((name, index) => {
        const y = cardY + 50 + index * rowH;
        ctx.fillStyle = "#d8b76f";
        ctx.beginPath();
        ctx.arc(cardX + 48, y + 18, 21, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#221017";
        ctx.font = "900 17px Arial";
        ctx.textAlign = "center";
        const initials = name.split(/\s+/).filter(Boolean).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase();
        ctx.fillText(initials, cardX + 48, y + 24);
        ctx.textAlign = "left";
        ctx.fillStyle = "#f5e9df";
        ctx.font = "800 31px Arial";
        ctx.fillText(name, cardX + 92, y + 28);
        if (index < missingNames.length - 1) {
          ctx.strokeStyle = "rgba(216,183,111,.13)";
          ctx.beginPath();
          ctx.moveTo(cardX + 92, y + 64);
          ctx.lineTo(cardX + cardW - 38, y + 64);
          ctx.stroke();
        }
      });

      const footerY = Math.min(1110, cardY + cardH + 74);
      ctx.fillStyle = "#d8b76f";
      ctx.font = "900 27px Arial";
      ctx.fillText("DEADLINE", 64, footerY);
      ctx.fillStyle = "#f3e3d4";
      ctx.font = "800 34px Arial";
      ctx.fillText(deadlineLabel(deadline), 64, footerY + 52);
      ctx.fillStyle = "#a99688";
      ctx.font = "700 22px Arial";
      ctx.fillText("Make your selection in Bounce before the deadline.", 64, footerY + 105);
      ctx.fillStyle = "#d8b76f";
      ctx.font = "800 22px Arial";
      ctx.fillText("bounce-btts.vercel.app", 64, 1283);
      ctx.fillStyle = "#7f7169";
      ctx.font = "700 18px Arial";
      ctx.textAlign = "right";
      ctx.fillText("MADE BY THE ARTIST, FOR THE BOUNCE", 1016, 1283);
      ctx.textAlign = "left";

      const blob = await canvasBlob(canvas);
      const file = new File([blob], `bounce-gw${gameweekNumber}-pick-reminder.png`, { type: "image/png" });
      const shareData: ShareData = {
        title: `Bounce BTTS · GW${gameweekNumber} Pick Reminder`,
        text: `GW${gameweekNumber} pick reminder · ${missingNames.length} still to pick`,
        files: [file],
      };
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share(shareData);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        window.alert("Reminder image created. Share the downloaded image to WhatsApp.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      window.alert(error instanceof Error ? error.message : "Could not create reminder image.");
    } finally {
      setSharing(false);
    }
  }

  return <button type="button" className="dashboardGoldAction dashboardAdminAction" onClick={share} disabled={disabled || sharing || !missingNames.length} aria-label={missingNames.length ? `Share reminder for ${missingNames.length} missing picks` : "All picks are in"}>{sharing ? "Creating…" : missingNames.length ? "Remind Picks" : "All Picks In ✓"}</button>;
}
