import { describe, expect, it } from "vitest";
import { brightnessScore, laplacianVariance, sharpnessScore } from "@/lib/face/image-stats";
import {
  estimatePose,
  evaluatePhotoQuality,
  mirrorRawLandmarks,
  profileFacesLeft,
  profileShapeCue,
} from "@/lib/face/quality";
import { classifyProfilePose } from "@/lib/face/profile-pose";
import { MP } from "@/lib/face/mediapipe-map";
import type { RawFaceLandmark } from "@/types/face";

function blank(size: number, color: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    data[i * 4] = color;
    data[i * 4 + 1] = color;
    data[i * 4 + 2] = color;
    data[i * 4 + 3] = 255;
  }
  return data;
}

describe("image statistics", () => {
  it("treats a flat image as blurry and a checkerboard as sharper", () => {
    const flat = laplacianVariance({ width: 16, height: 16, data: blank(16, 120) });
    expect(flat).toBe(0);
    expect(sharpnessScore(flat)).toBe(0);
    const data = blank(16, 0);
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        const color = (x + y) % 2 === 0 ? 255 : 0;
        const offset = (y * 16 + x) * 4;
        data[offset] = color;
        data[offset + 1] = color;
        data[offset + 2] = color;
      }
    }
    expect(laplacianVariance({ width: 16, height: 16, data })).toBeGreaterThan(1000);
    expect(brightnessScore({ width: 2, height: 1, data: blank(2, 255).slice(0, 8) })).toBeCloseTo(1, 5);
  });
});

