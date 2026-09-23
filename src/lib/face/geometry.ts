import type { Point } from "@/types/face";

const EPSILON = 1e-8;

export function isFinitePoint(point: Point | null | undefined): point is Point {
  return Boolean(
    point &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y) &&
      (point.z === undefined || Number.isFinite(point.z)),
  );
}

function finiteOrNull(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

export function distance(a: Point, b: Point): number | null {
  if (!isFinitePoint(a) || !isFinitePoint(b)) return null;
  return finiteOrNull(Math.hypot(a.x - b.x, a.y - b.y));
}

export function distance3D(a: Point, b: Point): number | null {
  if (!isFinitePoint(a) || !isFinitePoint(b)) return null;
  const az = a.z ?? 0;
  const bz = b.z ?? 0;
  return finiteOrNull(Math.hypot(a.x - b.x, a.y - b.y, az - bz));
}

export function horizontalDistance(a: Point, b: Point): number | null {
  if (!isFinitePoint(a) || !isFinitePoint(b)) return null;
  return finiteOrNull(Math.abs(a.x - b.x));
}

export function verticalDistance(a: Point, b: Point): number | null {
  if (!isFinitePoint(a) || !isFinitePoint(b)) return null;
  return finiteOrNull(Math.abs(a.y - b.y));
}

/** Positive when `lower` sits below `upper` in image coordinates (y increases downward). */
export function downwardSpan(upper: Point, lower: Point): number | null {
  if (!isFinitePoint(upper) || !isFinitePoint(lower)) return null;
  const span = lower.y - upper.y;
  if (!Number.isFinite(span) || span <= EPSILON) return null;
  return span;
}

export function midpoint(a: Point, b: Point): Point | null {
  if (!isFinitePoint(a) || !isFinitePoint(b)) return null;
  const z =
    a.z !== undefined && b.z !== undefined ? (a.z + b.z) / 2 : undefined;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z };
}

/** Interior angle at `vertex`, in degrees, from 0 to 180. */
export function angle(a: Point, vertex: Point, b: Point): number | null {
  if (!isFinitePoint(a) || !isFinitePoint(vertex) || !isFinitePoint(b)) {
    return null;
  }
  const v1x = a.x - vertex.x;
  const v1y = a.y - vertex.y;
  const v2x = b.x - vertex.x;
  const v2y = b.y - vertex.y;
  const n1 = Math.hypot(v1x, v1y);
  const n2 = Math.hypot(v2x, v2y);
  if (n1 < EPSILON || n2 < EPSILON) return null;
  const cosine = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / (n1 * n2)));
  const degrees = (Math.acos(cosine) * 180) / Math.PI;
  return finiteOrNull(degrees);
}

/** Signed angle from vector vertex→a to vector vertex→b, in degrees, from -180 to 180. */
export function signedAngle(a: Point, vertex: Point, b: Point): number | null {
  if (!isFinitePoint(a) || !isFinitePoint(vertex) || !isFinitePoint(b)) {
    return null;
  }
  const v1x = a.x - vertex.x;
  const v1y = a.y - vertex.y;
  const v2x = b.x - vertex.x;
  const v2y = b.y - vertex.y;
  if (Math.hypot(v1x, v1y) < EPSILON || Math.hypot(v2x, v2y) < EPSILON) {
    return null;
  }
  const degrees =
    (Math.atan2(v1x * v2y - v1y * v2x, v1x * v2x + v1y * v2y) * 180) /
    Math.PI;
  return finiteOrNull(degrees);
}

/** Smaller angle between two infinite lines, in degrees, from 0 to 90. */
export function angleBetweenLines(
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point,
): number | null {
  if (
    !isFinitePoint(a1) ||
    !isFinitePoint(a2) ||
    !isFinitePoint(b1) ||
    !isFinitePoint(b2)
  ) {
    return null;
  }
  const d1x = a2.x - a1.x;
  const d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;
  const n1 = Math.hypot(d1x, d1y);
  const n2 = Math.hypot(d2x, d2y);
  if (n1 < EPSILON || n2 < EPSILON) return null;
  const cosine = Math.min(
    1,
    Math.max(-1, (d1x * d2x + d1y * d2y) / (n1 * n2)),
  );
  let degrees = (Math.acos(cosine) * 180) / Math.PI;
  if (degrees > 90) degrees = 180 - degrees;
  return finiteOrNull(degrees);
}

export function slope(a: Point, b: Point): number | null {
  if (!isFinitePoint(a) || !isFinitePoint(b)) return null;
  const dx = b.x - a.x;
  if (Math.abs(dx) < EPSILON) return null;
  return finiteOrNull((b.y - a.y) / dx);
}

export function lineIntersection(
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point,
): Point | null {
  if (
    !isFinitePoint(a1) ||
    !isFinitePoint(a2) ||
    !isFinitePoint(b1) ||
    !isFinitePoint(b2)
  ) {
    return null;
  }
  const d1x = a2.x - a1.x;
  const d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;
  const denom = d1x * d2y - d1y * d2x;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-10) return null;
  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / denom;
  const x = a1.x + t * d1x;
  const y = a1.y + t * d1y;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

export function projection(point: Point, a: Point, b: Point): Point | null {
  if (!isFinitePoint(point) || !isFinitePoint(a) || !isFinitePoint(b)) {
    return null;
  }
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (!Number.isFinite(len2) || len2 < 1e-12) return null;
  const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / len2;
  if (!Number.isFinite(t)) return null;
  return { x: a.x + t * dx, y: a.y + t * dy };
}

export function pointLineDistance(
  point: Point,
  a: Point,
  b: Point,
): number | null {
  const projected = projection(point, a, b);
  if (!projected) return null;
  return distance(point, projected);
}

/**
 * Signed distance from `point` to directed line a→b.
 * In y-down image coordinates, positive means the point lies to the right of
 * the directed line. For a right-facing profile and a downward facial line,
 * that is the anterior side.
 */
export function signedPointLineDistance(
  point: Point,
  a: Point,
  b: Point,
): number | null {
  if (!isFinitePoint(point) || !isFinitePoint(a) || !isFinitePoint(b)) {
    return null;
  }
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (!Number.isFinite(len) || len < EPSILON) return null;
  const cross = dy * (point.x - a.x) - dx * (point.y - a.y);
  return finiteOrNull(cross / len);
}

export function normalizeRatio(
  numerator: number,
  denominator: number,
): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (Math.abs(denominator) < EPSILON) return null;
  return finiteOrNull(numerator / denominator);
}

/** Absolute difference divided by a reference length. */
export function symmetryDifference(
  left: number,
  right: number,
  reference: number,
): number | null {
  if (![left, right, reference].every(Number.isFinite)) return null;
  if (Math.abs(reference) < EPSILON) return null;
  return finiteOrNull(Math.abs(left - right) / Math.abs(reference));
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function canthalTiltDegrees(outer: Point, inner: Point): number | null {
  if (!isFinitePoint(outer) || !isFinitePoint(inner)) return null;
  const dx = Math.abs(outer.x - inner.x);
  const dy = inner.y - outer.y;
  if (dx < EPSILON) return null;
  return finiteOrNull((Math.atan2(dy, dx) * 180) / Math.PI);
}
