export type FaceView = "front" | "profile";

export type LandmarkSource = "mediapipe" | "derived" | "manual";

export type MetricCategory =
  | "facialStructure"
  | "eyes"
  | "nose"
  | "lips"
  | "jaw"
  | "profile"
  | "symmetry";

export type MetricUnit = "ratio" | "percent" | "degrees";

export type ReferenceConfidence = "experimental";

export interface Point {
  x: number;
  y: number;
  z?: number;
}

export interface RawFaceLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export type SemanticLandmarkKey =
  | "leftPupil"
  | "rightPupil"
  | "leftInnerCanthus"
  | "rightInnerCanthus"
  | "leftOuterCanthus"
  | "rightOuterCanthus"
  | "leftEyeTop"
  | "leftEyeBottom"
  | "rightEyeTop"
  | "rightEyeBottom"
  | "leftZygion"
  | "rightZygion"
  | "leftGonion"
  | "rightGonion"
  | "leftChinLateral"
  | "rightChinLateral"
  | "glabella"
  | "nasion"
  | "rhinion"
  | "pronasale"
  | "subnasale"
  | "leftAlare"
  | "rightAlare"
  | "labialeSuperius"
  | "stomion"
  | "labialeInferius"
  | "leftCheilion"
  | "rightCheilion"
  | "pogonion"
  | "menton"
  | "foreheadApex"
  | "columella"
  | "sublabiale";

export interface SemanticLandmark {
  key: SemanticLandmarkKey;
  x: number;
  y: number;
  z?: number;
  confidence: number;
  source: LandmarkSource;
}

export type SemanticLandmarkMap = Partial<
  Record<SemanticLandmarkKey, SemanticLandmark>
>;

export type MetricOverlay =
  | { type: "line"; points: SemanticLandmarkKey[] }
  | {
      type: "angle";
      points: [SemanticLandmarkKey, SemanticLandmarkKey, SemanticLandmarkKey];
    }
  | {
      type: "distance-pair";
      numerator: SemanticLandmarkKey[];
      denominator: SemanticLandmarkKey[];
    }
  | { type: "vertical-spans"; spans: SemanticLandmarkKey[][] }
  | {
      type: "midline-offset";
      point: SemanticLandmarkKey;
      midline: [SemanticLandmarkKey, SemanticLandmarkKey];
    };

export interface ReferenceRange {
  min: number;
  max: number;
  idealMin: number;
  idealMax: number;
  source: string;
  confidence: ReferenceConfidence;
}

export interface FacialMetricDefinition {
  id: string;
  label: string;
  category: MetricCategory;
  view: FaceView;
  unit: MetricUnit;
  requiredLandmarks: SemanticLandmarkKey[];
  formula: string;
  normalization: string;
  calculate: (landmarks: SemanticLandmarkMap) => number | null;
  referenceRange: ReferenceRange;
  scoring: {
    sigma: number;
    weight: number;
  };
  explanation: string;
  overlay: MetricOverlay;
}

export interface PhotoQuality {
  faceDetected: boolean;
  faceCount: number;
  yaw: number | null;
  pitch: number | null;
  roll: number | null;
  blurScore: number;
  brightnessScore: number;
  faceCoverage: number;
  warnings: string[];
  /** Extra context that does not lower measurement confidence. */
  notes?: string[];
  mirrored: boolean;
}

export const CATEGORY_LABELS: Record<MetricCategory, string> = {
  facialStructure: "Facial structure",
  eyes: "Eyes",
  nose: "Nose",
  lips: "Lips",
  jaw: "Jaw",
  profile: "Profile",
  symmetry: "Symmetry",
};

export const CATEGORY_ORDER: MetricCategory[] = [
  "facialStructure",
  "eyes",
  "nose",
  "lips",
  "jaw",
  "symmetry",
  "profile",
];
