import type { SemanticLandmark, SemanticLandmarkKey, SemanticLandmarkMap } from "@/types/face";

/**
 * Left and right true laterals are the multi-photo protocol that reduces
 * error. Each side is normalized by its own nasion–menton frame, then the
 * middle of the two outlines is written back onto the photograph that is
 * kept. Oblique angles are not averaged: they are a different projection.
 */

const SHIFT_LIMIT = 0.08;

interface Frame {
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  ux: number;
  uy: number;
  scale: number;
}

interface Local {
  x: number;
  y: number;
}

function asMap(landmarks: SemanticLandmark[]): SemanticLandmarkMap {
  const map: SemanticLandmarkMap = {};
  for (const landmark of landmarks) map[landmark.key] = landmark;
  return map;
}

function frameOf(map: SemanticLandmarkMap): Frame | null {
  const nasion = map.nasion;
  const menton = map.menton;
  const pronasale = map.pronasale;
  if (!nasion || !menton || !pronasale) return null;
  const dx = menton.x - nasion.x;
  const dy = menton.y - nasion.y;
  const scale = Math.hypot(dx, dy);
  if (scale < 0.05) return null;
  const uy = dy / scale;
  const ux = dx / scale;
  let vx = -uy;
  let vy = ux;
  const noseX = pronasale.x - nasion.x;
  const noseY = pronasale.y - nasion.y;
  if (noseX * vx + noseY * vy < 0) {
    vx = -vx;
    vy = -vy;
  }
  return { originX: nasion.x, originY: nasion.y, vx, vy, ux, uy, scale };
}

function toLocal(point: { x: number; y: number }, frame: Frame): Local {
  const dx = point.x - frame.originX;
  const dy = point.y - frame.originY;
  return {
    x: (dx * frame.vx + dy * frame.vy) / frame.scale,
    y: (dx * frame.ux + dy * frame.uy) / frame.scale,
  };
}

function toImage(local: Local, frame: Frame): { x: number; y: number } {
  return {
    x: frame.originX + local.x * frame.scale * frame.vx + local.y * frame.scale * frame.ux,
    y: frame.originY + local.x * frame.scale * frame.vy + local.y * frame.scale * frame.uy,
  };
}

export interface FusedProfile {
  ok: true;
  landmarks: SemanticLandmark[];
  disagreed: SemanticLandmarkKey[];
}

export interface UnfusedProfile {
  ok: false;
  reason: string;
}

export function fuseProfileLandmarks(
  primary: SemanticLandmark[],
  secondary: SemanticLandmark[],
): FusedProfile | UnfusedProfile {
  const primaryMap = asMap(primary);
  const secondaryMap = asMap(secondary);
  const primaryFrame = frameOf(primaryMap);
  const secondaryFrame = frameOf(secondaryMap);
  if (!primaryFrame || !secondaryFrame) {
    return {
      ok: false,
      reason: "One profile is missing the nasal root or the chin, so the two sides cannot be lined up.",
    };
  }

  const keys = [...new Set([...Object.keys(primaryMap), ...Object.keys(secondaryMap)])] as SemanticLandmarkKey[];
  const disagreed: SemanticLandmarkKey[] = [];
  let compared = 0;
  const landmarks: SemanticLandmark[] = [];

  for (const key of keys) {
    const base = primaryMap[key];
    const other = secondaryMap[key];
    if (!base) continue;
    if (!other) {
      landmarks.push(base);
      continue;
    }
    compared += 1;
    const baseLocal = toLocal(base, primaryFrame);
    const otherLocal = toLocal(other, secondaryFrame);
    const shift = Math.hypot(baseLocal.x - otherLocal.x, baseLocal.y - otherLocal.y);
    if (shift > SHIFT_LIMIT) {
      disagreed.push(key);
      landmarks.push(base);
      continue;
    }
    const image = toImage(
      { x: (baseLocal.x + otherLocal.x) / 2, y: (baseLocal.y + otherLocal.y) / 2 },
      primaryFrame,
    );
    landmarks.push({
      ...base,
      x: image.x,
      y: image.y,
      confidence: Math.min(0.95, (base.confidence + other.confidence) / 2 + 0.04),
      source: "derived",
    });
  }

  if (compared < 6) {
    return {
      ok: false,
      reason: "The two profiles do not share enough points to combine.",
    };
  }
  if (disagreed.length > compared * 0.45) {
    return {
      ok: false,
      reason: "These two profiles do not match. Retake the other side in the same head position, or continue with one side.",
    };
  }
  return { ok: true, landmarks, disagreed };
}
