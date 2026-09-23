import { NORMALIZATION } from "@/lib/face/normalization";
import { withReference } from "@/lib/face/metrics/define";
import {
  landmark,
  percentDifference,
  ratioOf,
  span,
} from "@/lib/face/metrics/helpers";
import type { FacialMetricDefinition } from "@/types/face";

export const jawMetrics: FacialMetricDefinition[] = [
  withReference({
    id: "chin-jaw-width",
    label: "Chin-to-jaw width",
    category: "jaw",
    view: "front",
    unit: "ratio",
    requiredLandmarks: ["leftChinLateral", "rightChinLateral", "leftGonion", "rightGonion"],
    formula: "distance(leftChinLateral, rightChinLateral) / distance(leftGonion, rightGonion)",
    normalization: NORMALIZATION.widthRatio,
    explanation: "Width across the lateral chin points divided by the approximate jaw-angle width.",
    overlay: {
      type: "distance-pair",
      numerator: ["leftChinLateral", "rightChinLateral"],
      denominator: ["leftGonion", "rightGonion"],
    },
    calculate: (map) =>
      ratioOf(span(map, "leftChinLateral", "rightChinLateral"), span(map, "leftGonion", "rightGonion")),
  }),
  withReference({
    id: "jaw-level-symmetry",
    label: "Jaw level",
    category: "jaw",
    view: "front",
    unit: "percent",
    requiredLandmarks: ["leftGonion", "rightGonion", "foreheadApex", "menton"],
    formula: "100 * |leftGonion.y − rightGonion.y| / facial height",
    normalization: NORMALIZATION.symmetryPercent,
    explanation: "Vertical mismatch of the two jaw-angle estimates, as a percent of facial height.",
    overlay: { type: "line", points: ["leftGonion", "rightGonion"] },
    calculate: (map) => {
      const left = landmark(map, "leftGonion");
      const right = landmark(map, "rightGonion");
      const height = span(map, "foreheadApex", "menton");
      if (!left || !right) return null;
      return percentDifference(left.y, right.y, height);
    },
  }),
];
