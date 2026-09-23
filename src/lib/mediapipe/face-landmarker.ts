import type { FaceView, RawFaceLandmark } from "@/types/face";
import {
  createStillDetectorClient,
  type DetectorWorker,
  type StillDetectorClient,
} from "@/lib/mediapipe/face-landmarker-worker-client";
import { createSessionLease } from "@/lib/mediapipe/session-lease";

export interface RawDetection {
  faces: RawFaceLandmark[][];
}

type FaceDetector = {
  detect: (image: ImageBitmap | HTMLCanvasElement) => {
    faceLandmarks: Array<Array<{ x: number; y: number; z?: number; visibility?: number }>>;
  };
  close: () => void;
};

let landmarkerPromise: Promise<FaceDetector> | null = null;

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

function loadLandmarker(): Promise<FaceDetector> {
  if (landmarkerPromise) return landmarkerPromise;
  const created = (async () => {
    const vision = await import("@mediapipe/tasks-vision");
    const files = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
    const options = {
      runningMode: "IMAGE" as const,
      numFaces: 3,
      minFaceDetectionConfidence: 0.5,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: true,
    };
    try {
      const gpu = await vision.FaceLandmarker.createFromOptions(files, {
        ...options,
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      });
      return gpu as unknown as FaceDetector;
    } catch {
      const cpu = await vision.FaceLandmarker.createFromOptions(files, {
        ...options,
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
      });
      return cpu as unknown as FaceDetector;
    }
  })().catch((error: unknown) => {
    landmarkerPromise = null;
    throw error;
  });
  landmarkerPromise = created;
  return created;
}

export async function detectWithMediaPipe(image: ImageBitmap | HTMLCanvasElement): Promise<RawDetection> {
  const landmarker = await loadLandmarker();
  const result = landmarker.detect(image);
  return {
    faces: result.faceLandmarks.map((face) =>
      face.map((point) => ({
        x: point.x,
        y: point.y,
        z: point.z ?? 0,
        visibility: point.visibility,
      })),
    ),
  };
}

export async function disposeFaceLandmarker(): Promise<void> {
  if (!landmarkerPromise) return;
  const landmarker = await landmarkerPromise.catch(() => null);
  landmarker?.close();
  landmarkerPromise = null;
}

type LiveLandmarker = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestamp: number,
  ) => {
    faceLandmarks: Array<Array<{ x: number; y: number; z?: number; visibility?: number }>>;
  };
  close: () => void;
};

let livePromise: Promise<LiveLandmarker> | null = null;
let liveTimestamp = 0;
let restoreLiteFilter: (() => void) | null = null;

const liteConsoleMethods = ["error", "warn", "info", "log"] as const;

/**
 * MediaPipe prints "Created TensorFlow Lite…" through the console while the
 * delegate starts. The dev overlay treats that info line as an application error.
 * The filter is installed before the wasm module loads so it still applies if
 * the module keeps the console method it saw at init.
 */
function installLiteFilter(): void {
  if (restoreLiteFilter) return;
  const originals = new Map(liteConsoleMethods.map((method) => [method, console[method].bind(console)]));
  for (const method of liteConsoleMethods) {
    console[method] = ((...args: unknown[]) => {
      const text = args
        .map((item) => (typeof item === "string" ? item : item instanceof Error ? item.message : ""))
        .join(" ");
      if (text.includes("TensorFlow") || text.includes("XNNPACK")) return;
      originals.get(method)?.(...args);
    }) as (typeof console)[typeof method];
  }
  restoreLiteFilter = () => {
    for (const method of liteConsoleMethods) {
      const original = originals.get(method);
      if (original) console[method] = original as (typeof console)[typeof method];
    }
    restoreLiteFilter = null;
  };
}

function loadLiveLandmarker(): Promise<LiveLandmarker> {
  if (livePromise) return livePromise;
  const created = (async () => {
    const vision = await import("@mediapipe/tasks-vision");
    const files = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
    const options = {
      runningMode: "VIDEO" as const,
      numFaces: 2,
      minFaceDetectionConfidence: 0.5,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    };
    try {
      return (await vision.FaceLandmarker.createFromOptions(files, {
        ...options,
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      })) as unknown as LiveLandmarker;
    } catch {
      return (await vision.FaceLandmarker.createFromOptions(files, {
        ...options,
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
      })) as unknown as LiveLandmarker;
    }
  })().catch((error: unknown) => {
    livePromise = null;
    throw error;
  });
  livePromise = created;
  return created;
}

