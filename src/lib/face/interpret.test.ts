import { expect, test } from "vitest";
import { rawSample } from "@/fixtures/raw-sample";
import { interpretDetection } from "@/lib/face/interpret";

test("the front fixture maps to semantic landmarks without a hard error", () => {
  const result = interpretDetection({
    faces: [rawSample("front")],
    view: "front",
    blurScore: 0.8,
    brightnessScore: 0.55,
  });
  expect(result.hardError).toBeNull();
  expect(result.quality.mirrored).toBe(false);
  expect(result.landmarks.some((landmark) => landmark.key === "nasion")).toBe(true);
  expect(result.landmarks.every((landmark) => landmark.x >= 0 && landmark.x <= 1)).toBe(true);
});

test("a right-facing profile fixture stays unmirrored and a left-facing one is flipped", () => {
  const right = interpretDetection({
    faces: [rawSample("profile")],
    view: "profile",
    blurScore: 0.8,
    brightnessScore: 0.55,
  });
  expect(right.hardError).toBeNull();
  expect(right.quality.mirrored).toBe(false);

  const leftFacing = rawSample("profile").map((point) => ({ ...point, x: 1 - point.x }));
  const left = interpretDetection({
    faces: [leftFacing],
    view: "profile",
    blurScore: 0.8,
    brightnessScore: 0.55,
  });
  expect(left.hardError).toBeNull();
  expect(left.quality.mirrored).toBe(true);
  const rightNose = right.landmarks.find((landmark) => landmark.key === "pronasale");
  const leftNose = left.landmarks.find((landmark) => landmark.key === "pronasale");
  expect(rightNose && leftNose).toBeTruthy();
  expect(leftNose!.x).toBeCloseTo(rightNose!.x, 2);
});
