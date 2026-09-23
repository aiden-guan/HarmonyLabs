import { describe, expect, it } from "vitest";
import { MP } from "@/lib/face/mediapipe-map";
import { frankfortTilt, planFrankfortLevel, rotateRawLandmarks } from "@/lib/face/frankfort";
import type { RawFaceLandmark } from "@/types/face";

function mesh(): RawFaceLandmark[] {
  return Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
}

describe("Frankfort leveling", () => {
  it("rotates a small ear-to-eyelid tilt onto a horizontal line", () => {
    const raw = mesh();
    raw[MP.pronasale] = { x: 0.8, y: 0.5, z: 0 };
    raw[MP.rightTragion] = { x: 0.25, y: 0.5, z: 0 };
    raw[MP.leftTragion] = { x: 0.7, y: 0.5, z: 0 };
    raw[MP.rightEyeBottom] = { x: 0.75, y: 0.56, z: 0 };
    raw[MP.leftEyeBottom] = { x: 0.78, y: 0.5, z: 0 };
    const width = 400;
    const height = 400;
    const plan = planFrankfortLevel(raw, width, height);
    expect(plan.warnTilt).toBeNull();
    expect(plan.radians).not.toBeNull();
    const leveled = rotateRawLandmarks(raw, plan.radians!, width, height);
    const ear = leveled[MP.rightTragion];
    const orbit = leveled[MP.rightEyeBottom];
    expect(Math.abs(ear.y - orbit.y)).toBeLessThan(0.004);
    expect(orbit.x).toBeGreaterThan(ear.x);
  });

  it("leaves a large up or down look unrotated and reports it", () => {
    const raw = mesh();
    raw[MP.pronasale] = { x: 0.82, y: 0.5, z: 0 };
    raw[MP.rightTragion] = { x: 0.2, y: 0.4, z: 0 };
    raw[MP.leftTragion] = { x: 0.55, y: 0.4, z: 0 };
    raw[MP.rightEyeBottom] = { x: 0.55, y: 0.7, z: 0 };
    raw[MP.leftEyeBottom] = { x: 0.6, y: 0.4, z: 0 };
    const plan = planFrankfortLevel(raw, 400, 400);
    expect(plan.radians).toBeNull();
    expect(plan.warnTilt).not.toBeNull();
    expect(Math.abs(plan.warnTilt!)).toBeGreaterThan(15);
  });

  it("does nothing when the ear and eyelid are missing", () => {
    expect(frankfortTilt(mesh(), 400, 400)).toBeNull();
    expect(planFrankfortLevel(mesh(), 400, 400)).toEqual({ radians: null, warnTilt: null });
  });
});