const liveLease = createSessionLease<LiveLandmarker>({
  graceMs: 500,
  open: async () => {
    installLiteFilter();
    return loadLiveLandmarker();
  },
  close: (landmarker) => {
    restoreLiteFilter?.();
    landmarker.close();
    livePromise = null;
    liveTimestamp = 0;
  },
});

/**
 * Keeps one video landmarker alive for the capture session.
 * Releasing it starts a short grace period so a front→profile render, or
 * React strict mode, does not tear the model down and load it again.
 */
export function retainLiveFaceLandmarker(): () => void {
  let released = false;
  void liveLease.acquire("live").catch(() => undefined);
  return () => {
    if (released) return;
    released = true;
    liveLease.release();
  };
}

export async function detectLiveFace(video: HTMLVideoElement, now: number): Promise<RawFaceLandmark[][]> {
  const landmarker = await loadLiveLandmarker();
  liveTimestamp = Math.max(liveTimestamp + 1, Math.round(now));
  const result = landmarker.detectForVideo(video, liveTimestamp);
  return result.faceLandmarks.map((face) =>
    face.map((point) => ({
      x: point.x,
      y: point.y,
      z: point.z ?? 0,
      visibility: point.visibility,
    })),
  );
}

let stillClient: StillDetectorClient | null = null;

function stillDetector(): StillDetectorClient {
  if (!stillClient) {
    stillClient = createStillDetectorClient({
      createWorker: () => new Worker(new URL("./worker.ts", import.meta.url)) as unknown as DetectorWorker,
    });
  }
  return stillClient;
}

/** Starts the still-image worker before an upload, without touching the live camera model. */
export function prewarmStillDetector(): void {
  if (typeof Worker === "undefined") return;
  if (process.env.NEXT_PUBLIC_E2E === "1" && process.env.NODE_ENV !== "production") return;
  stillDetector().prewarm();
}

export function disposeStillDetector(): void {
  stillClient?.terminate();
  stillClient = null;
}

async function fixtureDetection(view: FaceView): Promise<RawDetection> {
  const fixture = await import("@/fixtures/raw-sample");
  return { faces: [fixture.rawSample(view)] };
}

function e2eDetector(): boolean {
  return process.env.NEXT_PUBLIC_E2E === "1" && process.env.NODE_ENV !== "production";
}

/** Still-image detection for a canvas. Reuses one worker across photographs. */
export async function detectCanvas(canvas: HTMLCanvasElement, view: FaceView): Promise<RawDetection> {
  if (e2eDetector()) return fixtureDetection(view);
  const bitmap = await createImageBitmap(canvas);
  try {
    if (typeof Worker === "undefined") return await detectWithMediaPipe(bitmap);
    return await stillDetector().detect(bitmap);
  } catch (error) {
    const retry = await createImageBitmap(canvas);
    try {
      return await detectWithMediaPipe(retry);
    } catch {
      throw error instanceof Error ? error : new Error("Face detection failed.");
    } finally {
      retry.close();
    }
  } finally {
    try {
      bitmap.close();
    } catch {
      // The worker already took ownership of the bitmap.
    }
  }
}

export async function detectRawFace(file: Blob, view: FaceView): Promise<RawDetection> {
  if (e2eDetector()) return fixtureDetection(view);
  const bitmap = await createImageBitmap(file);
  try {
    if (typeof Worker === "undefined") return await detectWithMediaPipe(bitmap);
    return await stillDetector().detect(bitmap);
  } catch (error) {
    const retry = await createImageBitmap(file);
    try {
      return await detectWithMediaPipe(retry);
    } catch {
      throw error;
    } finally {
      retry.close();
    }
  } finally {
    try {
      bitmap.close();
    } catch {
      // The worker already took ownership of the bitmap.
    }
  }
}
