import type { LandmarkSource, SemanticLandmarkKey, SemanticLandmarkMap } from "@/types/face";

const APPROXIMATE = new Set<SemanticLandmarkKey>([
  "leftZygion",
  "rightZygion",
  "leftGonion",
  "rightGonion",
]);

export interface LandmarkMeasurementFactor {
  factor: number;
  confidence: number;
  sources: LandmarkSource[];
  warnings: string[];
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Landmark confidence changes the aggregation weight.
 * It does not change the metric's comparison with its reference.
 */
export function landmarkMeasurementFactor(
  map: SemanticLandmarkMap,
  keys: SemanticLandmarkKey[],
): LandmarkMeasurementFactor {
  if (keys.length === 0) return { factor: 0, confidence: 0, sources: [], warnings: ["No landmarks"] };
  const confidences: number[] = [];
  const sources: LandmarkSource[] = [];
  const warnings: string[] = [];
  for (const key of keys) {
    const point = map[key];
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      return { factor: 0, confidence: 0, sources, warnings: [`Missing ${key}`] };
    }
    let confidence = clamp01(point.confidence);
    if (point.source === "derived") confidence *= 0.85;
    if (point.source === "manual") confidence = Math.max(confidence, 0.92);
    if (APPROXIMATE.has(key) && point.source !== "manual") {
      confidence *= 0.7;
      warnings.push(`${key} is an approximate mesh point, not a palpated bony landmark.`);
    }
    confidences.push(clamp01(confidence));
    sources.push(point.source);
  }
  const product = confidences.reduce((value, confidence) => value * Math.max(confidence, 1e-6), 1);
  const factor = product ** (1 / confidences.length);
  return { factor, confidence: factor, sources, warnings };
}
