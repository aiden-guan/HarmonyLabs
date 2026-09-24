import { describe, expect, it } from "vitest";
import { calculateMetrics } from "@/lib/face/metrics";
import { MP } from "@/lib/face/mediapipe-map";
import { aggregateLandmarkFrames } from "@/lib/face/frame-aggregate";
import { checkNeutralExpression } from "@/lib/face/expression-qc";
import { compressWidth, mapLandmarks, scaleAbout, translate } from "@/lib/face/validation/synthetic";
import { iccOneWay, summarizeRepeats } from "@/lib/face/validation/repeatability";
import type { RawFaceLandmark } from "@/types/face";

const front = mapLandmarks({
  leftInnerCanthus: [0.43, 0.445],
  rightInnerCanthus: [0.57, 0.445],
  leftOuterCanthus: [0.3, 0.43],
  rightOuterCanthus: [0.7, 0.43],
  leftPupil: [0.36, 0.44],
  rightPupil: [0.64, 0.44],
  nasion: [0.5, 0.42],
  subnasale: [0.5, 0.62],
  menton: [0.5, 0.9],
});

function value(id: string, map = front) {
  return calculateMetrics({ front: map, profile: {} }).find((metric) => metric.id === id)?.value;
}

describe("synthetic geometry", () => {
  it("keeps a ratio under translation and uniform scale", () => {
    const original = value("eye-spacing-ratio");
    expect(original).not.toBeNull();
    expect(value("eye-spacing-ratio", translate(front, 0.05, -0.02))).toBeCloseTo(original ?? 0, 6);
    expect(value("eye-spacing-ratio", scaleAbout(front, { x: 0.5, y: 0.5 }, 1.2))).toBeCloseTo(original ?? 0, 5);
  });

  it("keeps eye spacing under uniform width compression and moves it under a one-sided shift", () => {
    const original = value("eye-spacing-ratio");
    expect(value("eye-spacing-ratio", compressWidth(front, 0.8))).toBeCloseTo(original ?? 0, 2);
    const shifted = { ...front };
    const right = shifted.rightInnerCanthus;
    if (!right) throw new Error("missing canthus");
    shifted.rightInnerCanthus = { ...right, x: right.x + 0.04 };
    expect(value("eye-spacing-ratio", shifted)).not.toBeCloseTo(original ?? 0, 2);
  });

  it("returns null rather than zero when a point is missing", () => {
    const broken = { ...front };
    delete broken.leftInnerCanthus;
    expect(value("eye-spacing-ratio", broken)).toBeNull();
  });
});

describe("multi-frame aggregation", () => {
  it("uses the robust median and drops an outlier", () => {
    const base = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 })) as RawFaceLandmark[];
    base[MP.leftPupil] = { x: 0.4, y: 0.4, z: 0 };
    base[MP.rightPupil] = { x: 0.6, y: 0.4, z: 0 };
    base[MP.menton] = { x: 0.5, y: 0.9, z: 0 };
    const frames = Array.from({ length: 10 }, (_, index) =>
      base.map((point) => ({ ...point, x: point.x + index * 0.0001 })),
    );
    const outlier = base.map((point) => ({ ...point, x: point.x + 0.2 }));
    const aggregated = aggregateLandmarkFrames([...frames, outlier], frames[5]);
    expect(aggregated.acceptedCount).toBeGreaterThanOrEqual(7);
    expect(aggregated.face[MP.leftPupil].x).toBeGreaterThan(0.39);
    expect(aggregated.face[MP.leftPupil].x).toBeLessThan(0.42);
    expect(aggregated.dispersion).not.toBeNull();
  });

  it("keeps the shutter frame when too few frames agree", () => {
    const face = [{ x: 0.2, y: 0.2, z: 0 }];
    const aggregated = aggregateLandmarkFrames([face, face], face);
    expect(aggregated.face).toBe(face);
    expect(aggregated.acceptedCount).toBeLessThan(7);
  });
});

describe("expression QC", () => {
  it("flags a smile and ignores missing blendshapes", () => {
    expect(checkNeutralExpression(null).neutral).toBeNull();
    const smiled = checkNeutralExpression({ mouthSmileLeft: 0.8, mouthSmileRight: 0.1 });
    expect(smiled.neutral).toBe(false);
    expect(smiled.warnings.join(" ")).toMatch(/smile/i);
    expect(checkNeutralExpression({ jawOpen: 0.05, mouthSmileLeft: 0.05 }).neutral).toBe(true);
  });
});

describe("repeatability statistics", () => {
  it("computes mean, dispersion, and ICC from supplied repeats", () => {
    const summary = summarizeRepeats([1, 2, 3]);
    expect(summary?.mean).toBe(2);
    expect(summary?.mad).toBe(1);
    expect(summary?.cv).toBeCloseTo(Math.sqrt(1) / 2, 5);
    expect(iccOneWay([[1, 1], [5, 5]])).toBe(1);
    expect(iccOneWay([[1]])).toBeNull();
  });
});
