const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<{ bitmap: ImageBitmap }>) => void) | null;
  postMessage: (message: unknown) => void;
};

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let ready: Promise<{
  detect: (image: ImageBitmap) => {
    faceLandmarks: Array<Array<{ x: number; y: number; z?: number; visibility?: number }>>;
  };
}> | null = null;

function load() {
  if (!ready) {
    ready = (async () => {
      const vision = await import("@mediapipe/tasks-vision");
      const files = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
      return vision.FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
        runningMode: "IMAGE",
        numFaces: 3,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
    })();
  }
  return ready;
}

scope.onmessage = async (event) => {
  try {
    const landmarker = await load();
    const result = landmarker.detect(event.data.bitmap);
    event.data.bitmap.close();
    scope.postMessage({
      ok: true,
      faces: result.faceLandmarks.map((face) =>
        face.map((point) => ({
          x: point.x,
          y: point.y,
          z: point.z ?? 0,
          visibility: point.visibility,
        })),
      ),
    });
  } catch (error) {
    scope.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : "Face detection failed",
    });
  }
};
