import { facialStructureMetrics } from "@/lib/face/metrics/facial-thirds";
import { eyeMetrics } from "@/lib/face/metrics/eyes";
import { jawMetrics } from "@/lib/face/metrics/jaw";
import { lipMetrics } from "@/lib/face/metrics/lips";
import { noseMetrics } from "@/lib/face/metrics/nose";
import { profileMetrics } from "@/lib/face/metrics/profile";
import { symmetryMetrics } from "@/lib/face/metrics/symmetry";
import { referenceRanges } from "@/lib/face/scoring/reference-ranges";
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
  const rangeIds = Object.keys(referenceRanges);
  for (const id of rangeIds) {
    if (!ids.includes(id)) throw new Error(`Reference range ${id} has no metric`);
  }
  for (const metric of METRICS) {
    if (!referenceRanges[metric.id]) {
      throw new Error(`Missing reference range for ${metric.id}`);
    }
    if (!metric.label || !metric.formula || !metric.explanation || !metric.normalization) {
      throw new Error(`Incomplete copy for ${metric.id}`);
    }
    if (metric.requiredLandmarks.length === 0) {
      throw new Error(`No landmarks for ${metric.id}`);
    }
    if (!(metric.scoring.weight > 0) || !(metric.scoring.sigma > 0)) {
      throw new Error(`Invalid scoring parameters for ${metric.id}`);
    }
    if (metric.referenceRange.max < metric.referenceRange.min) {
      throw new Error(`Inverted range for ${metric.id}`);
    }
    if (
      metric.referenceRange.idealMin < metric.referenceRange.min ||
      metric.referenceRange.idealMax > metric.referenceRange.max ||
      metric.referenceRange.idealMax < metric.referenceRange.idealMin
    ) {
      throw new Error(`Ideal band sits outside the usual range for ${metric.id}`);
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
