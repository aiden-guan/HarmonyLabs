import { LIVE_MESH_MAX_AGE_MS } from "@/lib/face/profile-pose";

export interface LiveMeshSample<T> {
  faces: T[] | null;
  detectedAt: number | null;
  frame: { width: number; height: number } | null;
}

/**
 * Camera captures reuse the live mesh when it still describes this frame.
 * Uploads, and a stale or missing camera mesh, go to the still detector.
 */
export function liveMeshIsFresh<T>(input: {
  source: "camera" | "upload";
  live: LiveMeshSample<T>;
  capturedAt: number;
  captureFrame: { width: number; height: number };
  maxAgeMs?: number;
}): boolean {
  if (input.source !== "camera") return false;
  const faces = input.live.faces;
  if (!faces || faces.length === 0) return false;
  if (input.live.detectedAt == null || !Number.isFinite(input.live.detectedAt)) return false;
  const frame = input.live.frame;
  if (!frame || frame.width < 2 || frame.height < 2) return false;
  if (frame.width !== input.captureFrame.width || frame.height !== input.captureFrame.height) return false;
  const age = input.capturedAt - input.live.detectedAt;
  const maxAge = input.maxAgeMs ?? LIVE_MESH_MAX_AGE_MS;
  return age >= 0 && age <= maxAge;
}

export async function resolveCaptureFaces<T>(input: {
  source: "camera" | "upload";
  live: LiveMeshSample<T>;
  capturedAt: number;
  captureFrame: { width: number; height: number };
  maxAgeMs?: number;
  detectStill: () => Promise<T[]>;
}): Promise<{ faces: T[]; path: "live" | "still" }> {
  if (
    liveMeshIsFresh({
      source: input.source,
      live: input.live,
      capturedAt: input.capturedAt,
      captureFrame: input.captureFrame,
      maxAgeMs: input.maxAgeMs,
    }) &&
    input.live.faces
  ) {
    return { faces: input.live.faces, path: "live" };
  }
  return { faces: await input.detectStill(), path: "still" };
}
