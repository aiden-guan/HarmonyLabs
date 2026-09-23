import type { FaceView, SemanticLandmark, SemanticLandmarkKey } from "@/types/face";

type PointRecord = Partial<Record<SemanticLandmarkKey, [number, number]>>;

export const SAMPLE_FRONT: PointRecord = {
  foreheadApex: [0.5, 0.12],
  glabella: [0.5, 0.37],
  nasion: [0.5, 0.4],
  leftPupil: [0.365, 0.44],
  rightPupil: [0.635, 0.44],
  leftOuterCanthus: [0.3, 0.432],
  leftInnerCanthus: [0.43, 0.447],
  rightInnerCanthus: [0.57, 0.447],
  rightOuterCanthus: [0.7, 0.432],
  leftEyeTop: [0.365, 0.418],
  leftEyeBottom: [0.365, 0.468],
  rightEyeTop: [0.635, 0.418],
  rightEyeBottom: [0.635, 0.468],
  leftZygion: [0.2, 0.48],
  rightZygion: [0.8, 0.48],
  pronasale: [0.5, 0.54],
  subnasale: [0.5, 0.62],
  leftAlare: [0.425, 0.57],
  rightAlare: [0.575, 0.57],
  labialeSuperius: [0.5, 0.695],
  stomion: [0.5, 0.725],
  labialeInferius: [0.5, 0.765],
  leftCheilion: [0.39, 0.73],
  rightCheilion: [0.61, 0.73],
  leftGonion: [0.28, 0.74],
  rightGonion: [0.72, 0.74],
  leftChinLateral: [0.325, 0.84],
  rightChinLateral: [0.675, 0.84],
  pogonion: [0.5, 0.86],
  menton: [0.5, 0.9],
};

export const SAMPLE_PROFILE: PointRecord = {
  foreheadApex: [0.42, 0.16],
  glabella: [0.48, 0.32],
  nasion: [0.52, 0.38],
  pronasale: [0.74, 0.5],
  columella: [0.64, 0.54],
  subnasale: [0.58, 0.58],
  labialeSuperius: [0.62, 0.64],
  stomion: [0.6, 0.68],
  labialeInferius: [0.58, 0.72],
  sublabiale: [0.5, 0.78],
  pogonion: [0.58, 0.84],
  menton: [0.52, 0.92],
};

export function sampleLandmarks(view: FaceView): SemanticLandmark[] {
  const points = view === "front" ? SAMPLE_FRONT : SAMPLE_PROFILE;
  return Object.entries(points).map(([key, value]) => {
    const [x, y] = value as [number, number];
    return {
      key: key as SemanticLandmarkKey,
      x,
      y,
      confidence: 0.8,
      source: "derived" as const,
    };
  });
}
