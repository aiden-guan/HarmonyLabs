/**
 * Harmony V2 identifiers. Persisted with each analysis so an older result
 * is never silently reinterpreted as a new score.
 */
export const LANDMARK_MODEL_VERSION = "mediapipe-face-landmarker-float16-1";
export const MEDIAPIPE_TASKS_VERSION = "0.10.35";
export const METRIC_DEFINITION_VERSION = "metrics-2.0.0";
export const REFERENCE_DATA_VERSION = "references-2.0.0";
export const SCORING_VERSION = "harmony-v2";
export const SCORING_VERSION_V1 = "harmony-v1";

export type ScoringVersionId = typeof SCORING_VERSION | typeof SCORING_VERSION_V1;

export type PresentationProfile = "neutral" | "masculine" | "feminine";

export type DistanceProtocol = "followed" | "not-followed" | "unknown";
