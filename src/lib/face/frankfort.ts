import { MP } from "@/lib/face/mediapipe-map";
import type { RawFaceLandmark } from "@/types/face";

/** Small in-plane tilts are leveled. A large up or down look is left as a warning. */
const LEVEL_MIN_DEGREES = 0.8;
const LEVEL_MAX_DEGREES = 15;

export interface FrankfortPlan {
  /** Clockwise radians that make the ear-to-eyelid line horizontal. Null when no leveling is applied. */
  radians: number | null;
  /** Tilt to warn about, when it is too large to treat as a small correction. */
  warnTilt: number | null;
}

/**
 * Photographic Frankfort line: visible ear canal to the lower eyelid on that side.
 * The visible ear is the one farther behind the nose, so a left- or right-facing
 * photo uses the ear that is actually in frame.
 */
export function frankfortTilt(raw: RawFaceLandmark[], width: number, height: number): number | null {
  const pair = visibleFrankfort(raw);
  if (!pair || width <= 0 || height <= 0) return null;
  const dx = pair.orbit.x * width - pair.ear.x * width;
  const dy = pair.orbit.y * height - pair.ear.y * height;
  if (Math.hypot(dx, dy) < Math.max(width, height) * 0.04) return null;
  const degrees = (Math.atan2(dy, dx) * 180) / Math.PI;
  return Number.isFinite(degrees) ? degrees : null;
}

export function planFrankfortLevel(raw: RawFaceLandmark[], width: number, height: number): FrankfortPlan {
  const tilt = frankfortTilt(raw, width, height);
  if (tilt === null) return { radians: null, warnTilt: null };
  const abs = Math.abs(tilt);
  if (abs < LEVEL_MIN_DEGREES) return { radians: null, warnTilt: null };
  if (abs <= LEVEL_MAX_DEGREES) return { radians: (-tilt * Math.PI) / 180, warnTilt: null };
  return { radians: null, warnTilt: tilt };
}

/** Clockwise rotation around the image center. Matches canvas `rotate` with y increasing downward. */
export function rotateRawLandmarks(
  raw: RawFaceLandmark[],
  radians: number,
  width: number,
  height: number,
): RawFaceLandmark[] {
  const cx = width / 2;
  const cy = height / 2;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return raw.map((point) => {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return point;
    const dx = point.x * width - cx;
    const dy = point.y * height - cy;
    return {
      ...point,
      x: (cx + dx * cos - dy * sin) / width,
      y: (cy + dx * sin + dy * cos) / height,
    };
  });
}

function visibleFrankfort(raw: RawFaceLandmark[]): { ear: RawFaceLandmark; orbit: RawFaceLandmark } | null {
  const nose = raw[MP.pronasale];
  const candidates = [
    { ear: raw[MP.rightTragion], orbit: raw[MP.rightEyeBottom] },
    { ear: raw[MP.leftTragion], orbit: raw[MP.leftEyeBottom] },
  ].filter((pair): pair is { ear: RawFaceLandmark; orbit: RawFaceLandmark } => usable(pair.ear) && usable(pair.orbit));
  if (candidates.length === 0) return null;
  if (!usable(nose)) return candidates[0];
  candidates.sort((a, b) => Math.abs(b.ear.x - nose.x) - Math.abs(a.ear.x - nose.x));
  return candidates[0];
}

function usable(point: RawFaceLandmark | undefined): point is RawFaceLandmark {
  return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));
}
