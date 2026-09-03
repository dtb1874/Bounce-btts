"use client";

import { useEffect } from "react";
import { drawPortraitRibbon, loadSharePortraits, portraitMembers } from "@/lib/share-portraits";

async function decorateImage(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const item = new Image();
      item.onload = () => resolve(item);
      item.onerror = () => reject(new Error("Could not open share image."));
      item.src = url;
    });
    const portraits = await loadSharePortraits();
    const members = portraitMembers(portraits);
    if (!members.length) return file;

    const width = image.naturalWidth || image.width;
    const scale = width / 1200;
    const perRow = width >= 900 ? 7 : 5;
    const rows = Math.ceil(members.length / perRow);
    const ribbonHeight = Math.round(Math.max(145 * scale, (54 + rows * 74) * scale));
    const originalHeight = image.naturalHeight || image.height;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = originalHeight + ribbonHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(image, 0, 0, width, originalHeight);
    drawPortraitRibbon(ctx, portraits, { y: originalHeight, width, height: ribbonHeight });
    const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, .94));
    return blob ? new File([blob], file.name, { type: mime, lastModified: Date.now() }) : file;
  } finally {
    URL.revokeObjectURL(url);
  }
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
