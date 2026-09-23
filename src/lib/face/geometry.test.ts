import { describe, expect, it } from "vitest";
import {
  angle,
  angleBetweenLines,
  canthalTiltDegrees,
  distance,
  distance3D,
  horizontalDistance,
  lineIntersection,
  midpoint,
  normalizeRatio,
  pointLineDistance,
  projection,
  signedAngle,
  signedPointLineDistance,
  slope,
  symmetryDifference,
  verticalDistance,
} from "@/lib/face/geometry";

const origin = { x: 0, y: 0 };
const unitX = { x: 1, y: 0 };
const unitY = { x: 0, y: 1 };
const threeFour = { x: 3, y: 4 };

describe("geometry", () => {
  it("measures planar and 3D distance", () => {
    expect(distance(origin, threeFour)).toBe(5);
    expect(distance3D({ x: 0, y: 0, z: 0 }, { x: 1, y: 2, z: 2 })).toBe(3);
    expect(distance3D(origin, unitX)).toBe(1);
    expect(horizontalDistance(unitX, { x: 4, y: 9 })).toBe(3);
    expect(verticalDistance(unitY, { x: 8, y: -2 })).toBe(3);
  });

  it("returns null for malformed points and zero-length angles", () => {
    const bad = { x: Number.NaN, y: 0 };
    expect(distance(bad, origin)).toBeNull();
    expect(angle(origin, origin, unitX)).toBeNull();
    expect(signedAngle(origin, origin, unitX)).toBeNull();
    expect(normalizeRatio(1, 0)).toBeNull();
    expect(normalizeRatio(Number.NaN, 2)).toBeNull();
    expect(symmetryDifference(1, 1, 0)).toBeNull();
  });

  it("computes angles, slope, and intersections", () => {
    expect(angle(unitX, origin, unitY)).toBeCloseTo(90, 6);
    expect(signedAngle(unitX, origin, unitY)).toBeCloseTo(90, 6);
    expect(signedAngle(unitY, origin, unitX)).toBeCloseTo(-90, 6);
    expect(slope(origin, { x: 2, y: 4 })).toBe(2);
    expect(slope(origin, unitY)).toBeNull();
    expect(angleBetweenLines(origin, unitX, origin, unitY)).toBeCloseTo(90, 6);
    expect(angleBetweenLines(origin, unitX, { x: 0, y: 1 }, { x: 1, y: 1 })).toBeCloseTo(0, 6);
    expect(midpoint(origin, { x: 2, y: 4 })).toEqual({ x: 1, y: 2, z: undefined });
    expect(lineIntersection({ x: 0, y: 1 }, { x: 3, y: 1 }, { x: 1, y: 0 }, { x: 1, y: 2 })).toEqual({
      x: 1,
      y: 1,
    });
    expect(lineIntersection(origin, unitX, { x: 0, y: 1 }, { x: 1, y: 1 })).toBeNull();
  });

  it("projects points and keeps a stable anterior sign", () => {
    expect(projection({ x: 2, y: 5 }, origin, unitX)).toEqual({ x: 2, y: 0 });
    expect(pointLineDistance({ x: 0, y: 3 }, origin, unitX)).toBeCloseTo(3, 6);
    const glabella = { x: 0.4, y: 0.3 };
    const menton = { x: 0.42, y: 0.9 };
    const anteriorChin = { x: 0.55, y: 0.78 };
    const signed = signedPointLineDistance(anteriorChin, glabella, menton);
    expect(signed).not.toBeNull();
    expect(signed as number).toBeGreaterThan(0);
    const expected =
      (0.6 * 0.15 - 0.02 * 0.48) / Math.hypot(0.02, 0.6);
    expect(signed).toBeCloseTo(expected, 6);
  });

  it("normalizes ratios and canthal tilt", () => {
    expect(normalizeRatio(2, 4)).toBe(0.5);
    expect(symmetryDifference(4, 2, 10)).toBe(0.2);
    const tilt = canthalTiltDegrees({ x: 0.3, y: 0.43 }, { x: 0.43, y: 0.445 });
    expect(tilt).toBeCloseTo((Math.atan2(0.015, 0.13) * 180) / Math.PI, 5);
  });
});
