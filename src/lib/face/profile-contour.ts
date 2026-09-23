import { FACE_OVAL_LOOP } from "@/lib/face/face-oval";
import { clamp01 } from "@/lib/face/geometry";
import type { RawFaceLandmark, SemanticLandmarkKey, SemanticLandmarkMap } from "@/types/face";

/**
 * Profile points are read from the anterior soft-tissue outline.
 * MediaPipe's frontal vertex names drift once the head is in true profile,
 * because the mesh folds the hidden side. Glabella, nasion, the bridge,
 * the tip, subnasale, the lips, the chin fold, and pogonion are the
 * convexities and concavities of that outline, which is how profile
 * photographs are measured.
 *
 * A three-quarter view is not folded in here. Its projected angles are not
 * the lateral angles these metrics name.
 */

const MIDLINE = [
  8, 9, 168, 6, 197, 195, 5, 4, 1, 19, 94, 2, 164, 0, 11, 12, 13, 14, 15, 16, 17, 18, 200, 199, 175,
] as const;

const CANDIDATES = [...new Set<number>([...FACE_OVAL_LOOP, ...MIDLINE])];

interface ContourPoint {
  x: number;
  y: number;
  z: number;
}

function candidates(raw: RawFaceLandmark[]): ContourPoint[] {
  const points: ContourPoint[] = [];
  for (const index of CANDIDATES) {
    const point = raw[index];
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    if (point.x < -0.05 || point.x > 1.05 || point.y < -0.05 || point.y > 1.05) continue;
    points.push({
      x: point.x,
      y: point.y,
      z: Number.isFinite(point.z) ? point.z : 0,
    });
  }
  return points;
}

function distinctCount(points: ContourPoint[]): number {
  return new Set(points.map((point) => `${point.x.toFixed(3)}:${point.y.toFixed(3)}`)).size;
}

/** One point per vertical slice: the most anterior vertex in that slice. */
function anteriorEnvelope(points: ContourPoint[], bins = 48): ContourPoint[] {
  if (points.length < 8) return [];
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  const height = maxY - minY;
  if (height < 0.15) return [];
  const envelope: ContourPoint[] = [];
  for (let index = 0; index < bins; index += 1) {
    const y0 = minY + (height * index) / bins;
    const y1 = minY + (height * (index + 1)) / bins;
    const slice = points.filter((point) => point.y >= y0 && (index === bins - 1 ? point.y <= y1 : point.y < y1));
    if (slice.length === 0) continue;
    let best = slice[0];
    for (const point of slice) {
      if (point.x > best.x) best = point;
    }
    envelope.push(best);
  }
  return suppressSpikes(envelope, minY, height);
}

/**
 * A folded hidden-side vertex can poke past the outline. The nose tip is a
 * real spike, so the middle of the face is left alone.
 */
function suppressSpikes(envelope: ContourPoint[], minY: number, height: number): ContourPoint[] {
  return envelope.map((point, index) => {
    const previous = envelope[index - 1];
    const next = envelope[index + 1];
    if (!previous || !next) return point;
    const fraction = (point.y - minY) / height;
    if (fraction > 0.32 && fraction < 0.7) return point;
    if (point.x > previous.x + 0.045 && point.x > next.x + 0.045) {
      return { ...point, x: Math.max(previous.x, next.x) };
    }
    return point;
  });
}

function between(points: ContourPoint[], y0: number, y1: number): ContourPoint[] {
  const low = Math.min(y0, y1);
  const high = Math.max(y0, y1);
  return points.filter((point) => point.y >= low && point.y <= high);
}

function maxX(points: ContourPoint[]): ContourPoint | null {
  if (points.length === 0) return null;
  return points.reduce((best, point) => (point.x > best.x ? point : best));
}

function minX(points: ContourPoint[]): ContourPoint | null {
  if (points.length === 0) return null;
  return points.reduce((best, point) => (point.x < best.x ? point : best));
}

function lowest(points: ContourPoint[]): ContourPoint | null {
  if (points.length === 0) return null;
  return points.reduce((best, point) => (point.y > best.y ? point : best));
}

function highest(points: ContourPoint[]): ContourPoint | null {
  if (points.length === 0) return null;
  return points.reduce((best, point) => (point.y < best.y ? point : best));
}

function put(map: SemanticLandmarkMap, key: SemanticLandmarkKey, point: ContourPoint, confidence: number) {
  map[key] = {
    key,
    x: clamp01(point.x),
    y: clamp01(point.y),
    z: point.z,
    confidence,
    source: "derived",
  };
}

