import { MEDIAPIPE_FACE_LANDMARKER_URL, MEDIAPIPE_WASM_BASE } from "@/lib/mediapipe/assets";
import { expressionFromBlendshapes } from "@/lib/face/expression-qc";

const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage: (message: unknown) => void;
};

const WASM_BASE = MEDIAPIPE_WASM_BASE;
const MODEL_URL = MEDIAPIPE_FACE_LANDMARKER_URL;

type Inbound =
  | { type: "init" }
  | { type: "shutdown" }
  | { type: "detect"; id: number; bitmap: ImageBitmap };

interface StillLandmarker {
  detect: (image: ImageBitmap) => {
    faceLandmarks: Array<Array<{ x: number; y: number; z?: number; visibility?: number }>>;
    facialTransformationMatrixes?: Array<{ rows?: number; columns?: number; data?: ArrayLike<number> }>;
    faceBlendshapes?: Array<{ categories?: Array<{ categoryName?: string; score?: number }> }>;
  };
  close?: () => void;
}

let landmarker: StillLandmarker | null = null;
let loading: Promise<StillLandmarker> | null = null;

function load(): Promise<StillLandmarker> {
  if (landmarker) return Promise.resolve(landmarker);
  if (!loading) {
    loading = (async () => {
      const vision = await import("@mediapipe/tasks-vision");
      const files = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
      const created = (await vision.FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
        runningMode: "IMAGE",
        numFaces: 3,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      })) as StillLandmarker;
      landmarker = created;
      return created;
    })().catch((error: unknown) => {
      loading = null;
      throw error;
    });
  }
  return loading;
}

function fail(id: number | null, error: unknown) {
  const message = error instanceof Error ? error.message : "Face detection failed";
  if (id === null) {
    scope.postMessage({ type: "ready", ok: false, error: message });
    return;
  }
  scope.postMessage({ type: "detect", id, ok: false, error: message });
}

scope.onmessage = (event: MessageEvent<Inbound>) => {
  const message = event.data;
  if (!message || typeof message !== "object") return;
  if (message.type === "shutdown") {
    landmarker?.close?.();
    landmarker = null;
    loading = null;
    scope.postMessage({ type: "shutdown" });
    return;
  }
  if (message.type === "init") {
    void load()
      .then(() => scope.postMessage({ type: "ready", ok: true }))
      .catch((error: unknown) => fail(null, error));
    return;
  }
  if (message.type !== "detect") return;
  const { id, bitmap } = message;
  void load()
    .then((marker) => {
      const result = marker.detect(bitmap);
      bitmap.close();
      scope.postMessage({
        type: "detect",
        id,
        ok: true,
        faces: result.faceLandmarks.map((face) =>
          face.map((point) => ({
            x: point.x,
            y: point.y,
            z: point.z ?? 0,
            visibility: point.visibility,
          })),
        ),
        transforms: (result.facialTransformationMatrixes ?? []).map((matrix) => ({
          rows: matrix.rows ?? 0,
          columns: matrix.columns ?? 0,
          data: Array.from(matrix.data ?? [], (value) => Number(value)),
        })),
        expression: expressionFromBlendshapes(result.faceBlendshapes?.[0]?.categories),
      });
    })
    .catch((error: unknown) => {
      try {
        bitmap.close();
      } catch {
        // The frame was already released.
      }
      fail(id, error);
    });
};
