import { MP } from "@/lib/face/mediapipe-map";
import type { RawFaceLandmark } from "@/types/face";

export interface AggregatedFace {
  face: RawFaceLandmark[];
  frameCount: number;
  acceptedCount: number;
  /** Median absolute residual of the anchor points after alignment, in normalized units. */
  dispersion: number | null;
}

interface Vec {
  x: number;
  y: number;
}

function point(face: RawFaceLandmark[], index: number): Vec | null {
  const landmark = face[index];
  if (!landmark || !Number.isFinite(landmark.x) || !Number.isFinite(landmark.y)) return null;
  return { x: landmark.x, y: landmark.y };
}

function anchors(face: RawFaceLandmark[]): Vec[] | null {
  const left = point(face, MP.leftPupil);
  const right = point(face, MP.rightPupil);
  const chin = point(face, MP.menton);
  if (!left || !right || !chin) return null;
  return [left, right, chin];
}

function centroid(points: Vec[]): Vec {
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

/** 2D similarity that maps `from` onto `to`. */
function similarity(from: Vec[], to: Vec[]): ((point: Vec) => Vec) | null {
  if (from.length !== to.length || from.length < 2) return null;
  const src = centroid(from);
  const dst = centroid(to);
  let dot = 0;
  let cross = 0;
  let srcEnergy = 0;
  for (let index = 0; index < from.length; index += 1) {
    const sx = from[index].x - src.x;
    const sy = from[index].y - src.y;
    const dx = to[index].x - dst.x;
    const dy = to[index].y - dst.y;
    dot += sx * dx + sy * dy;
    cross += sx * dy - sy * dx;
    srcEnergy += sx * sx + sy * sy;
  }
  if (srcEnergy < 1e-8) return null;
  const scale = Math.hypot(dot, cross) / srcEnergy;
  const angle = Math.atan2(cross, dot);
  const cos = Math.cos(angle) * scale;
  const sin = Math.sin(angle) * scale;
  return (point) => ({
    x: dst.x + cos * (point.x - src.x) - sin * (point.y - src.y),
    y: dst.y + sin * (point.x - src.x) + cos * (point.y - src.y),
  });
}

function residual(mapped: Vec[], target: Vec[]): number {
  let sum = 0;
  for (let index = 0; index < mapped.length; index += 1) {
    sum += Math.hypot(mapped[index].x - target[index].x, mapped[index].y - target[index].y);
  }
  return sum / mapped.length;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function mad(values: number[]): number {
  if (values.length === 0) return 0;
  const center = median(values);
  return median(values.map((value) => Math.abs(value - center)));
}

/**
 * Align repeated landmark frames to the reference frame, drop outliers with a
 * MAD gate, and take the coordinate-wise median. The returned mesh is in the
 * reference frame so it still sits on that photograph.
 */
export function aggregateLandmarkFrames(
  frames: RawFaceLandmark[][],
  reference: RawFaceLandmark[],
): AggregatedFace {
  const single = { face: reference, frameCount: frames.length, acceptedCount: 1, dispersion: null };
  if (reference.length < 100) return single;
  const targetAnchors = anchors(reference);
  if (!targetAnchors) return single;

  const aligned: RawFaceLandmark[][] = [];
  const residuals: number[] = [];
  for (const frame of frames) {
    if (frame.length !== reference.length) continue;
    const source = anchors(frame);
    if (!source) continue;
    const map = similarity(source, targetAnchors);
    if (!map) continue;
    const mappedAnchors = source.map(map);
    const error = residual(mappedAnchors, targetAnchors);
    const next = frame.map((landmark) => {
      const moved = map(landmark);
      return { ...landmark, x: moved.x, y: moved.y };
    });
    aligned.push(next);
    residuals.push(error);
  }
  if (aligned.length < 7) return { ...single, frameCount: frames.length, acceptedCount: aligned.length };

  const center = median(residuals);
  const spread = mad(residuals);
  const gate = Math.max(0.012, center + 3 * 1.4826 * spread);
  const kept = aligned.filter((_, index) => residuals[index] <= gate);
  const keptResiduals = residuals.filter((value) => value <= gate);
  if (kept.length < 7) return { ...single, frameCount: frames.length, acceptedCount: kept.length, dispersion: center };

  const face = reference.map((landmark, index) => {
    const xs = kept.map((frame) => frame[index]?.x).filter((value): value is number => Number.isFinite(value));
    const ys = kept.map((frame) => frame[index]?.y).filter((value): value is number => Number.isFinite(value));
    const zs = kept.map((frame) => frame[index]?.z).filter((value): value is number => Number.isFinite(value));
    if (xs.length === 0 || ys.length === 0) return landmark;
    return {
      ...landmark,
      x: median(xs),
      y: median(ys),
      z: zs.length > 0 ? median(zs) : landmark.z,
    };
  });
  return {
    face,
    frameCount: frames.length,
    acceptedCount: kept.length,
    dispersion: median(keptResiduals),
  };
}
