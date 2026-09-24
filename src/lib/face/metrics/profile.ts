import { NORMALIZATION } from "@/lib/face/normalization";
import { withReference } from "@/lib/face/metrics/define";
import {
  chinProjectionRatio,
  interiorAngle,
  linesAngle,
  nasalProjectionRatio,
} from "@/lib/face/metrics/helpers";
import type { FacialMetricDefinition } from "@/types/face";

export const profileMetrics: FacialMetricDefinition[] = [
  withReference({
    id: "facial-convexity",
    label: "Facial convexity",
    category: "profile",
    view: "profile",
    unit: "degrees",
    requiredLandmarks: ["glabella", "subnasale", "pogonion"],
    formula: "angle(glabella, subnasale, pogonion)",
    normalization: NORMALIZATION.angleDegrees,
    explanation:
      "Angle at the base of the nose between the brow and the chin point. A straight profile is near 180°. Profile photos that are not a true side view change this angle.",
    overlay: { type: "angle", points: ["glabella", "subnasale", "pogonion"] },
    calculate: (map) => interiorAngle(map, "glabella", "subnasale", "pogonion"),
  }),
  withReference({
    id: "nasofrontal-angle",
    label: "Nasofrontal angle",
    category: "profile",
    view: "profile",
    unit: "degrees",
    requiredLandmarks: ["glabella", "nasion", "rhinion"],
    formula: "angle(glabella, nasion, rhinion)",
    normalization: NORMALIZATION.angleDegrees,
    explanation:
      "Angle at the nasal root between the brow and the nasal bridge. Rhinion sits on the bridge above the tip, which is the photographic definition of this angle.",
    overlay: { type: "angle", points: ["glabella", "nasion", "rhinion"] },
    calculate: (map) => interiorAngle(map, "glabella", "nasion", "rhinion"),
  }),
  withReference({
    id: "nasofacial-angle",
    label: "Nasofacial angle",
    category: "profile",
    view: "profile",
    unit: "degrees",
    requiredLandmarks: ["nasion", "rhinion", "glabella", "pogonion"],
    formula: "smaller angle between line(nasion, rhinion) and line(glabella, pogonion)",
    normalization: NORMALIZATION.lineAngle,
    explanation: "Inclination of the nasal bridge relative to the line from glabella to pogonion.",
    overlay: { type: "line", points: ["nasion", "rhinion", "glabella", "pogonion"] },
    calculate: (map) => linesAngle(map, "nasion", "rhinion", "glabella", "pogonion"),
  }),
  withReference({
    id: "nasolabial-angle",
    label: "Nasolabial angle",
    category: "profile",
    view: "profile",
    unit: "degrees",
    requiredLandmarks: ["columella", "subnasale", "labialeSuperius"],
    formula: "angle(columella, subnasale, labialeSuperius)",
    normalization: NORMALIZATION.angleDegrees,
    explanation:
      "Angle at subnasale between the columella and the upper lip. The columella is the lower nose column, taken from the outline.",
    overlay: { type: "angle", points: ["columella", "subnasale", "labialeSuperius"] },
    calculate: (map) => interiorAngle(map, "columella", "subnasale", "labialeSuperius"),
  }),
  withReference({
    id: "mentolabial-angle",
    label: "Mentolabial angle",
    category: "profile",
    view: "profile",
    unit: "degrees",
    requiredLandmarks: ["labialeInferius", "sublabiale", "pogonion"],
    formula: "angle(labialeInferius, sublabiale, pogonion)",
    normalization: NORMALIZATION.angleDegrees,
    explanation:
      "Angle at the deepest point of the fold under the lower lip, between that fold and the chin point.",
    overlay: { type: "angle", points: ["labialeInferius", "sublabiale", "pogonion"] },
    calculate: (map) => interiorAngle(map, "labialeInferius", "sublabiale", "pogonion"),
  }),
  withReference({
    id: "nasal-projection",
    label: "Nasal projection",
    category: "profile",
    view: "profile",
    unit: "ratio",
    requiredLandmarks: ["pronasale", "nasion", "subnasale"],
    formula: "distance from pronasale to line(nasion, subnasale) / distance(nasion, pronasale)",
    normalization: NORMALIZATION.segmentRatio,
    explanation:
      "MogLabs tip offset: how far pronasale stands off the nasion–subnasale line, relative to nasion–pronasale length. This is not Goode's ratio, and it is not part of Harmony.",
    overlay: { type: "line", points: ["nasion", "subnasale", "pronasale"] },
    calculate: (map) => nasalProjectionRatio(map),
  }),
  withReference({
    id: "chin-projection",
    label: "Chin projection",
    category: "profile",
    view: "profile",
    unit: "ratio",
    requiredLandmarks: ["pogonion", "glabella", "menton", "subnasale"],
    formula: "signed distance from pogonion to line(glabella, menton) / distance(subnasale, menton)",
    normalization: NORMALIZATION.signedProjection,
    explanation:
      "Anterior or posterior position of the chin point relative to the glabella–menton line, scaled by lower-face length. Positive is anterior on a right-facing profile.",
    overlay: { type: "line", points: ["glabella", "menton", "pogonion"] },
    calculate: (map) => chinProjectionRatio(map),
  }),
];
