"use client";

import { drawPortraitRibbon, loadSharePortraits, portraitMembers } from "@/lib/share-portraits";

type AnimatedShareOptions = {
  width: number;
  height: number;
  frameCount: number;
  frameDurationMs?: number;
  finalHoldMs?: number;
  filename: string;
  title: string;
  drawFrame: (ctx: CanvasRenderingContext2D, frameIndex: number) => void;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function preferredVideoType() {
  if (typeof MediaRecorder === "undefined") return null;
  const types = [
    "video/mp4;codecs=h264",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function extensionFor(type: string) {
  return type.includes("mp4") ? "mp4" : "webm";
}

function shareMimeType(type: string) {
  return type.includes("mp4") ? "video/mp4" : "video/webm";
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function sharePreparedAnimatedFile(file: File, title: string) {
  try {
    const canShareFiles = !navigator.canShare || navigator.canShare({ files: [file] });
    if (navigator.share && canShareFiles) {
      await navigator.share({ files: [file], title });
      return true;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return true;
  }
  downloadFile(file);
  return false;
}

export async function createAnimatedShareFile(options: AnimatedShareOptions) {
  const {
    width,
    height,
    frameCount,
    frameDurationMs = 1000,
    finalHoldMs = 1900,
    filename,
    drawFrame,
  } = options;
  if (frameCount <= 0) throw new Error("Nothing to animate yet.");

  const portraits = await loadSharePortraits();
  const memberCount = portraitMembers(portraits).length;
  const scale = width / 1200;
  const perRow = width >= 900 ? 7 : 5;
  const portraitRows = memberCount ? Math.ceil(memberCount / perRow) : 0;
  const ribbonHeight = memberCount ? Math.round(Math.max(145 * scale, (54 + portraitRows * 74) * scale)) : 0;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height + ribbonHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create share canvas.");

  const renderFrame = (index: number) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawFrame(ctx, index);
    if (ribbonHeight) drawPortraitRibbon(ctx, portraits, { y: height, width, height: ribbonHeight });
  };

  const captureStream = (canvas as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream }).captureStream;
  const mimeType = preferredVideoType();
  if (!captureStream || mimeType === null) throw new Error("Animated sharing is not supported by this browser.");

  const stream = captureStream.call(canvas, 30);
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new Error("Could not create animated share."));
  });

  renderFrame(0);
  recorder.start(200);
  for (let index = 0; index < frameCount; index += 1) {
    renderFrame(index);
    await sleep(index === frameCount - 1 ? finalHoldMs : frameDurationMs);
  }
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());

  const actualType = recorder.mimeType || mimeType || "video/webm";
  const blob = new Blob(chunks, { type: actualType });
  if (!blob.size) throw new Error("Animated share was empty.");
  const base = filename.replace(/\.(mp4|webm)$/i, "");
  const extension = extensionFor(actualType);
  return new File([blob], `${base}.${extension}`, { type: shareMimeType(actualType) });
}

export async function exportAnimatedShare(options: AnimatedShareOptions) {
  const file = await createAnimatedShareFile(options);
  await sharePreparedAnimatedFile(file, options.title);
}
