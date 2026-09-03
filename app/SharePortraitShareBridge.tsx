"use client";

import { useEffect } from "react";
import { drawShareAvatar, loadSharePortraits } from "./sharePortraits";

async function loadFileImage(file: File) {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not open share image."));
      image.src = url;
    });
  } finally {
    // Revoked after draw by caller through copied image pixels.
  }
}

async function decorateImage(file: File) {
  const image = await loadFileImage(file);
  const portraits = await loadSharePortraits();
  const members = [...portraits.byId.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
  if (!members.length) return file;

  const width = image.naturalWidth || image.width;
  const scale = width / 1200;
  const perRow = width >= 900 ? 7 : 5;
  const rows = Math.ceil(members.length / perRow);
  const ribbonHeight = Math.max(128 * scale, (34 + rows * 86) * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = (image.naturalHeight || image.height) + Math.round(ribbonHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(image, 0, 0, width, image.naturalHeight || image.height);
  const y0 = image.naturalHeight || image.height;
  const gradient = ctx.createLinearGradient(0, y0, width, canvas.height);
  gradient.addColorStop(0, "#2b101b");
  gradient.addColorStop(1, "#100b10");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, y0, width, canvas.height - y0);
  ctx.fillStyle = "#d8b76f";
  ctx.fillRect(0, y0, width, Math.max(3, 4 * scale));
  ctx.fillStyle = "#d8b76f";
  ctx.font = `900 ${Math.max(12, 15 * scale)}px Arial`;
  ctx.fillText("THE BOUNCE · MEMBER ROSTER", 40 * scale, y0 + 29 * scale);

  const cellWidth = (width - 70 * scale) / perRow;
  members.forEach((member, index) => {
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    const x = 42 * scale + col * cellWidth;
    const y = y0 + (67 + row * 82) * scale;
    const size = 48 * scale;
    drawShareAvatar(ctx, portraits, { id: member.id, name: member.displayName, x, y, size, border: "#d8b76f", background: "#5d1b32" });
    ctx.fillStyle = "#f4e8dd";
    ctx.font = `800 ${Math.max(10, 13 * scale)}px Arial`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const name = member.displayName.length > 17 ? `${member.displayName.slice(0, 16)}…` : member.displayName;
    ctx.fillText(name, x + size * .68, y);
  });
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, .94));
  if (!blob) return file;
  return new File([blob], file.name, { type: mime, lastModified: Date.now() });
}

export default function SharePortraitShareBridge() {
  useEffect(() => {
    if (!navigator.share) return;
    const original = navigator.share.bind(navigator);
    const wrapped = async (data?: ShareData) => {
      if (!data?.files?.length) return original(data);
      try {
        const files = await Promise.all(data.files.map((file) => file.type.startsWith("image/") ? decorateImage(file) : Promise.resolve(file)));
        return original({ ...data, files });
      } catch {
        return original(data);
      }
    };
    Object.defineProperty(navigator, "share", { configurable: true, value: wrapped });
    return () => {
      try { Object.defineProperty(navigator, "share", { configurable: true, value: original }); } catch {}
    };
  }, []);
  return null;
}
