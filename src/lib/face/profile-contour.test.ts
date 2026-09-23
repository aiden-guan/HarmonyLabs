import { expect, test } from "vitest";
import { FACE_OVAL_LOOP } from "@/lib/face/face-oval";
import { profileContourLandmarks } from "@/lib/face/profile-contour";
import type { RawFaceLandmark } from "@/types/face";

const MIDLINE = [8, 9, 168, 6, 197, 195, 5, 4, 1, 19, 94, 2, 164, 0, 11, 12, 13, 14, 15, 16, 17, 18, 200, 199, 175];

const CONTOUR: Array<[number, number]> = [
  [0.42, 0.14],
  [0.5, 0.3],
  [0.44, 0.37],
  [0.56, 0.43],
  [0.74, 0.5],
  [0.62, 0.545],
  [0.52, 0.58],
  [0.6, 0.64],
  [0.55, 0.675],
  [0.59, 0.72],
  [0.48, 0.78],
  [0.58, 0.84],
  [0.5, 0.93],
];

function contourX(y: number): number {
  for (let index = 0; index < CONTOUR.length - 1; index += 1) {
    const [x0, y0] = CONTOUR[index];
    const [x1, y1] = CONTOUR[index + 1];
    if (y >= y0 && y <= y1) return x0 + ((y - y0) / (y1 - y0)) * (x1 - x0);
  }
  return CONTOUR[CONTOUR.length - 1][0];
}

test("reads profile points from the anterior outline and ignores off-outline vertices", () => {
  const raw: RawFaceLandmark[] = Array.from({ length: 478 }, (_, index) => ({
    x: 0.95,
    y: 0.2 + (index % 11) * 0.05,
    z: 0.45,
  }));
  const indices = [...new Set([...FACE_OVAL_LOOP, ...MIDLINE])];
  indices.forEach((index, order) => {
    const y = 0.14 + (0.79 * order) / (indices.length - 1);
    raw[index] = { x: contourX(y), y, z: -0.1 };
  });

  const mapped = profileContourLandmarks(raw);
  expect(mapped).not.toBeNull();
  expect(mapped?.pronasale?.x).toBeGreaterThan(0.68);
  expect(mapped?.nasion?.x).toBeLessThan(mapped?.glabella?.x ?? 0);
  expect(mapped?.nasion?.y).toBeGreaterThan(mapped?.glabella?.y ?? 1);
  expect(mapped?.nasion?.y).toBeLessThan(mapped?.pronasale?.y ?? 0);
  expect(mapped?.rhinion?.y).toBeGreaterThan(mapped?.nasion?.y ?? 1);
  expect(mapped?.rhinion?.y).toBeLessThan(mapped?.pronasale?.y ?? 0);
  expect(mapped?.subnasale?.x).toBeLessThan(mapped?.pronasale?.x ?? 0);
  expect(mapped?.columella?.x).toBeGreaterThan(mapped?.subnasale?.x ?? 1);
  expect(mapped?.sublabiale?.x).toBeLessThan(mapped?.pogonion?.x ?? 0);
  expect(mapped?.menton?.y).toBeGreaterThan(mapped?.pogonion?.y ?? 0);
  expect(mapped?.pogonion?.source).toBe("derived");
});