describe("photo quality", () => {
  it("blocks an empty frame, multiple faces, and the wrong view", () => {
    expect(
      evaluatePhotoQuality({
        view: "front",
        faceCount: 0,
        pose: { yaw: 0, pitch: 0, roll: 0 },
        blurScore: 0.8,
        brightnessScore: 0.5,
        faceCoverage: 0.3,
        mirrored: false,
      }).hardError,
    ).toMatch(/No face/);

    expect(
      evaluatePhotoQuality({
        view: "front",
        faceCount: 2,
        pose: { yaw: 0, pitch: 0, roll: 0 },
        blurScore: 0.8,
        brightnessScore: 0.5,
        faceCoverage: 0.3,
        mirrored: false,
      }).hardError,
    ).toMatch(/More than one/);

    const turned = evaluatePhotoQuality({
      view: "front",
      faceCount: 1,
      pose: { yaw: 50, pitch: 0, roll: 0 },
      blurScore: 0.8,
      brightnessScore: 0.5,
      faceCoverage: 0.3,
      mirrored: false,
    });
    expect(turned.hardError).toMatch(/front photo/);

    const notProfile = evaluatePhotoQuality({
      view: "profile",
      faceCount: 1,
      pose: { yaw: 5, pitch: 0, roll: 0 },
      blurScore: 0.8,
      brightnessScore: 0.5,
      faceCoverage: 0.3,
      mirrored: false,
    });
    expect(notProfile.hardError).toMatch(/side view/);

    const threeQuarter = evaluatePhotoQuality({
      view: "profile",
      faceCount: 1,
      pose: { yaw: 22, pitch: 0, roll: 40 },
      blurScore: 0.8,
      brightnessScore: 0.5,
      faceCoverage: 0.3,
      mirrored: false,
      profileCue: { eyeCollapse: 0.48, noseLead: 0.06 },
    });
    expect(threeQuarter.hardError).toMatch(/side view/);

    const tilted = evaluatePhotoQuality({
      view: "profile",
      faceCount: 1,
      pose: { yaw: 58, pitch: 20, roll: 40 },
      blurScore: 0.8,
      brightnessScore: 0.5,
      faceCoverage: 0.3,
      mirrored: false,
      profileCue: { eyeCollapse: 0.9, noseLead: 0.22 },
      frankfortTilt: 22,
    });
    expect(tilted.hardError).toBeNull();
    expect(tilted.quality.warnings.some((warning) => warning.includes("tilted"))).toBe(true);

    const stacked = evaluatePhotoQuality({
      view: "profile",
      faceCount: 1,
      pose: { yaw: 36, pitch: 0, roll: 0 },
      blurScore: 0.8,
      brightnessScore: 0.5,
      faceCoverage: 0.3,
      mirrored: false,
      profileCue: { eyeCollapse: 0.86, noseLead: 0.22 },
    });
    expect(stacked.hardError).toMatch(/three-quarter/);
    expect(classifyProfilePose(61, { eyeCollapse: null, noseLead: null })).toBe("nearlyLateral");

    const near = evaluatePhotoQuality({
      view: "profile",
      faceCount: 1,
      pose: { yaw: 52, pitch: 0, roll: 0 },
      blurScore: 0.8,
      brightnessScore: 0.5,
      faceCoverage: 0.12,
      mirrored: false,
      facialHeight: 0.5,
      profileCue: { eyeCollapse: 0.68, noseLead: 0.12 },
    });
    expect(near.hardError).toMatch(/three-quarter/);
  });

  it("warns on mild tilt without blocking", () => {
    const result = evaluatePhotoQuality({
      view: "front",
      faceCount: 1,
      pose: { yaw: 8, pitch: 4, roll: 12 },
      blurScore: 0.8,
      brightnessScore: 0.5,
      faceCoverage: 0.3,
      mirrored: false,
    });
    expect(result.hardError).toBeNull();
    expect(result.quality.warnings.some((warning) => warning.includes("tilt"))).toBe(true);
  });

  it("mirrors a left-facing profile into a right-facing frame", () => {
    const raw: RawFaceLandmark[] = Array.from({ length: 478 }, () => ({
      x: 0.5,
      y: 0.5,
      z: 0,
    }));
    raw[MP.pronasale] = { x: 0.3, y: 0.5, z: 0 };
    raw[MP.leftLateral[0]] = { x: 0.7, y: 0.45, z: -0.2 };
    raw[MP.rightLateral[0]] = { x: 0.55, y: 0.45, z: 0.05 };
    raw[MP.foreheadApex] = { x: 0.5, y: 0.2, z: 0 };
    raw[MP.menton] = { x: 0.5, y: 0.9, z: 0 };
    raw[MP.leftEyeOuter] = { x: 0.62, y: 0.4, z: 0 };
    raw[MP.rightEyeOuter] = { x: 0.48, y: 0.4, z: 0 };
    expect(profileFacesLeft(raw)).toBe(true);
    const mirrored = mirrorRawLandmarks(raw);
    expect(mirrored[MP.pronasale].x).toBeCloseTo(0.7, 5);
    expect(profileFacesLeft(mirrored)).toBe(false);
    const pose = estimatePose(raw);
    expect(pose.yaw).not.toBeNull();
  });

  it("keeps a 4:3 frame on the tuned pose and corrects a tall phone frame", () => {
    const raw: RawFaceLandmark[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
    raw[MP.leftLateral[0]] = { x: 0.3, y: 0.45, z: -0.05 };
    raw[MP.rightLateral[0]] = { x: 0.7, y: 0.45, z: 0.05 };
    raw[MP.foreheadApex] = { x: 0.5, y: 0.2, z: -0.02 };
    raw[MP.menton] = { x: 0.5, y: 0.8, z: 0.02 };
    raw[MP.leftEyeOuter] = { x: 0.3, y: 0.42, z: 0 };
    raw[MP.rightEyeOuter] = { x: 0.7, y: 0.4, z: 0 };
    const tuned = estimatePose(raw);
    const desk = estimatePose(raw, { width: 1280, height: 960 });
    const phone = estimatePose(raw, { width: 1080, height: 1440 });
    expect(desk.pitch).toBeCloseTo(tuned.pitch ?? 0, 5);
    expect(desk.roll).toBeCloseTo(tuned.roll ?? 0, 5);
    expect(Math.abs(phone.pitch ?? 0)).toBeLessThan(Math.abs(tuned.pitch ?? 0));
    expect(Math.abs(phone.roll ?? 0)).toBeGreaterThan(Math.abs(tuned.roll ?? 0));
    const flat = profileShapeCue(raw);
    const tall = profileShapeCue(raw, { width: 1080, height: 1440 });
    expect(tall.eyeCollapse ?? 0).toBeGreaterThan(flat.eyeCollapse ?? 0);
  });
});
