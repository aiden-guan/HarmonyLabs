import { facialStructureMetrics } from "@/lib/face/metrics/facial-thirds";
import { eyeMetrics } from "@/lib/face/metrics/eyes";
import { jawMetrics } from "@/lib/face/metrics/jaw";
import { lipMetrics } from "@/lib/face/metrics/lips";
import { noseMetrics } from "@/lib/face/metrics/nose";
import { profileMetrics } from "@/lib/face/metrics/profile";
import { symmetryMetrics } from "@/lib/face/metrics/symmetry";
import { evidenceRegistry } from "@/lib/face/scoring/evidence-registry";
import { evidenceWeight } from "@/lib/face/scoring/weights";
import type {
  FacialMetricDefinition,
  MetricOverlay,
  SemanticLandmarkKey,
  SemanticLandmarkMap,
} from "@/types/face";

export const METRICS: FacialMetricDefinition[] = [
  ...facialStructureMetrics,
  ...eyeMetrics,
  ...noseMetrics,
  ...lipMetrics,
  ...jawMetrics,
  ...symmetryMetrics,
  ...profileMetrics,
];

function overlayKeys(overlay: MetricOverlay): SemanticLandmarkKey[] {
  switch (overlay.type) {
    case "line":
      return overlay.points;
    case "angle":
      return [...overlay.points];
    case "distance-pair":
      return [...overlay.numerator, ...overlay.denominator];
    case "vertical-spans":
      return overlay.spans.flat();
    case "midline-offset":
      return [overlay.point, ...overlay.midline];
    default: {
      const exhaustive: never = overlay;
      return exhaustive;
    }
  }
}

export function assertCatalogIntegrity(): void {
  const ids = METRICS.map((metric) => metric.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Duplicate facial metric id");
  }
  const evidenceIds = Object.keys(evidenceRegistry);
  for (const id of evidenceIds) {
    if (!ids.includes(id)) throw new Error(`Evidence entry ${id} has no metric`);
  }
  for (const metric of METRICS) {
    const evidence = evidenceRegistry[metric.id];
    if (!evidence) throw new Error(`Missing evidence for ${metric.id}`);
    if (evidence.metricId !== metric.id) throw new Error(`Evidence id mismatch for ${metric.id}`);
    if (evidence.group !== metric.featureGroup) throw new Error(`Feature group mismatch for ${metric.id}`);
    if (!metric.label || !metric.formula || !metric.explanation || !metric.normalization) {
      throw new Error(`Incomplete copy for ${metric.id}`);
    }
    if (metric.requiredLandmarks.length === 0) {
      throw new Error(`No landmarks for ${metric.id}`);
    }
    if (!(metric.scoring.sigma > 0)) throw new Error(`Invalid sigma for ${metric.id}`);
    if (metric.referenceRange.max < metric.referenceRange.min) {
      throw new Error(`Inverted range for ${metric.id}`);
    }
    if (
      metric.referenceRange.idealMin < metric.referenceRange.min - 1e-6 ||
      metric.referenceRange.idealMax > metric.referenceRange.max + 1e-6 ||
      metric.referenceRange.idealMax < metric.referenceRange.idealMin
    ) {
      throw new Error(`Aesthetic band sits outside the harmony range for ${metric.id}`);
    }
    if (evidence.scoreEligible) {
      if (evidence.references.length < 1) throw new Error(`Score-eligible ${metric.id} has no references`);
      if (evidence.evidenceTier === 4 || evidence.evidenceType === "unsupported") {
        throw new Error(`Score-eligible ${metric.id} is unsupported`);
      }
      if (!(evidenceWeight(evidence.evidenceTier, evidence.evidenceLevel) > 0)) {
        throw new Error(`Score-eligible ${metric.id} has zero evidence weight`);
      }
      if (!evidence.sourcePopulation || evidence.limitations.length === 0) {
        throw new Error(`Score-eligible ${metric.id} is missing provenance`);
      }
      if (!(evidence.measurementReliability > 0) || !(evidence.formulaCompatibility > 0)) {
        throw new Error(`Score-eligible ${metric.id} is missing reliability`);
      }
      if (evidence.formulaCompatibilityNotes.length === 0 || evidence.accuracyBudget.length === 0) {
        throw new Error(`Score-eligible ${metric.id} is missing formula or accuracy notes`);
      }
    } else if (evidenceWeight(evidence.evidenceTier, evidence.evidenceLevel) > 0 && evidence.evidenceTier === 4) {
      throw new Error(`Unsupported ${metric.id} has a positive tier weight`);
    }
    if (!evidence.scoreEligible && metric.scoring.weight !== 0) {
      throw new Error(`Informational ${metric.id} must not carry a Harmony weight`);
    }
    const required = new Set(metric.requiredLandmarks);
    for (const key of overlayKeys(metric.overlay)) {
      if (!required.has(key)) {
        throw new Error(`Overlay key ${key} is not required by ${metric.id}`);
      }
    }
  }
}

assertCatalogIntegrity();

export function metricById(id: string): FacialMetricDefinition | undefined {
  return METRICS.find((metric) => metric.id === id);
}

export interface CalculatedMetric {
  id: string;
  value: number | null;
}

export function calculateMetrics(input: {
  front: SemanticLandmarkMap;
  profile: SemanticLandmarkMap;
}): CalculatedMetric[] {
  return METRICS.map((metric) => {
    const map = metric.view === "front" ? input.front : input.profile;
    let value: number | null = null;
    try {
      value = metric.calculate(map);
    } catch {
      value = null;
    }
    if (value !== null && !Number.isFinite(value)) value = null;
    return { id: metric.id, value };
  });
}
