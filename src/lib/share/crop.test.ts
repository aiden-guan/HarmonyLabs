import { describe, expect, it } from "vitest";
import { calculateCoverCrop } from "./crop";

describe("calculateCoverCrop", () => {
  it("returns entire source if aspect ratios match exactly", () => {
    const crop = calculateCoverCrop(1000, 1000, 500, 500);
    expect(crop).toEqual({ sx: 0, sy: 0, sw: 1000, sh: 1000 });
  });

  it("crops horizontal sides when source is wider than target", () => {
    // 2:1 aspect ratio source (1600x800) into 1:1 aspect target (800x800)
    const crop = calculateCoverCrop(1600, 800, 800, 800);
    expect(crop.sw).toBe(800);
    expect(crop.sh).toBe(800);
    expect(crop.sx).toBe(400); // centered: (1600 - 800) / 2
    expect(crop.sy).toBe(0);
  });

  it("respects focusX when source is wider than target", () => {
    // 2000x1000 into 1000x1000 with focusX = 0.2
    // remainingX = 1000; sx = 1000 * 0.2 = 200
    const crop = calculateCoverCrop(2000, 1000, 1000, 1000, 0.4, undefined, 0.2);
    expect(crop.sw).toBe(1000);
    expect(crop.sh).toBe(1000);
    expect(crop.sx).toBe(200);
  });

  it("crops vertical excess with upper-center bias when source is taller than target", () => {
    // 1:2 aspect ratio source (800x1600) into 1:1 target (800x800)
    // remaining vertical space is 1600 - 800 = 800.
    // default focusY = 0.4 -> sy = 800 * 0.4 = 320
    const crop = calculateCoverCrop(800, 1600, 800, 800, 0.4);
    expect(crop.sw).toBe(800);
    expect(crop.sh).toBe(800);
    expect(crop.sx).toBe(0);
    expect(crop.sy).toBe(320);
  });

  it("dynamically centers around face landmarks when provided", () => {
    // Taller image: 1000 x 3000 into 1000 x 1000 (targetAspect = 1)
    // sh = 1000, remainingY = 2000
    // Suppose face is located between y = 0.60 and y = 0.80 (i.e. y = 1800 to 2400)
    // faceCenterY = 2100
    const landmarks = [
      { x: 0.5, y: 0.60 }, // forehead / trichion
      { x: 0.5, y: 0.70 }, // nose / pronasale
      { x: 0.5, y: 0.80 }, // chin / menton
    ];
    const crop = calculateCoverCrop(1000, 3000, 1000, 1000, 0.4, landmarks);
    expect(crop.sw).toBe(1000);
    expect(crop.sh).toBe(1000);
    // The crop MUST contain the entire face (1800 to 2400)
    expect(crop.sy).toBeLessThanOrEqual(1800);
    expect(crop.sy + crop.sh).toBeGreaterThanOrEqual(2400);
  });

  it("handles standard 4:5 social share card proportions from portrait phone camera (3:4)", () => {
    // Source: 3000 x 4000 (aspect 0.75). Target: 1080 x 945 (aspect ~1.14)
    const crop = calculateCoverCrop(3000, 4000, 1080, 945);
    expect(crop.sw).toBeLessThanOrEqual(3000);
    expect(crop.sh).toBeLessThanOrEqual(4000);
    expect(crop.sx).toBeGreaterThanOrEqual(0);
    expect(crop.sy).toBeGreaterThanOrEqual(0);
    // Aspect of cropped area should match target aspect
    const cropAspect = crop.sw / crop.sh;
    const targetAspect = 1080 / 945;
    expect(Math.abs(cropAspect - targetAspect)).toBeLessThan(0.01);
  });

  it("safely handles 0 or negative inputs", () => {
    const crop = calculateCoverCrop(0, 0, 100, 100);
    expect(crop.sw).toBeGreaterThanOrEqual(1);
    expect(crop.sh).toBeGreaterThanOrEqual(1);
  });
});
