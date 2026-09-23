import { measurementConfidence } from "@/lib/face/quality";
import { runMeasurementPipeline } from "@/lib/face/pipeline";
import type { ResultSaveInput, StoredMetric } from "@/lib/data/model";
import type { PhotoQuality, SemanticLandmark, SemanticLandmarkMap } from "@/types/face";

function toMap(landmarks: SemanticLandmark[]): SemanticLandmarkMap {
  const map: SemanticLandmarkMap = {};
  for (const landmark of landmarks) map[landmark.key] = landmark;
  return map;
}

export function completeAnalysis(input: {
  front: SemanticLandmark[];
  profile: SemanticLandmark[];
  qualities: PhotoQuality[];
}): ResultSaveInput {
  const report = runMeasurementPipeline({
    front: toMap(input.front),
    profile: toMap(input.profile),
  });
  const metrics: StoredMetric[] = report.metrics.map((metric) => ({
    metricId: metric.id,
    value: metric.value,
    score: metric.score,
    impact: metric.impact,
    referenceMin: metric.referenceMin,
    referenceMax: metric.referenceMax,
    unit: metric.unit,
    category: metric.category,
    view: metric.view,
  }));
  const notes = [...new Set(input.qualities.flatMap((quality) => quality.warnings))];
  if (report.partial) {
    notes.push("One photograph did not produce a full set of measurements, so Harmony uses the available view.");
  }
  if (report.availableCount < 20) {
    notes.push("Several measurements could not be calculated. Check the landmark placement.");
  }
  const failed = report.harmony === null;
  return {
    status: failed ? "failed" : "complete",
    harmonyScore: report.harmony,
    frontScore: report.front,
    profileScore: report.profile,
    categoryScores: report.categories,
    qualityNotes: notes,
    confidence: failed ? null : measurementConfidence(input.qualities),
    metrics,
    errorMessage: failed ? "The landmarks did not produce a Harmony score." : null,
  };
}
