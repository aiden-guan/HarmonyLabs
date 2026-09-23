import { brightnessScore, laplacianVariance, sharpnessScore } from "@/lib/face/image-stats";
import { maxUploadBytes } from "@/lib/env";

export interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
  previewUrl: string;
  blurScore: number;
  brightnessScore: number;
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (file.size > maxUploadBytes()) {
    const mb = Math.round(maxUploadBytes() / (1024 * 1024));
    throw new Error(`This file is larger than the ${mb} MB limit.`);
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Use a JPEG, PNG, or WebP image.");
  }
  const bitmap = await createImageBitmap(file);
  const maxEdge = 1600;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser could not read the image.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const sample = document.createElement("canvas");
  sample.width = 160;
  sample.height = Math.max(1, Math.round((160 * height) / width));
  const sampleContext = sample.getContext("2d", { willReadFrequently: true });
  if (!sampleContext) throw new Error("This browser could not read the image.");
  sampleContext.drawImage(canvas, 0, 0, sample.width, sample.height);
  const pixels = sampleContext.getImageData(0, 0, sample.width, sample.height);
  const stats = { width: sample.width, height: sample.height, data: pixels.data };
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("Could not prepare the photo."))), type, 0.92);
  });
  return {
    blob,
    width,
    height,
    previewUrl: URL.createObjectURL(blob),
    blurScore: sharpnessScore(laplacianVariance(stats)),
    brightnessScore: brightnessScore(stats),
  };
}

/** Flip a prepared profile so stored pixels match mirrored landmark coordinates. */
export async function mirrorPreparedImage(prepared: PreparedImage): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(prepared.blob);
  const canvas = document.createElement("canvas");
  canvas.width = prepared.width;
  canvas.height = prepared.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not mirror the profile.");
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("Could not mirror the profile."))),
      prepared.blob.type || "image/jpeg",
      0.92,
    );
  });
  return { ...prepared, blob, previewUrl: URL.createObjectURL(blob) };
}
