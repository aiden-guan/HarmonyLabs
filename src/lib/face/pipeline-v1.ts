import { calculateMetrics, METRICS } from "@/lib/face/metrics";
import { buildReportV1, type ScoreInputV1 } from "@/lib/face/scoring/aggregate-v1";
import { referenceRanges } from "@/lib/face/scoring/reference-ranges";
import { scoreMetricV1 } from "@/lib/face/scoring/score-metric-v1";
import { SCORING_VERSION_V1 } from "@/lib/face/versions";
import type { SemanticLandmarkMap } from "@/types/face";

/**
 * Reproduces Harmony V1: a flat 10 inside each experimental band, then a
 * fixed 62% front / 38% profile mix. New analyses do not use this path.
 */
export function runMeasurementPipelineV1(input: {
  front: SemanticLandmarkMap;
  profile: SemanticLandmarkMap;
}) {
  const calculated = calculateMetrics(input);
  const inputs: ScoreInputV1[] = [];
  for (const item of calculated) {
    const range = referenceRanges[item.id];
    const definition = METRICS.find((metric) => metric.id === item.id);
    if (!range || !definition) continue;
    const score = item.value === null ? null : scoreMetricV1(item.value, range.min, range.max, range.sigma);
    inputs.push({
      id: definition.id,
      label: definition.label,
      category: definition.category,
      view: definition.view,
      unit: definition.unit,
      value: item.value,
      score,
      weight: range.weight,
      referenceMin: range.min,
      referenceMax: range.max,
      explanation: definition.explanation,
      formula: definition.formula,
      normalization: definition.normalization,
      overlay: definition.overlay,
    });
  }
  return { ...buildReportV1(inputs), scoringVersion: SCORING_VERSION_V1 };
}
