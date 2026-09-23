import { NORMALIZATION } from "@/lib/face/normalization";
import { withReference } from "@/lib/face/metrics/define";
import {
  landmark,
  percentDifference,
  ratioOf,
  span,
  vertical,
} from "@/lib/face/metrics/helpers";
import type { FacialMetricDefinition } from "@/types/face";

export const lipMetrics: FacialMetricDefinition[] = [
  withReference({
    id: "mouth-width-ipd",
    label: "Mouth width to IPD",
    category: "lips",
    view: "front",
    unit: "ratio",
    requiredLandmarks: ["leftCheilion", "rightCheilion", "leftPupil", "rightPupil"],
    formula: "distance(leftCheilion, rightCheilion) / distance(leftPupil, rightPupil)",
    normalization: NORMALIZATION.widthRatio,
    explanation: "Mouth-corner width divided by the distance between the pupils.",
    overlay: {
      type: "distance-pair",
      numerator: ["leftCheilion", "rightCheilion"],
      denominator: ["leftPupil", "rightPupil"],
    },
    calculate: (map) => ratioOf(span(map, "leftCheilion", "rightCheilion"), span(map, "leftPupil", "rightPupil")),
  }),
  withReference({
    id: "lip-height-ratio",
    label: "Upper-to-lower lip",
    category: "lips",
    view: "front",
    unit: "ratio",
    requiredLandmarks: ["labialeSuperius", "stomion", "labialeInferius"],
    formula: "vertical(labialeSuperius, stomion) / vertical(stomion, labialeInferius)",
    normalization: NORMALIZATION.segmentRatio,
    explanation: "Upper vermilion height divided by lower vermilion height. This uses the lip borders, not lipstick or shadow.",
    overlay: { type: "line", points: ["labialeSuperius", "stomion", "labialeInferius"] },
    calculate: (map) =>
      ratioOf(vertical(map, "labialeSuperius", "stomion"), vertical(map, "stomion", "labialeInferius")),
  }),
  withReference({
    id: "philtrum-proportion",
    label: "Philtrum proportion",
    category: "lips",
    view: "front",
    unit: "ratio",
    requiredLandmarks: ["subnasale", "labialeSuperius", "menton"],
    formula: "vertical(subnasale, labialeSuperius) / vertical(subnasale, menton)",
    normalization: NORMALIZATION.segmentRatio,
    explanation: "Distance from the base of the nose to the upper lip, divided by the full lower face.",
    overlay: {
      type: "distance-pair",
      numerator: ["subnasale", "labialeSuperius"],
      denominator: ["subnasale", "menton"],
    },
    calculate: (map) =>
      ratioOf(vertical(map, "subnasale", "labialeSuperius"), vertical(map, "subnasale", "menton")),
  }),
  withReference({
    id: "mouth-level-asymmetry",
    label: "Mouth corner level",
    category: "symmetry",
    view: "front",
    unit: "percent",
    requiredLandmarks: ["leftCheilion", "rightCheilion"],
    formula: "100 * |leftCheilion.y − rightCheilion.y| / mouth width",
    normalization: NORMALIZATION.symmetryPercent,
    explanation: "Vertical mismatch of the mouth corners, as a percent of mouth width. Expression changes this.",
    overlay: { type: "line", points: ["leftCheilion", "rightCheilion"] },
    calculate: (map) => {
      const left = landmark(map, "leftCheilion");
      const right = landmark(map, "rightCheilion");
      const width = span(map, "leftCheilion", "rightCheilion");
      if (!left || !right) return null;
      return percentDifference(left.y, right.y, width);
    },
  }),
];
