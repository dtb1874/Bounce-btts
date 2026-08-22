"use client";

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

async function shareOrSave(blob: Blob, filename: string, title: string) {
  const file = new File([blob], filename, { type: blob.type || "video/webm" });
  try {
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function exportAnimatedShare(options: AnimatedShareOptions) {
  const {
    width,
    height,
    frameCount,
    frameDurationMs = 650,
    finalHoldMs = 1200,
    filename,
    title,
    drawFrame,
  } = options;
  if (frameCount <= 0) throw new Error("Nothing to animate yet.");

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create share canvas.");

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

  drawFrame(ctx, 0);
  recorder.start(200);
  for (let index = 0; index < frameCount; index += 1) {
    drawFrame(ctx, index);
    await sleep(index === frameCount - 1 ? finalHoldMs : frameDurationMs);
  }
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());

  const actualType = recorder.mimeType || mimeType || "video/webm";
  const blob = new Blob(chunks, { type: actualType });
  if (!blob.size) throw new Error("Animated share was empty.");
  const base = filename.replace(/\.(mp4|webm)$/i, "");
  await shareOrSave(blob, `${base}.${extensionFor(actualType)}`, title);
}
