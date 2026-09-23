import { expect, test } from "vitest";
import { fuseProfileLandmarks } from "@/lib/face/profile-fuse";
import { sampleLandmarks } from "@/fixtures/sample-face";
import type { SemanticLandmark } from "@/types/face";

function shift(landmarks: SemanticLandmark[], dx: number, dy: number): SemanticLandmark[] {
  return landmarks.map((landmark) => ({ ...landmark, x: landmark.x + dx, y: landmark.y + dy }));
}

test("combines two true profiles in the kept photograph's frame", () => {
  const primary = sampleLandmarks("profile");
  const secondary = shift(primary, 0.04, -0.02);
  const fused = fuseProfileLandmarks(primary, secondary);
  expect(fused.ok).toBe(true);
  if (!fused.ok) return;
  const nose = fused.landmarks.find((landmark) => landmark.key === "pronasale");
  const original = primary.find((landmark) => landmark.key === "pronasale");
  expect(nose && original).toBeTruthy();
  expect(nose!.x).toBeCloseTo(original!.x, 2);
  expect(fused.disagreed).toEqual([]);
});

test("keeps a point that the two sides do not share", () => {
  const primary = sampleLandmarks("profile");
  const secondary = shift(primary, 0.03, 0).map((landmark) =>
    landmark.key === "pogonion" ? { ...landmark, x: landmark.x + 0.2 } : landmark,
  );
  const fused = fuseProfileLandmarks(primary, secondary);
  expect(fused.ok).toBe(true);
  if (!fused.ok) return;
  expect(fused.disagreed).toContain("pogonion");
  const chin = fused.landmarks.find((landmark) => landmark.key === "pogonion");
  const original = primary.find((landmark) => landmark.key === "pogonion");
  expect(chin?.x).toBeCloseTo(original?.x ?? 0, 5);
});

test("refuses profiles that disagree across the outline", () => {
  const primary = sampleLandmarks("profile");
  const secondary = primary.map((landmark) => ({ ...landmark, x: landmark.key === "nasion" ? landmark.x : landmark.x + 0.18 }));
  const fused = fuseProfileLandmarks(primary, secondary);
  expect(fused.ok).toBe(false);
});
