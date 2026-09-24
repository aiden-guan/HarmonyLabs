import type { SemanticLandmark, SemanticLandmarkMap } from "@/types/face";

export function mapLandmarks(
  points: Partial<Record<SemanticLandmark["key"], [number, number]>>,
): SemanticLandmarkMap {
  const map: SemanticLandmarkMap = {};
  for (const [key, value] of Object.entries(points) as Array<[SemanticLandmark["key"], [number, number]]>) {
    map[key] = { key, x: value[0], y: value[1], confidence: 1, source: "manual" };
  }
  return map;
}

export function transformMap(
  map: SemanticLandmarkMap,
  project: (point: { x: number; y: number }) => { x: number; y: number },
): SemanticLandmarkMap {
  const next: SemanticLandmarkMap = {};
  for (const [key, landmark] of Object.entries(map) as Array<[SemanticLandmark["key"], SemanticLandmark]>) {
    const point = project(landmark);
    next[key] = { ...landmark, x: point.x, y: point.y };
  }
  return next;
}

export function translate(map: SemanticLandmarkMap, dx: number, dy: number): SemanticLandmarkMap {
  return transformMap(map, (point) => ({ x: point.x + dx, y: point.y + dy }));
}

export function scaleAbout(
  map: SemanticLandmarkMap,
  origin: { x: number; y: number },
  scale: number,
): SemanticLandmarkMap {
  return transformMap(map, (point) => ({
    x: origin.x + (point.x - origin.x) * scale,
    y: origin.y + (point.y - origin.y) * scale,
  }));
}

/**
 * A 2D stand-in for yaw: compress horizontal offsets from the midline.
 * It is not a camera model. It shows which ratios move when left-right
 * geometry changes and which stay put.
 */
export function compressWidth(map: SemanticLandmarkMap, factor: number, midline = 0.5): SemanticLandmarkMap {
  return transformMap(map, (point) => ({
    x: midline + (point.x - midline) * factor,
    y: point.y,
  }));
}

export function jitter(map: SemanticLandmarkMap, amount: number, salt = 1): SemanticLandmarkMap {
  return transformMap(map, (point) => ({
    x: point.x + Math.sin((point.x + salt) * 12.9898) * amount,
    y: point.y + Math.cos((point.y + salt) * 78.233) * amount,
  }));
}
