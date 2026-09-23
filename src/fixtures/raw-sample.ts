import { MP } from "@/lib/face/mediapipe-map";
import { SAMPLE_FRONT, SAMPLE_PROFILE } from "@/fixtures/sample-face";
import type { FaceView, RawFaceLandmark, SemanticLandmarkKey } from "@/types/face";

function blank(): RawFaceLandmark[] {
  return Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.55, z: 0 }));
}

function place(
  raw: RawFaceLandmark[],
  index: number,
  points: Partial<Record<SemanticLandmarkKey, [number, number]>>,
  key: SemanticLandmarkKey,
  z = 0,
) {
  const point = points[key];
  if (!point) return;
  raw[index] = { x: point[0], y: point[1], z };
}

/** Builds a sparse mesh whose mapped semantic points follow the geometric sample. */
export function rawSample(view: FaceView): RawFaceLandmark[] {
  const raw = blank();
  const points = view === "front" ? SAMPLE_FRONT : SAMPLE_PROFILE;
  place(raw, MP.foreheadApex, points, "foreheadApex");
  place(raw, MP.glabella, points, "glabella");
  place(raw, MP.nasion, points, "nasion");
  place(raw, MP.pronasale, points, "pronasale", -0.08);
  place(raw, MP.subnasale, points, "subnasale");
  place(raw, MP.leftAlare, points, "leftAlare");
  place(raw, MP.rightAlare, points, "rightAlare");
  place(raw, MP.leftPupil, points, "leftPupil");
  place(raw, MP.rightPupil, points, "rightPupil");
  place(raw, MP.leftEyeOuter, points, "leftOuterCanthus");
  place(raw, MP.leftEyeInner, points, "leftInnerCanthus");
  place(raw, MP.rightEyeOuter, points, "rightOuterCanthus");
  place(raw, MP.rightEyeInner, points, "rightInnerCanthus");
  place(raw, MP.leftEyeTop, points, "leftEyeTop");
  place(raw, MP.leftEyeBottom, points, "leftEyeBottom");
  place(raw, MP.rightEyeTop, points, "rightEyeTop");
  place(raw, MP.rightEyeBottom, points, "rightEyeBottom");
  place(raw, MP.labialeSuperius, points, "labialeSuperius");
  place(raw, MP.labialeInferius, points, "labialeInferius");
  place(raw, MP.leftCheilion, points, "leftCheilion");
  place(raw, MP.rightCheilion, points, "rightCheilion");
  place(raw, MP.menton, points, "menton");
  place(raw, MP.leftChin, points, "leftChinLateral");
  place(raw, MP.rightChin, points, "rightChinLateral");
  const stomion = points.stomion;
  if (stomion) {
    raw[MP.upperLipInner] = { x: stomion[0], y: stomion[1] - 0.008, z: 0 };
    raw[MP.lowerLipInner] = { x: stomion[0], y: stomion[1] + 0.008, z: 0 };
  }
  const leftZygion = points.leftZygion ?? [0.72, 0.48];
  const rightZygion = points.rightZygion ?? [0.34, 0.48];
  raw[MP.leftLateral[0]] = { x: leftZygion[0], y: leftZygion[1], z: view === "profile" ? -0.45 : 0 };
  raw[MP.rightLateral[0]] = { x: rightZygion[0], y: rightZygion[1], z: view === "profile" ? 0.25 : 0 };
  const leftGonion = points.leftGonion ?? [0.68, 0.74];
  const rightGonion = points.rightGonion ?? [0.32, 0.74];
  raw[MP.leftGonion[0]] = { x: leftGonion[0], y: leftGonion[1], z: 0 };
  raw[MP.rightGonion[0]] = { x: rightGonion[0], y: rightGonion[1], z: 0 };
  const pogonion = points.pogonion ?? [0.5, 0.86];
  raw[MP.chinFront[0]] = { x: pogonion[0], y: pogonion[1], z: 0 };
  if (view === "profile") {
    raw[MP.chinFront[0]] = { x: pogonion[0], y: pogonion[1], z: 0 };
    raw[MP.chinFront[1]] = { x: pogonion[0] - 0.08, y: pogonion[1], z: 0 };
    const sulcus = points.sublabiale ?? [pogonion[0] - 0.08, pogonion[1] - 0.06];
    raw[MP.sulcus[0]] = { x: sulcus[0], y: sulcus[1], z: 0 };
    raw[MP.sulcus[1]] = { x: sulcus[0] + 0.06, y: sulcus[1], z: 0 };
  }
  return raw;
}
