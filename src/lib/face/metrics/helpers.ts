import {
  angle,
  angleBetweenLines,
  canthalTiltDegrees,
  distance,
  downwardSpan,
  normalizeRatio,
  pointLineDistance,
  signedPointLineDistance,
  symmetryDifference,
} from "@/lib/face/geometry";
import type {
  Point,
  SemanticLandmarkKey,
  SemanticLandmarkMap,
} from "@/types/face";

export function landmark(
  map: SemanticLandmarkMap,
  key: SemanticLandmarkKey,
): Point | null {
  const point = map[key];
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  return point;
}

export function landmarks(
  map: SemanticLandmarkMap,
  keys: SemanticLandmarkKey[],
): Point[] | null {
  const points: Point[] = [];
  for (const key of keys) {
    const point = landmark(map, key);
    if (!point) return null;
    points.push(point);
  }
  return points;
}

export function span(
  map: SemanticLandmarkMap,
  a: SemanticLandmarkKey,
  b: SemanticLandmarkKey,
): number | null {
  const points = landmarks(map, [a, b]);
  if (!points) return null;
  return distance(points[0], points[1]);
}

export function vertical(
  map: SemanticLandmarkMap,
  upper: SemanticLandmarkKey,
  lower: SemanticLandmarkKey,
): number | null {
  const points = landmarks(map, [upper, lower]);
  if (!points) return null;
  return downwardSpan(points[0], points[1]);
}

export function percentDifference(
  left: number | null,
  right: number | null,
  reference: number | null,
): number | null {
  if (left === null || right === null || reference === null) return null;
  const ratio = symmetryDifference(left, right, reference);
  if (ratio === null) return null;
  return ratio * 100;
}

export function mean(values: Array<number | null>): number | null {
  if (values.some((value) => value === null)) return null;
  const numbers = values as number[];
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

export function pupilMidlineX(map: SemanticLandmarkMap): number | null {
  const pupils = landmarks(map, ["leftPupil", "rightPupil"]);
  if (!pupils) return null;
  return (pupils[0].x + pupils[1].x) / 2;
}

export function midlineOffsetPercent(
  map: SemanticLandmarkMap,
  key: SemanticLandmarkKey,
): number | null {
  const point = landmark(map, key);
  const midline = pupilMidlineX(map);
  const width = span(map, "leftZygion", "rightZygion");
  if (!point || midline === null || width === null) return null;
  const ratio = symmetryDifference(point.x, midline, width);
  if (ratio === null) return null;
  return ratio * 100;
}

export function interiorAngle(
  map: SemanticLandmarkMap,
  a: SemanticLandmarkKey,
  vertex: SemanticLandmarkKey,
  b: SemanticLandmarkKey,
): number | null {
  const points = landmarks(map, [a, vertex, b]);
  if (!points) return null;
  return angle(points[0], points[1], points[2]);
}

export function linesAngle(
  map: SemanticLandmarkMap,
  a1: SemanticLandmarkKey,
  a2: SemanticLandmarkKey,
  b1: SemanticLandmarkKey,
  b2: SemanticLandmarkKey,
): number | null {
  const points = landmarks(map, [a1, a2, b1, b2]);
  if (!points) return null;
  return angleBetweenLines(points[0], points[1], points[2], points[3]);
}

export function ratioOf(
  numerator: number | null,
  denominator: number | null,
): number | null {
  if (numerator === null || denominator === null) return null;
  return normalizeRatio(numerator, denominator);
}

export function averageCanthalTilt(map: SemanticLandmarkMap): number | null {
  const leftOuter = landmark(map, "leftOuterCanthus");
  const leftInner = landmark(map, "leftInnerCanthus");
  const rightOuter = landmark(map, "rightOuterCanthus");
  const rightInner = landmark(map, "rightInnerCanthus");
  if (!leftOuter || !leftInner || !rightOuter || !rightInner) return null;
  const left = canthalTiltDegrees(leftOuter, leftInner);
  const right = canthalTiltDegrees(rightOuter, rightInner);
  return mean([left, right]);
}

export function nasalProjectionRatio(map: SemanticLandmarkMap): number | null {
  const pronasale = landmark(map, "pronasale");
  const nasion = landmark(map, "nasion");
  const subnasale = landmark(map, "subnasale");
  if (!pronasale || !nasion || !subnasale) return null;
  const offset = pointLineDistance(pronasale, nasion, subnasale);
  const length = distance(nasion, pronasale);
  return ratioOf(offset, length);
}

export function chinProjectionRatio(map: SemanticLandmarkMap): number | null {
  const pogonion = landmark(map, "pogonion");
  const glabella = landmark(map, "glabella");
  const menton = landmark(map, "menton");
  const subnasale = landmark(map, "subnasale");
  if (!pogonion || !glabella || !menton || !subnasale) return null;
  const signed = signedPointLineDistance(pogonion, glabella, menton);
  const lower = distance(subnasale, menton);
  return ratioOf(signed, lower);
}
