import { referenceRanges } from "@/lib/face/scoring/reference-ranges";
import type { FacialMetricDefinition } from "@/types/face";

export function withReference(
  definition: Omit<FacialMetricDefinition, "referenceRange" | "scoring">,
): FacialMetricDefinition {
  const config = referenceRanges[definition.id];
  if (!config) {
    throw new Error(`Missing reference range for ${definition.id}`);
  }
  return {
    ...definition,
    referenceRange: {
      min: config.min,
      max: config.max,
      source: config.source,
      confidence: config.confidence,
    },
    scoring: { sigma: config.sigma, weight: config.weight },
  };
}
