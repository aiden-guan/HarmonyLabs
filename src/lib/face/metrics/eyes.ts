import { NORMALIZATION } from "@/lib/face/normalization";
import { withReference } from "@/lib/face/metrics/define";
import {
  averageCanthalTilt,
  landmark,
  mean,
  percentDifference,
  ratioOf,
  span,
  vertical,
} from "@/lib/face/metrics/helpers";
import { downwardSpan } from "@/lib/face/geometry";
import type { FacialMetricDefinition, SemanticLandmarkMap } from "@/types/face";

function pallettLengthRatio(map: SemanticLandmarkMap): number | null {
  const trichion = landmark(map, "trichion");
  const menton = landmark(map, "menton");
  const left = landmark(map, "leftPupil");
  const right = landmark(map, "rightPupil");
  const mouth = landmark(map, "stomion");
  if (!trichion || !menton || !left || !right || !mouth) return null;
  const eyes = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
  return ratioOf(downwardSpan(eyes, mouth), downwardSpan(trichion, menton));
}

export const eyeMetrics: FacialMetricDefinition[] = [
  withReference({
    id: "pallett-length-ratio",
    label: "Eye–mouth face length",
    category: "eyes",
    view: "front",
    unit: "ratio",
    requiredLandmarks: ["trichion", "menton", "leftPupil", "rightPupil", "stomion"],
    formula: "vertical(pupil midpoint, stomion) / vertical(trichion, menton)",
    normalization: NORMALIZATION.segmentRatio,
    explanation:
      "Vertical distance from the pupil midpoint to the mouth opening, divided by hairline-to-chin length. Scored only when trichion is placed. This follows Pallett, Link, and Lee rather than the mesh forehead.",
    overlay: {
      type: "distance-pair",
      numerator: ["leftPupil", "stomion"],
      denominator: ["trichion", "menton"],
    },
    calculate: pallettLengthRatio,
  }),
  withReference({
    id: "intercanthal-face-ratio",
    label: "Intercanthal width ratio",
    category: "eyes",
    view: "front",
    unit: "ratio",
    requiredLandmarks: ["leftInnerCanthus", "rightInnerCanthus", "leftZygion", "rightZygion"],
    formula: "distance(leftInnerCanthus, rightInnerCanthus) / distance(leftZygion, rightZygion)",
    normalization: NORMALIZATION.widthRatio,
    explanation: "Distance between the inner eye corners divided by lateral face width.",
    overlay: {
      type: "distance-pair",
      numerator: ["leftInnerCanthus", "rightInnerCanthus"],
      denominator: ["leftZygion", "rightZygion"],
    },
    calculate: (map) =>
      ratioOf(span(map, "leftInnerCanthus", "rightInnerCanthus"), span(map, "leftZygion", "rightZygion")),
  }),
  withReference({
    id: "interpupillary-face-ratio",
    label: "Interpupillary ratio",
    category: "eyes",
    view: "front",
    unit: "ratio",
    requiredLandmarks: ["leftPupil", "rightPupil", "leftZygion", "rightZygion"],
    formula: "distance(leftPupil, rightPupil) / distance(leftZygion, rightZygion)",
    normalization: NORMALIZATION.widthRatio,
    explanation: "Distance between pupil centers divided by lateral face width.",
    overlay: {
      type: "distance-pair",
      numerator: ["leftPupil", "rightPupil"],
      denominator: ["leftZygion", "rightZygion"],
    },
    calculate: (map) => ratioOf(span(map, "leftPupil", "rightPupil"), span(map, "leftZygion", "rightZygion")),
  }),
  withReference({
    id: "eye-spacing-ratio",
    label: "Eye spacing ratio",
    category: "eyes",
    view: "front",
    unit: "ratio",
    requiredLandmarks: [
      "leftInnerCanthus",
      "rightInnerCanthus",
      "leftOuterCanthus",
      "rightOuterCanthus",
    ],
    formula: "intercanthal distance / mean(left eye width, right eye width)",
    normalization: NORMALIZATION.segmentRatio,
    explanation: "Inner-corner gap divided by the average eye width. Near 1 means the gap is about one eye wide.",
    overlay: {
      type: "distance-pair",
      numerator: ["leftInnerCanthus", "rightInnerCanthus"],
      denominator: ["leftOuterCanthus", "leftInnerCanthus"],
    },
    calculate: (map) => {
      const gap = span(map, "leftInnerCanthus", "rightInnerCanthus");
      const left = span(map, "leftOuterCanthus", "leftInnerCanthus");
      const right = span(map, "rightOuterCanthus", "rightInnerCanthus");
      return ratioOf(gap, mean([left, right]));
    },
  }),
  withReference({
    id: "eye-width-symmetry",
    label: "Eye width symmetry",
    category: "eyes",
    view: "front",
    unit: "percent",
    requiredLandmarks: [
      "leftOuterCanthus",
      "leftInnerCanthus",
      "rightOuterCanthus",
      "rightInnerCanthus",
    ],
    formula: "100 * |left eye width − right eye width| / mean eye width",
    normalization: NORMALIZATION.symmetryPercent,
    explanation: "Percent difference between the two eye widths. Zero means the widths match.",
    overlay: { type: "line", points: ["leftOuterCanthus", "leftInnerCanthus", "rightInnerCanthus", "rightOuterCanthus"] },
    calculate: (map) => {
      const left = span(map, "leftOuterCanthus", "leftInnerCanthus");
      const right = span(map, "rightOuterCanthus", "rightInnerCanthus");
      return percentDifference(left, right, mean([left, right]));
    },
  }),
  withReference({
    id: "eye-height-symmetry",
    label: "Eye height symmetry",
    category: "eyes",
    view: "front",
    unit: "percent",
    requiredLandmarks: ["leftEyeTop", "leftEyeBottom", "rightEyeTop", "rightEyeBottom"],
    formula: "100 * |left eye height − right eye height| / mean eye height",
    normalization: NORMALIZATION.symmetryPercent,
    explanation: "Percent difference between the vertical openings of the two eyes.",
    overlay: { type: "line", points: ["leftEyeTop", "leftEyeBottom", "rightEyeTop", "rightEyeBottom"] },
    calculate: (map) => {
      const left = vertical(map, "leftEyeTop", "leftEyeBottom");
      const right = vertical(map, "rightEyeTop", "rightEyeBottom");
      return percentDifference(left, right, mean([left, right]));
    },
  }),
  withReference({
    id: "canthal-tilt",
    label: "Canthal tilt",
    category: "eyes",
    view: "front",
    unit: "degrees",
    requiredLandmarks: [
      "leftOuterCanthus",
      "leftInnerCanthus",
      "rightOuterCanthus",
      "rightInnerCanthus",
    ],
    formula: "mean canthal tilt of both eyes, degrees, positive when the outer corner is higher",
    normalization: NORMALIZATION.angleDegrees,
    explanation:
      "Average tilt of the eye corners. Positive means the outer corner is higher in the photograph. Head roll changes this reading.",
    overlay: { type: "line", points: ["leftOuterCanthus", "leftInnerCanthus", "rightInnerCanthus", "rightOuterCanthus"] },
    calculate: (map) => averageCanthalTilt(map),
  }),
  withReference({
    id: "eye-face-width",
    label: "Eye-to-face width",
    category: "eyes",
    view: "front",
    unit: "ratio",
    requiredLandmarks: [
      "leftOuterCanthus",
      "leftInnerCanthus",
      "rightOuterCanthus",
      "rightInnerCanthus",
      "leftZygion",
      "rightZygion",
    ],
    formula: "mean eye width / distance(leftZygion, rightZygion)",
    normalization: NORMALIZATION.widthRatio,
    explanation: "Average eye width divided by lateral face width.",
    overlay: {
      type: "distance-pair",
      numerator: ["leftOuterCanthus", "leftInnerCanthus"],
      denominator: ["leftZygion", "rightZygion"],
    },
    calculate: (map) => {
      const left = span(map, "leftOuterCanthus", "leftInnerCanthus");
      const right = span(map, "rightOuterCanthus", "rightInnerCanthus");
      return ratioOf(mean([left, right]), span(map, "leftZygion", "rightZygion"));
    },
  }),
];
