import { clamp01 } from "@/lib/face/geometry";
import { profileContourLandmarks } from "@/lib/face/profile-contour";
import type {
  FaceView,
  RawFaceLandmark,
  SemanticLandmark,
  SemanticLandmarkKey,
  SemanticLandmarkMap,
} from "@/types/face";

/**
 * MediaPipe Face Landmarker vertices used by FaceLab.
 * These are mesh indices, not anatomical ground truth. Indices stay in this file.
 *
 * Left and right follow the MediaPipe template: the subject's left and right
 * when the photograph is not mirrored. Template-right vertices use the lower
 * index groups (eye 33/133, iris 473). Template-left uses 263/362 and iris 468.
 */
export const MP = {
  foreheadApex: 10,
  glabella: 9,
  nasion: 168,
  pronasale: 1,
  subnasale: 2,
  rightAlare: 98,
  leftAlare: 327,
  labialeSuperius: 0,
  upperLipInner: 13,
  lowerLipInner: 14,
  labialeInferius: 17,
  menton: 152,
  rightEyeOuter: 33,
  rightEyeInner: 133,
  rightEyeTop: 159,
  rightEyeBottom: 145,
  rightPupil: 473,
  leftEyeOuter: 263,
  leftEyeInner: 362,
  leftEyeTop: 386,
  leftEyeBottom: 374,
  leftPupil: 468,
  rightCheilion: 61,
  leftCheilion: 291,
  rightChin: 176,
  leftChin: 400,
  /** Ear-canal stand-in (tragion). The profile is leveled from this point to the lower eyelid. */
  rightTragion: 234,
  leftTragion: 454,
  rightLateral: [234, 93, 132, 58, 127],
  leftLateral: [454, 323, 361, 288, 356],
  rightGonion: [172, 136, 58, 132],
  leftGonion: [397, 365, 288, 361],
  chinFront: [199, 175, 200, 18],
  sulcus: [18, 200, 199, 175],
} as const;

function usable(point: RawFaceLandmark | undefined): RawFaceLandmark | null {
  if (!point) return null;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  if (point.x < -0.05 || point.x > 1.05 || point.y < -0.05 || point.y > 1.05) {
    return null;
  }
  return {
    x: clamp01(point.x),
    y: clamp01(point.y),
    z: Number.isFinite(point.z) ? point.z : 0,
    visibility: point.visibility,
  };
}

function confidenceFrom(point: RawFaceLandmark, base: number): number {
  if (point.visibility === undefined || !Number.isFinite(point.visibility)) {
    return base;
  }
  return Math.max(0.15, Math.min(base, point.visibility));
}

function put(
  map: SemanticLandmarkMap,
  key: SemanticLandmarkKey,
  point: RawFaceLandmark | null,
  confidence: number,
  source: SemanticLandmark["source"],
) {
  if (!point) return;
  map[key] = {
    key,
    x: point.x,
    y: point.y,
    z: point.z,
    confidence: confidenceFrom(point, confidence),
    source,
  };
}

function at(raw: RawFaceLandmark[], index: number): RawFaceLandmark | null {
  return usable(raw[index]);
}

