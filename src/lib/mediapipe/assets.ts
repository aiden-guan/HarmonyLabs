import { LANDMARK_MODEL_VERSION, MEDIAPIPE_TASKS_VERSION } from "@/lib/face/versions";

/**
 * The npm package, WASM runtime, and face-landmarker task are pinned together.
 * Radial files stay on the CDN that matches `MEDIAPIPE_TASKS_VERSION`.
 * The task asset is the immutable float16 Face Landmarker v1 graph.
 */
export const MEDIAPIPE_WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_TASKS_VERSION}/wasm`;

export const MEDIAPIPE_FACE_LANDMARKER_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export const MEDIAPIPE_MODEL_ASSET_VERSION = LANDMARK_MODEL_VERSION;
