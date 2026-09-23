import { NORMALIZATION } from "@/lib/face/normalization";
import { withReference } from "@/lib/face/metrics/define";
import {
  landmark,
  midlineOffsetPercent,
  percentDifference,
  span,
} from "@/lib/face/metrics/helpers";
import type { FacialMetricDefinition } from "@/types/face";

export const symmetryMetrics: FacialMetricDefinition[] = [
  withReference({
    id: "eye-level-asymmetry",
    label: "Eye level",
    category: "symmetry",
    view: "front",
    unit: "percent",
    requiredLandmarks: ["leftPupil", "rightPupil"],
    formula: "100 * |leftPupil.y − rightPupil.y| / interpupillary distance",
    normalization: NORMALIZATION.symmetryPercent,
    explanation: "Vertical mismatch of the pupils, as a percent of the distance between them. Camera roll affects this.",
    overlay: { type: "line", points: ["leftPupil", "rightPupil"] },
    calculate: (map) => {
      const left = landmark(map, "leftPupil");
      const right = landmark(map, "rightPupil");
      const ipd = span(map, "leftPupil", "rightPupil");
      if (!left || !right) return null;
      return percentDifference(left.y, right.y, ipd);
    },
  }),
  withReference({
    id: "chin-midline-deviation",
    label: "Chin midline deviation",
    category: "symmetry",
    view: "front",
    unit: "percent",
    requiredLandmarks: ["menton", "leftPupil", "rightPupil", "leftZygion", "rightZygion"],
    formula: "100 * |menton.x − pupil midline| / face width",
    normalization: NORMALIZATION.symmetryPercent,
    explanation: "How far the bottom of the chin sits from the pupil midline, as a percent of face width.",
    overlay: {
      type: "midline-offset",
      point: "menton",
      midline: ["leftPupil", "rightPupil"],
    },
    calculate: (map) => midlineOffsetPercent(map, "menton"),
  }),
];
