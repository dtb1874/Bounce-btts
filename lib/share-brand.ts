"use client";

export const SHARE_BRAND = {
  paper: "#f3eadf",
  paperSoft: "#faf5ee",
  stone: "#e7ddd0",
  ink: "#241a1f",
  muted: "#746c66",
  maroon: "#5f1f36",
  maroonDeep: "#431326",
  gold: "#b78d36",
  goldSoft: "#d9b568",
  rule: "rgba(95,31,54,.18)",
  success: "#2f6c48",
  warning: "#8f6719",
  danger: "#963b49",
} as const;

export type ShareBrandArtwork = {
  crest: HTMLImageElement | null;
  stGiles: HTMLImageElement | null;
  skyline: HTMLImageElement | null;
};

async function loadImage(src: string) {
  return await new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

export async function loadShareBrandArtwork(): Promise<ShareBrandArtwork> {
  const [crest, stGiles, skyline] = await Promise.all([
    loadImage("/assets/hearts-crest.png"),
    loadImage("/assets/st-giles-heart.jpg"),
    loadImage("/assets/edinburgh-skyline.jpg"),
  ]);
  return { crest, stGiles, skyline };
}

export function drawSharePaper(ctx: CanvasRenderingContext2D, width: number, height: number, artwork?: ShareBrandArtwork | null) {
  ctx.fillStyle = SHARE_BRAND.paper;
  ctx.fillRect(0, 0, width, height);

  if (artwork?.skyline) {
    ctx.save();
    ctx.globalAlpha = .075;
    const image = artwork.skyline;
    const scale = Math.max(width / image.width, (height * .34) / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.drawImage(image, (width - w) / 2, height - h, w, h);
    ctx.restore();
  }

  if (artwork?.stGiles) {
    ctx.save();
    ctx.globalAlpha = .055;
    const size = Math.min(width * .5, height * .36);
    ctx.beginPath();
    ctx.arc(width * .82, height * .17, size * .46, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(artwork.stGiles, width * .82 - size / 2, height * .17 - size / 2, size, size);
    ctx.restore();
  }
}

export function drawShareMasthead(
  ctx: CanvasRenderingContext2D,
  width: number,
  options: { eyebrow?: string; title: string; subtitle?: string; artwork?: ShareBrandArtwork | null; top?: number; left?: number },
) {
  const left = options.left ?? 72;
  const top = options.top ?? 62;
  const artwork = options.artwork;

  if (artwork?.crest) {
    const size = 60;
    ctx.drawImage(artwork.crest, width - left - size, top - 8, size, size);
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  if (options.eyebrow) {
    ctx.fillStyle = "#8e5b35";
    ctx.font = "900 18px Arial";
    ctx.fillText(options.eyebrow.toUpperCase(), left, top + 10);
  }

  ctx.fillStyle = SHARE_BRAND.maroonDeep;
  ctx.font = "700 54px Georgia";
  ctx.fillText(options.title, left, top + 72);

  if (options.subtitle) {
    ctx.fillStyle = SHARE_BRAND.muted;
    ctx.font = "700 20px Arial";
    ctx.fillText(options.subtitle, left, top + 108);
  }

  ctx.strokeStyle = SHARE_BRAND.rule;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, top + 136);
  ctx.lineTo(width - left, top + 136);
  ctx.stroke();
}

export function drawShareFooter(ctx: CanvasRenderingContext2D, width: number, height: number, text = "BOUNCE BTTS LEAGUE") {
  const y = height - 48;
  ctx.strokeStyle = SHARE_BRAND.rule;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(56, y - 24);
  ctx.lineTo(width - 56, y - 24);
  ctx.stroke();
  ctx.fillStyle = SHARE_BRAND.maroon;
  ctx.font = "900 16px Arial";
  ctx.textAlign = "left";
  ctx.fillText(text, 56, y);
  ctx.fillStyle = SHARE_BRAND.gold;
  ctx.textAlign = "right";
  ctx.fillText("EDINBURGH", width - 56, y);
}