function mostLateral(
  raw: RawFaceLandmark[],
  indices: readonly number[],
  midlineX: number,
  yMin: number,
  yMax: number,
): RawFaceLandmark | null {
  const ranked = indices
    .map((index) => usable(raw[index]))
    .filter((point): point is RawFaceLandmark => point !== null);
  const inBand = ranked.filter((point) => point.y >= yMin && point.y <= yMax);
  const pool = inBand.length > 0 ? inBand : ranked;
  let best: RawFaceLandmark | null = null;
  let bestDistance = -1;
  for (const point of pool) {
    const distance = Math.abs(point.x - midlineX);
    if (distance > bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }
  return best;
}

function closestToX(
  raw: RawFaceLandmark[],
  indices: readonly number[],
  targetX: number,
): RawFaceLandmark | null {
  let best: RawFaceLandmark | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const index of indices) {
    const point = usable(raw[index]);
    if (!point) continue;
    const distance = Math.abs(point.x - targetX);
    if (distance < bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }
  return best;
}

function mostAnterior(
  raw: RawFaceLandmark[],
  indices: readonly number[],
): RawFaceLandmark | null {
  let best: RawFaceLandmark | null = null;
  for (const index of indices) {
    const point = usable(raw[index]);
    if (!point) continue;
    if (!best || point.x > best.x) best = point;
  }
  return best;
}

function mostPosterior(
  raw: RawFaceLandmark[],
  indices: readonly number[],
): RawFaceLandmark | null {
  let best: RawFaceLandmark | null = null;
  for (const index of indices) {
    const point = usable(raw[index]);
    if (!point) continue;
    if (!best || point.x < best.x) best = point;
  }
  return best;
}

function stomion(raw: RawFaceLandmark[]): RawFaceLandmark | null {
  const upper = at(raw, MP.upperLipInner);
  const lower = at(raw, MP.lowerLipInner);
  if (!upper || !lower) return null;
  return {
    x: (upper.x + lower.x) / 2,
    y: (upper.y + lower.y) / 2,
    z: (upper.z + lower.z) / 2,
  };
}

function derivedColumella(
  pronasale: RawFaceLandmark | null,
  subnasale: RawFaceLandmark | null,
): RawFaceLandmark | null {
  if (!pronasale || !subnasale) return null;
  return {
    x: subnasale.x * 0.55 + pronasale.x * 0.45,
    y: subnasale.y * 0.62 + pronasale.y * 0.38,
    z: subnasale.z * 0.55 + pronasale.z * 0.45,
  };
}

/** Bridge point on the nasion–pronasale chord, used when the outline is too sparse to trace. */
function derivedRhinion(
  nasion: RawFaceLandmark | null,
  pronasale: RawFaceLandmark | null,
): RawFaceLandmark | null {
  if (!nasion || !pronasale) return null;
  return {
    x: nasion.x * 0.42 + pronasale.x * 0.58,
    y: nasion.y * 0.38 + pronasale.y * 0.62,
    z: nasion.z * 0.42 + pronasale.z * 0.58,
  };
}

export function mapFrontLandmarks(raw: RawFaceLandmark[]): SemanticLandmarkMap {
  const map: SemanticLandmarkMap = {};
  const nasion = at(raw, MP.nasion);
  const menton = at(raw, MP.menton);
  const midlineX = ((nasion?.x ?? 0.5) + (menton?.x ?? nasion?.x ?? 0.5)) / 2;
  const eyeY = at(raw, MP.leftPupil)?.y ?? at(raw, MP.rightPupil)?.y ?? 0.4;
  const noseY = at(raw, MP.subnasale)?.y ?? eyeY + 0.12;
  const mouthY = at(raw, MP.labialeInferius)?.y ?? noseY + 0.08;

  put(map, "foreheadApex", at(raw, MP.foreheadApex), 0.72, "mediapipe");
  put(map, "glabella", at(raw, MP.glabella), 0.8, "mediapipe");
  put(map, "nasion", nasion, 0.84, "mediapipe");
  put(map, "pronasale", at(raw, MP.pronasale), 0.9, "mediapipe");
  put(map, "subnasale", at(raw, MP.subnasale), 0.86, "mediapipe");
  put(map, "leftAlare", at(raw, MP.leftAlare), 0.84, "mediapipe");
  put(map, "rightAlare", at(raw, MP.rightAlare), 0.84, "mediapipe");
  put(map, "leftPupil", at(raw, MP.leftPupil), 0.9, "mediapipe");
  put(map, "rightPupil", at(raw, MP.rightPupil), 0.9, "mediapipe");
  put(map, "leftOuterCanthus", at(raw, MP.leftEyeOuter), 0.9, "mediapipe");
  put(map, "leftInnerCanthus", at(raw, MP.leftEyeInner), 0.9, "mediapipe");
  put(map, "rightOuterCanthus", at(raw, MP.rightEyeOuter), 0.9, "mediapipe");
  put(map, "rightInnerCanthus", at(raw, MP.rightEyeInner), 0.9, "mediapipe");
  put(map, "leftEyeTop", at(raw, MP.leftEyeTop), 0.86, "mediapipe");
  put(map, "leftEyeBottom", at(raw, MP.leftEyeBottom), 0.86, "mediapipe");
  put(map, "rightEyeTop", at(raw, MP.rightEyeTop), 0.86, "mediapipe");
  put(map, "rightEyeBottom", at(raw, MP.rightEyeBottom), 0.86, "mediapipe");
  put(map, "labialeSuperius", at(raw, MP.labialeSuperius), 0.88, "mediapipe");
  put(map, "labialeInferius", at(raw, MP.labialeInferius), 0.88, "mediapipe");
  put(map, "stomion", stomion(raw), 0.84, "derived");
  put(map, "leftCheilion", at(raw, MP.leftCheilion), 0.88, "mediapipe");
  put(map, "rightCheilion", at(raw, MP.rightCheilion), 0.88, "mediapipe");
  put(map, "menton", menton, 0.9, "mediapipe");
  put(
    map,
    "pogonion",
    closestToX(raw, MP.chinFront, midlineX),
    0.7,
    "derived",
  );
  put(map, "leftChinLateral", at(raw, MP.leftChin), 0.7, "mediapipe");
  put(map, "rightChinLateral", at(raw, MP.rightChin), 0.7, "mediapipe");
  put(
    map,
    "leftZygion",
    mostLateral(raw, MP.leftLateral, midlineX, eyeY - 0.04, noseY),
    0.62,
    "derived",
  );
  put(
    map,
    "rightZygion",
    mostLateral(raw, MP.rightLateral, midlineX, eyeY - 0.04, noseY),
    0.62,
    "derived",
  );
  put(
    map,
    "leftGonion",
    mostLateral(raw, MP.leftGonion, midlineX, mouthY, (menton?.y ?? 0.9) + 0.02),
    0.58,
    "derived",
  );
  put(
    map,
    "rightGonion",
    mostLateral(
      raw,
      MP.rightGonion,
      midlineX,
      mouthY,
      (menton?.y ?? 0.9) + 0.02,
    ),
    0.58,
    "derived",
  );
  return map;
}

/**
 * Profile photographs are mirrored to a right-facing frame before this runs.
 * Anterior is therefore the larger x direction.
 */
export function mapProfileLandmarks(raw: RawFaceLandmark[]): SemanticLandmarkMap {
  return profileContourLandmarks(raw) ?? mapProfileFromIndices(raw);
}

function mapProfileFromIndices(raw: RawFaceLandmark[]): SemanticLandmarkMap {
  const map: SemanticLandmarkMap = {};
  const pronasale = at(raw, MP.pronasale);
  const subnasale = at(raw, MP.subnasale);
  const nasion = at(raw, MP.nasion);
  put(map, "foreheadApex", at(raw, MP.foreheadApex), 0.66, "mediapipe");
  put(map, "glabella", at(raw, MP.glabella), 0.74, "mediapipe");
  put(map, "nasion", nasion, 0.78, "mediapipe");
  put(map, "rhinion", derivedRhinion(nasion, pronasale), 0.48, "derived");
  put(map, "pronasale", pronasale, 0.86, "mediapipe");
  put(map, "subnasale", subnasale, 0.8, "mediapipe");
  put(map, "columella", derivedColumella(pronasale, subnasale), 0.5, "derived");
  put(map, "labialeSuperius", at(raw, MP.labialeSuperius), 0.8, "mediapipe");
  put(map, "stomion", stomion(raw), 0.76, "derived");
  put(map, "labialeInferius", at(raw, MP.labialeInferius), 0.8, "mediapipe");
  put(map, "sublabiale", mostPosterior(raw, MP.sulcus), 0.55, "derived");
  put(map, "pogonion", mostAnterior(raw, MP.chinFront), 0.62, "derived");
  put(map, "menton", at(raw, MP.menton), 0.84, "mediapipe");
  return map;
}

export function mapLandmarks(
  raw: RawFaceLandmark[],
  view: FaceView,
): SemanticLandmarkMap {
  return view === "front" ? mapFrontLandmarks(raw) : mapProfileLandmarks(raw);
}
