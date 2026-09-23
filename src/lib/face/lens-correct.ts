import { undistortRaster, type LensModel, type Raster } from "@/lib/face/camera-optics";
import { markCapture, measureCapture } from "@/lib/face/capture-timing";

interface LensWorker {
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
  terminate: () => void;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
}

let worker: LensWorker | null = null;
let nextId = 0;
const pending = new Map<number, { resolve: (blob: Blob) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();

function failAll(error: Error) {
  for (const [id, request] of pending) {
    clearTimeout(request.timer);
    pending.delete(id);
    request.reject(error);
  }
}

function ensureWorker(): LensWorker {
  if (worker) return worker;
  const created = new Worker(new URL("./lens.worker.ts", import.meta.url)) as unknown as LensWorker;
  created.onmessage = (event: MessageEvent<{ id: number; ok: boolean; blob?: Blob; error?: string }>) => {
    const request = pending.get(event.data.id);
    if (!request) return;
    clearTimeout(request.timer);
    pending.delete(event.data.id);
    if (!event.data.ok || !event.data.blob) {
      request.reject(new Error(event.data.error ?? "Could not correct the photo."));
      return;
    }
    request.resolve(event.data.blob);
  };
  created.onerror = () => {
    failAll(new Error("Lens correction failed."));
    worker?.terminate();
    worker = null;
  };
  worker = created;
  return created;
}

export function disposeLensCorrector(): void {
  failAll(new Error("Lens correction was interrupted."));
  worker?.terminate();
  worker = null;
}

function correctInWorker(bitmap: ImageBitmap, lens: LensModel, width: number, height: number): Promise<Blob> {
  const current = ensureWorker();
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("Lens correction timed out."));
    }, 20_000);
    pending.set(id, { resolve, reject, timer });
    current.postMessage({ id, bitmap, lens, width, height }, [bitmap]);
  });
}

export function yieldFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });
}

async function blobFromCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), "image/jpeg", 0.92);
  });
  if (!blob) throw new Error("Could not capture the photo.");
  return blob;
}

/** Fallback used only after the wizard has already been given a chance to paint. */
async function correctOnMainThread(canvas: HTMLCanvasElement, lens: LensModel): Promise<Blob> {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Could not correct the photo.");
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const corrected = undistortRaster({ width: canvas.width, height: canvas.height, data: pixels.data }, lens);
  paintRaster(context, corrected);
  return blobFromCanvas(canvas);
}

function paintRaster(context: CanvasRenderingContext2D, raster: Raster) {
  const copy = new Uint8ClampedArray(raster.width * raster.height * 4);
  copy.set(raster.data);
  context.putImageData(new ImageData(copy, raster.width, raster.height), 0, 0);
}

export interface CorrectedCapture {
  blob: Blob;
  corrected: boolean;
}

/**
 * Lens correction runs off the interaction path. The returned promise yields
 * once before touching pixels, so the caller can advance the wizard first.
 */
export function correctCapturedCanvas(canvas: HTMLCanvasElement, lens: LensModel): Promise<CorrectedCapture> {
  const width = canvas.width;
  const height = canvas.height;
  return (async () => {
    await yieldFrame();
    markCapture("lens-processing-start");
    try {
      if (typeof Worker === "undefined" || typeof createImageBitmap !== "function") {
        const blob = await correctOnMainThread(canvas, lens);
        return { blob, corrected: true };
      }
      const bitmap = await createImageBitmap(canvas);
      try {
        const blob = await correctInWorker(bitmap, lens, width, height);
        return { blob, corrected: true };
      } catch {
        try {
          bitmap.close();
        } catch {
          // Transferred into the worker.
        }
        const blob = await correctOnMainThread(canvas, lens);
        return { blob, corrected: true };
      }
    } catch {
      const blob = await blobFromCanvas(canvas);
      return { blob, corrected: false };
    } finally {
      markCapture("lens-processing-end");
      measureCapture("lens-processing", "lens-processing-start", "lens-processing-end");
    }
  })();
}