function ordered(map: SemanticLandmarkMap): boolean {
  const keys: SemanticLandmarkKey[] = [
    "foreheadApex",
    "glabella",
    "nasion",
    "rhinion",
    "pronasale",
    "subnasale",
    "labialeSuperius",
    "labialeInferius",
    "pogonion",
    "menton",
  ];
  let previous = -Infinity;
  for (const key of keys) {
    const point = map[key];
    if (!point || point.y + 0.004 < previous) return false;
    previous = point.y;
  }
  const nasion = map.nasion;
  const tip = map.pronasale;
  const columella = map.columella;
  const subnasale = map.subnasale;
  const sulcus = map.sublabiale;
  const chin = map.pogonion;
  if (!nasion || !tip || !columella || !subnasale || !sulcus || !chin) return false;
  if (tip.x < nasion.x + 0.02) return false;
  if (columella.x < subnasale.x) return false;
  if (sulcus.y < (map.labialeInferius?.y ?? 1) || sulcus.y > chin.y + 0.01) return false;
  return true;
}

function extract(envelope: ContourPoint[]): SemanticLandmarkMap | null {
  if (envelope.length < 12) return null;
  const topY = envelope[0].y;
  const bottomY = envelope[envelope.length - 1].y;
  const height = bottomY - topY;
  if (height < 0.2) return null;
  const yAt = (fraction: number) => topY + height * fraction;

  const pronasale = maxX(between(envelope, yAt(0.32), yAt(0.66)));
  const menton = lowest(between(envelope, yAt(0.86), bottomY + 0.001));
  const glabella = maxX(between(envelope, yAt(0.1), yAt(0.3)));
  const foreheadApex = highest(between(envelope, topY, yAt(0.12))) ?? envelope[0];
  if (!pronasale || !menton || !glabella) return null;

  const nasion = minX(between(envelope, glabella.y + height * 0.02, pronasale.y - height * 0.03));
  if (!nasion) return null;

  const bridge = between(
    envelope,
    nasion.y + (pronasale.y - nasion.y) * 0.28,
    nasion.y + (pronasale.y - nasion.y) * 0.72,
  );
  const rhinion = maxX(bridge) ?? {
    x: nasion.x * 0.45 + pronasale.x * 0.55,
    y: nasion.y * 0.4 + pronasale.y * 0.6,
    z: nasion.z,
  };

  const subnasale = minX(between(envelope, pronasale.y + height * 0.015, pronasale.y + height * 0.16));
  if (!subnasale) return null;

  const columella =
    maxX(
      between(
        envelope,
        pronasale.y + (subnasale.y - pronasale.y) * 0.4,
        pronasale.y + (subnasale.y - pronasale.y) * 0.82,
      ),
    ) ?? {
      x: subnasale.x * 0.4 + pronasale.x * 0.6,
      y: subnasale.y * 0.55 + pronasale.y * 0.45,
      z: subnasale.z,
    };

  const labialeSuperius = maxX(between(envelope, subnasale.y + height * 0.012, subnasale.y + height * 0.1));
  if (!labialeSuperius) return null;
  const labialeInferius = maxX(
    between(envelope, labialeSuperius.y + height * 0.02, labialeSuperius.y + height * 0.12),
  );
  if (!labialeInferius) return null;

  const pogonion = maxX(between(envelope, labialeInferius.y + height * 0.035, menton.y - height * 0.012));
  if (!pogonion) return null;
  const sublabiale = minX(between(envelope, labialeInferius.y + height * 0.008, pogonion.y));
  if (!sublabiale) return null;
  const stomion =
    minX(between(envelope, labialeSuperius.y, labialeInferius.y)) ?? {
      x: (labialeSuperius.x + labialeInferius.x) / 2,
      y: (labialeSuperius.y + labialeInferius.y) / 2,
      z: (labialeSuperius.z + labialeInferius.z) / 2,
    };

  const map: SemanticLandmarkMap = {};
  put(map, "foreheadApex", foreheadApex, 0.7);
  put(map, "glabella", glabella, 0.74);
  put(map, "nasion", nasion, 0.72);
  put(map, "rhinion", rhinion, 0.68);
  put(map, "pronasale", pronasale, 0.84);
  put(map, "columella", columella, 0.62);
  put(map, "subnasale", subnasale, 0.7);
  put(map, "labialeSuperius", labialeSuperius, 0.74);
  put(map, "stomion", stomion, 0.66);
  put(map, "labialeInferius", labialeInferius, 0.74);
  put(map, "sublabiale", sublabiale, 0.64);
  put(map, "pogonion", pogonion, 0.72);
  put(map, "menton", menton, 0.8);
  return ordered(map) ? map : null;
}

/** Returns outline landmarks when the mesh actually has a profile contour. */
export function profileContourLandmarks(raw: RawFaceLandmark[]): SemanticLandmarkMap | null {
  const points = candidates(raw);
  if (distinctCount(points) < 24) return null;
  return extract(anteriorEnvelope(points));
}
