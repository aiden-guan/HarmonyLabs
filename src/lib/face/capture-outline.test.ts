import { describe, expect, it } from "vitest";
import { SIDE_FRAME_RATIO, SIDE_PROPORTIONS, sideGuide, threeQuarterGuide } from "@/lib/face/capture-outline";

describe("capture outlines", () => {
  it("draws a lateral head with one eye, a brow break, and a nose ahead of the lips", () => {
    const { pronasale, subnasale, labialeSuperius, nasion, glabella, pogonion, sublabiale, eye, tragion } = SIDE_PROPORTIONS;
    expect(pronasale.x).toBeGreaterThan(labialeSuperius.x);
    expect(pronasale.x - labialeSuperius.x).toBeLessThan(0.2);
    expect(nasion.x).toBeLessThan(glabella.x);
    expect(pogonion.x).toBeGreaterThan(sublabiale.x);
    expect(subnasale.x).toBeLessThan(pronasale.x);
    expect(Math.abs(eye.y - tragion.y)).toBeLessThan(0.05);
    const guide = sideGuide("right");
    expect(guide.pronasale.x).toBeGreaterThan(guide.eyeCenter.x);
    expect(guide.pronasale.x).toBeGreaterThan(0.8);
    expect(guide.pronasale.x).toBeLessThan(0.98);
    expect(guide.eyeCenter.x).toBeGreaterThan(0.05);
    expect(guide.eyeCenter.y).toBeGreaterThan(0.2);
    expect(guide.eyeCenter.y).toBeLessThan(0.5);
    expect(sideGuide("left").pronasale.x).toBeLessThan(0.2);
    expect(guide.ratio).toBe(SIDE_FRAME_RATIO);
    expect(guide.ratio).toBeGreaterThan(1);
  });

  it("draws a three-quarter head with two unequal eyes and an offset nose", () => {
    const guide = threeQuarterGuide("right");
    expect(guide.nearEye.rx).toBeGreaterThan(guide.farEye.rx);
    expect(guide.nearEye.cx).toBeGreaterThan(guide.farEye.cx);
    expect(guide.nose).toMatch(/0\.67 0\.57/);
    const flipped = threeQuarterGuide("left");
    expect(flipped.nearEye.cx).toBeLessThan(flipped.farEye.cx);
    expect(flipped.nearEye.cx).toBeCloseTo(1 - guide.nearEye.cx);
  });
});
