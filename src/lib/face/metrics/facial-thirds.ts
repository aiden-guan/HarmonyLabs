import { NORMALIZATION } from "@/lib/face/normalization";
import { withReference } from "@/lib/face/metrics/define";
import { ratioOf, span, vertical } from "@/lib/face/metrics/helpers";
import type { FacialMetricDefinition, SemanticLandmarkMap } from "@/types/face";

function thirds(map: SemanticLandmarkMap) {
  const upper = vertical(map, "foreheadApex", "glabella");
  const middle = vertical(map, "glabella", "subnasale");
  const lower = vertical(map, "subnasale", "menton");
  if (upper === null || middle === null || lower === null) return null;
  const total = upper + middle + lower;
  if (total <= 0) return null;
  return { upper: upper / total, middle: middle / total, lower: lower / total, upperSpan: upper, middleSpan: middle, lowerSpan: lower };
}

export const facialStructureMetrics: FacialMetricDefinition[] = [
  withReference({
    id: "facial-width-height",
    label: "Facial width-to-height",
    category: "facialStructure",
    view: "front",
    unit: "ratio",
    requiredLandmarks: ["leftZygion", "rightZygion", "foreheadApex", "menton"],
    formula: "distance(leftZygion, rightZygion) / distance(foreheadApex, menton)",
    normalization: NORMALIZATION.widthOverHeight,
    explanation:
      "Lateral face width divided by the mesh forehead-to-chin height. The forehead point is the top of the face mesh, not the hairline, so this is not a classical morphological facial index.",
    overlay: {
      type: "distance-pair",
      numerator: ["leftZygion", "rightZygion"],
      denominator: ["foreheadApex", "menton"],
    },
    calculate: (map) => ratioOf(span(map, "leftZygion", "rightZygion"), span(map, "foreheadApex", "menton")),
  }),
  withReference({
    id: "upper-third",
    label: "Upper third",
    category: "facialStructure",
    view: "front",
    unit: "ratio",
    requiredLandmarks: ["foreheadApex", "glabella", "subnasale", "menton"],
    formula: "vertical(foreheadApex, glabella) / (upper + middle + lower)",
    normalization: NORMALIZATION.verticalShare,
    explanation:
      "Share of the vertical face occupied by the mesh forehead. Because the mesh apex sits below a true hairline, this third is usually smaller than a trichion measurement.",
    overlay: { type: "vertical-spans", spans: [["foreheadApex", "glabella"]] },
    calculate: (map) => thirds(map)?.upper ?? null,
  }),
  withReference({
    id: "middle-third",
    label: "Middle third",
    category: "facialStructure",
    view: "front",
    unit: "ratio",
    requiredLandmarks: ["foreheadApex", "glabella", "subnasale", "menton"],
    formula: "vertical(glabella, subnasale) / (upper + middle + lower)",
    normalization: NORMALIZATION.verticalShare,
    explanation: "Share of the vertical face from glabella to the base of the nose.",
    overlay: { type: "vertical-spans", spans: [["glabella", "subnasale"]] },
    calculate: (map) => thirds(map)?.middle ?? null,
  }),
  withReference({
    id: "lower-third",
    label: "Lower third",
    category: "facialStructure",
    view: "front",
    unit: "ratio",
    requiredLandmarks: ["foreheadApex", "glabella", "subnasale", "menton"],
    formula: "vertical(subnasale, menton) / (upper + middle + lower)",
    normalization: NORMALIZATION.verticalShare,
    explanation: "Share of the vertical face from the base of the nose to the bottom of the chin.",
    overlay: { type: "vertical-spans", spans: [["subnasale", "menton"]] },
    calculate: (map) => thirds(map)?.lower ?? null,
  }),
  withReference({
    id: "jaw-cheek-ratio",
    label: "Jaw-to-cheek width",
    category: "facialStructure",
    view: "front",
    unit: "ratio",
    requiredLandmarks: ["leftGonion", "rightGonion", "leftZygion", "rightZygion"],
    formula: "distance(leftGonion, rightGonion) / distance(leftZygion, rightZygion)",
    normalization: NORMALIZATION.widthRatio,
    explanation:
      "Approximate jaw-angle width divided by lateral face width. Both endpoints are mesh estimates, not palpated gonion and zygion.",
    overlay: {
      type: "distance-pair",
      numerator: ["leftGonion", "rightGonion"],
      denominator: ["leftZygion", "rightZygion"],
    },
    calculate: (map) => ratioOf(span(map, "leftGonion", "rightGonion"), span(map, "leftZygion", "rightZygion")),
  }),
  withReference({
    id: "chin-height-ratio",
    label: "Chin height ratio",
    category: "facialStructure",
    view: "front",
    unit: "ratio",
    requiredLandmarks: ["stomion", "menton", "subnasale"],
    formula: "vertical(stomion, menton) / vertical(subnasale, menton)",
    normalization: NORMALIZATION.segmentRatio,
    explanation: "How much of the lower face sits below the mouth opening.",
    overlay: {
      type: "distance-pair",
      numerator: ["stomion", "menton"],
      denominator: ["subnasale", "menton"],
    },
    calculate: (map) => ratioOf(vertical(map, "stomion", "menton"), vertical(map, "subnasale", "menton")),
  }),
  withReference({
    id: "lower-middle-ratio",
    label: "Lower-to-middle third",
    category: "facialStructure",
    view: "front",
    unit: "ratio",
    requiredLandmarks: ["glabella", "subnasale", "menton"],
    formula: "vertical(subnasale, menton) / vertical(glabella, subnasale)",
    normalization: NORMALIZATION.segmentRatio,
    explanation: "Lower-face height divided by the glabella-to-subnasale height. Near 1 means those spans are similar.",
    overlay: {
      type: "distance-pair",
      numerator: ["subnasale", "menton"],
      denominator: ["glabella", "subnasale"],
    },
    calculate: (map) => ratioOf(vertical(map, "subnasale", "menton"), vertical(map, "glabella", "subnasale")),
  }),
];
