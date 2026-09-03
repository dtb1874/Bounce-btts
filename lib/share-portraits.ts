"use client";

export type SharePortraitRecord = {
  id: string;
  displayName: string;
  portraitUrl: string | null;
  image: HTMLImageElement | null;
};

export type SharePortraitLookup = {
  byId: Map<string, SharePortraitRecord>;
  byName: Map<string, SharePortraitRecord>;
};

function normaliseName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase();
}

async function loadImage(src: string) {
  return await new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

export async function loadSharePortraits(): Promise<SharePortraitLookup> {
  try {
    const response = await fetch("/api/member-portraits", { cache: "no-store" });
    if (!response.ok) throw new Error("Portrait feed unavailable");
    const json = await response.json();
    const rows = (json.portraits ?? []) as Array<{ id: string; displayName?: string; portraitUrl?: string | null }>;
    const loaded = await Promise.all(rows.map(async (row) => ({
      id: row.id,
      displayName: row.displayName ?? "",
      portraitUrl: row.portraitUrl ?? null,
      image: row.portraitUrl ? await loadImage(row.portraitUrl) : null,
    })));
    const byId = new Map<string, SharePortraitRecord>();
    const byName = new Map<string, SharePortraitRecord>();
    for (const row of loaded) {
      byId.set(row.id, row);
      if (row.displayName) byName.set(normaliseName(row.displayName), row);
    }
    return { byId, byName };
  } catch {
    return { byId: new Map(), byName: new Map() };
  }
}

export function findSharePortrait(lookup: SharePortraitLookup, id?: string | null, name?: string | null) {
  if (id && lookup.byId.has(id)) return lookup.byId.get(id) ?? null;
  if (name) return lookup.byName.get(normaliseName(name)) ?? null;
  return null;
}

export function drawShareAvatar(
  ctx: CanvasRenderingContext2D,
  lookup: SharePortraitLookup,
  options: { id?: string | null; name: string; x: number; y: number; size: number; border?: string; background?: string; text?: string },
) {
  const { id, name, x, y, size } = options;
  const portrait = findSharePortrait(lookup, id, name);
  const radius = size / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = options.background ?? "#5d1b32";
  ctx.fillRect(x - radius, y - radius, size, size);
  if (portrait?.image) {
    const image = portrait.image;
    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;
    const scale = Math.max(size / naturalWidth, size / naturalHeight);
    const w = naturalWidth * scale;
    const h = naturalHeight * scale;
    ctx.drawImage(image, x - w / 2, y - h / 2, w, h);
  } else {
    ctx.fillStyle = options.text ?? "#f5e8dd";
    ctx.font = `900 ${Math.max(11, Math.round(size * .34))}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials(name), x, y + 1);
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = options.border ?? "#d8b76f";
  ctx.lineWidth = Math.max(2, size * .045);
  ctx.beginPath();
  ctx.arc(x, y, radius - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function portraitMembers(lookup: SharePortraitLookup) {
  return [...lookup.byId.values()].filter((member) => member.displayName).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function drawPortraitRibbon(
  ctx: CanvasRenderingContext2D,
  lookup: SharePortraitLookup,
  options: { y: number; width: number; height: number },
) {
  const members = portraitMembers(lookup);
  if (!members.length) return;
  const { y, width, height } = options;
  const scale = width / 1200;
  const perRow = width >= 900 ? 7 : 5;
  const rows = Math.ceil(members.length / perRow);
  const gradient = ctx.createLinearGradient(0, y, width, y + height);
  gradient.addColorStop(0, "#2b101b");
  gradient.addColorStop(1, "#100b10");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, y, width, height);
  ctx.fillStyle = "#d8b76f";
  ctx.fillRect(0, y, width, Math.max(3, 4 * scale));
  ctx.fillStyle = "#d8b76f";
  ctx.font = `900 ${Math.max(12, 15 * scale)}px Arial`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("THE BOUNCE · MEMBER ROSTER", 40 * scale, y + 29 * scale);

  const available = Math.max(1, height - 38 * scale);
  const rowHeight = available / Math.max(1, rows);
  const cellWidth = (width - 70 * scale) / perRow;
  members.forEach((member, index) => {
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    const x = 42 * scale + col * cellWidth;
    const cy = y + 38 * scale + row * rowHeight + rowHeight / 2;
    const size = Math.min(48 * scale, rowHeight * .68);
    drawShareAvatar(ctx, lookup, { id: member.id, name: member.displayName, x, y: cy, size, border: "#d8b76f", background: "#5d1b32" });
    ctx.fillStyle = "#f4e8dd";
    ctx.font = `800 ${Math.max(9, 13 * scale)}px Arial`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const name = member.displayName.length > 17 ? `${member.displayName.slice(0, 16)}…` : member.displayName;
    ctx.fillText(name, x + size * .68, cy);
  });
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}
