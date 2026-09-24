import { evidenceFor } from "@/lib/face/scoring/evidence-registry";
import { evidenceWeight } from "@/lib/face/scoring/weights";
import type { FacialMetricDefinition } from "@/types/face";

export function withReference(
  definition: Omit<FacialMetricDefinition, "referenceRange" | "scoring" | "featureGroup" | "evidence">,
): FacialMetricDefinition {
  const evidence = evidenceFor(definition.id);
  const bands = evidence.bands.neutral;
  const harm = bands.harmoniousRange;
  const aesthetic = bands.aestheticTarget;
  const weight = evidence.scoreEligible ? evidenceWeight(evidence.evidenceTier, evidence.evidenceLevel) : 0;
  return {
    ...definition,
    featureGroup: evidence.group,
    evidence,
    referenceRange: {
      min: harm.min,
      max: harm.max,
      idealMin: aesthetic?.min ?? harm.min,
      idealMax: aesthetic?.max ?? harm.max,
      source: evidence.limitations[0] ?? evidence.sourcePopulation,
      confidence: evidence.scoreEligible ? "literature" : "informational",
    },
    scoring: {
      sigma: bands.sigmaHigh,
      weight,
    },
  };
}
