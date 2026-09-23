import { NORMALIZATION } from "@/lib/face/normalization";
import { withReference } from "@/lib/face/metrics/define";
import {
  landmark,
  midlineOffsetPercent,
  percentDifference,
  ratioOf,
  span,
} from "@/lib/face/metrics/helpers";
import type { FacialMetricDefinition } from "@/types/face";

export const noseMetrics: FacialMetricDefinition[] = [
  withReference({
    id: "nasal-width-face",
    label: "Nasal width to face",
    category: "nose",
    view: "front",
    unit: "ratio",
    requiredLandmarks: ["leftAlare", "rightAlare", "leftZygion", "rightZygion"],
    formula: "distance(leftAlare, rightAlare) / distance(leftZygion, rightZygion)",
    normalization: NORMALIZATION.widthRatio,
    explanation: "Width across the nostrils divided by lateral face width.",
    overlay: {
      type: "distance-pair",
      numerator: ["leftAlare", "rightAlare"],
      denominator: ["leftZygion", "rightZygion"],
    },
    calculate: (map) => ratioOf(span(map, "leftAlare", "rightAlare"), span(map, "leftZygion", "rightZygion")),
  }),
  withReference({
    id: "nasal-width-intercanthal",
    label: "Nasal width to intercanthal",
    category: "nose",
    view: "front",
    unit: "ratio",
    requiredLandmarks: ["leftAlare", "rightAlare", "leftInnerCanthus", "rightInnerCanthus"],
    formula: "distance(leftAlare, rightAlare) / distance(leftInnerCanthus, rightInnerCanthus)",
    normalization: NORMALIZATION.widthRatio,
    explanation: "Nostril width divided by the distance between the inner eye corners.",
    overlay: {
      type: "distance-pair",
      numerator: ["leftAlare", "rightAlare"],
      denominator: ["leftInnerCanthus", "rightInnerCanthus"],
    },
    calculate: (map) =>
      ratioOf(span(map, "leftAlare", "rightAlare"), span(map, "leftInnerCanthus", "rightInnerCanthus")),
  }),
  withReference({
    id: "nasal-length-ratio",
    label: "Nasal length ratio",
    category: "nose",
    view: "front",
    unit: "ratio",
    requiredLandmarks: ["nasion", "subnasale", "foreheadApex", "menton"],
    formula: "distance(nasion, subnasale) / distance(foreheadApex, menton)",
    normalization: NORMALIZATION.segmentRatio,
    explanation: "Length from the nasal root to the base of the nose, divided by mesh forehead-to-chin height.",
    overlay: {
      type: "distance-pair",
      numerator: ["nasion", "subnasale"],
      denominator: ["foreheadApex", "menton"],
    },
    calculate: (map) => ratioOf(span(map, "nasion", "subnasale"), span(map, "foreheadApex", "menton")),
  }),
  withReference({
    id: "nasal-alar-level",
    label: "Alar level",
    category: "nose",
    view: "front",
    unit: "percent",
    requiredLandmarks: ["leftAlare", "rightAlare"],
    formula: "100 * |leftAlare.y − rightAlare.y| / alar width",
    normalization: NORMALIZATION.symmetryPercent,
    explanation: "Vertical mismatch between the two nostril wings, as a percent of nasal width.",
    overlay: { type: "line", points: ["leftAlare", "rightAlare"] },
    calculate: (map) => {
      const left = landmark(map, "leftAlare");
      const right = landmark(map, "rightAlare");
      const width = span(map, "leftAlare", "rightAlare");
      if (!left || !right) return null;
      return percentDifference(left.y, right.y, width);
    },
  }),
  withReference({
    id: "nasal-midline-deviation",
    label: "Nasal midline deviation",
    category: "symmetry",
    view: "front",
    unit: "percent",
    requiredLandmarks: ["pronasale", "leftPupil", "rightPupil", "leftZygion", "rightZygion"],
    formula: "100 * |pronasale.x − pupil midline| / face width",
    normalization: NORMALIZATION.symmetryPercent,
    explanation: "How far the nose tip sits from the midline between the pupils, as a percent of face width.",
    overlay: {
      type: "midline-offset",
      point: "pronasale",
      midline: ["leftPupil", "rightPupil"],
    },
    calculate: (map) => midlineOffsetPercent(map, "pronasale"),
  }),
];
