import { calculateMetrics } from "@/lib/face/metrics";
import { buildReport, type HarmonyReport, type ScoreInput } from "@/lib/face/scoring/aggregate";
import { scoreMetric } from "@/lib/face/scoring/score-metric";
import { METRICS } from "@/lib/face/metrics";
import type { SemanticLandmarkMap } from "@/types/face";

export interface MeasurementPipelineResult extends HarmonyReport {
  availableCount: number;
  missingCount: number;
}

export function runMeasurementPipeline(input: {
  front: SemanticLandmarkMap;
  profile: SemanticLandmarkMap;
}): MeasurementPipelineResult {
  const calculated = calculateMetrics(input);
  const inputs: ScoreInput[] = calculated.map((item) => {
    const definition = METRICS.find((metric) => metric.id === item.id);
    if (!definition) {
      throw new Error(`Unknown metric ${item.id}`);
    }
    const score =
      item.value === null
        ? null
        : scoreMetric(
            item.value,
            definition.referenceRange.min,
            definition.referenceRange.max,
            definition.scoring.sigma,
          );
    return {
      id: definition.id,
      label: definition.label,
      category: definition.category,
      view: definition.view,
      unit: definition.unit,
      value: item.value,
      score,
      weight: definition.scoring.weight,
      referenceMin: definition.referenceRange.min,
      referenceMax: definition.referenceRange.max,
      explanation: definition.explanation,
      formula: definition.formula,
      normalization: definition.normalization,
      overlay: definition.overlay,
    };
  });
  const report = buildReport(inputs);
  const availableCount = inputs.filter((item) => item.value !== null).length;
  return {
    ...report,
    availableCount,
    missingCount: inputs.length - availableCount,
  };
}
