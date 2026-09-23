import { describe, expect, it } from "vitest";
import {
  FACE_OVAL_LOOP,
  assessCaptureAlignment,
  captureGuideBox,
  faceOvalPoints,
  summarizeLiveFaces,
} from "@/lib/face/capture-guide";
import type { FaceView, RawFaceLandmark } from "@/types/face";

function aligned(view: FaceView, patch?: Partial<Parameters<typeof assessCaptureAlignment>[0]>) {
  return assessCaptureAlignment({
    view,
    faceCount: 1,
    pose: { yaw: view === "profile" ? 62 : 2, pitch: 1, roll: 1 },
    coverage: 0.22,
    centerX: 0.5,
    centerY: 0.47,
    facesLeft: false,
    mirroredPreview: true,
    eyeCollapse: view === "profile" ? 0.9 : null,
    noseLead: view === "profile" ? 0.22 : null,
    facialHeight: view === "profile" ? 0.5 : null,
    ...patch,
  });
}

describe("capture guide", () => {
  it("sizes the outline from the same center the alignment check uses", () => {
    const box = captureGuideBox(1280, 720, "front");
    expect(box.cx).toBeCloseTo(640);
    expect(box.cy).toBeCloseTo(338.4);
    expect(box.faceH).toBeCloseTo(446.4);
    expect(box.faceW).toBeLessThan(1280 * 0.74);
    const portrait = captureGuideBox(720, 1280, "front");
    expect(portrait.faceW).toBeLessThanOrEqual(720 * 0.74 + 0.01);
  });

  it("accepts a level face and asks for a turn when a profile is still frontal", () => {
    expect(aligned("front").status).toBe("ready");
    expect(aligned("front").message).toMatch(/Hold still/);
    expect(aligned("profile").status).toBe("ready");
    expect(aligned("profile").message).toMatch(/Good profile/);
    expect(aligned("profile", { facesLeft: true }).profileFacing).toBe("left");
    const threeQuarter = aligned("profile", {
      pose: { yaw: 22, pitch: 0, roll: 0 },
      eyeCollapse: 0.48,
      noseLead: 0.06,
    });
    expect(threeQuarter.status).toBe("adjust");
    expect(threeQuarter.message).toMatch(/farther/);
    expect(threeQuarter.checks.find((check) => check.id === "pose")?.ok).toBe(false);
    const mild = aligned("profile", { pose: { yaw: 18, pitch: 0, roll: 0 }, eyeCollapse: 0.45, noseLead: 0.04 });
    expect(mild.status).not.toBe("ready");
    const near = aligned("profile", {
      pose: { yaw: 52, pitch: 0, roll: 0 },
      eyeCollapse: 0.68,
      noseLead: 0.12,
    });
    expect(near.status).toBe("adjust");
    expect(near.profilePose).toBe("nearlyLateral");
    expect(near.message).toMatch(/slightly/);
    const frontalProfile = aligned("profile", {
      pose: { yaw: 4, pitch: 0, roll: 0 },
      eyeCollapse: 0.3,
      noseLead: 0.02,
    });
    expect(frontalProfile.status).toBe("adjust");
    expect(frontalProfile.message).toMatch(/either side/);
    const lookingDown = aligned("profile", { frankfortTilt: 22 });
    expect(lookingDown.status).toBe("adjust");
    expect(lookingDown.message).toMatch(/gaze level/);
    const narrowButTall = aligned("profile", { coverage: 0.05, facialHeight: 0.5 });
    expect(narrowButTall.status).toBe("ready");
    expect(aligned("profile", { facialHeight: 0.2 }).message).toMatch(/Move closer/);
    expect(aligned("profile", { facialHeight: 0.9 }).message).toMatch(/Move back/);
  });

  it("coaches distance and position in the direction the person sees", () => {
    expect(aligned("front", { coverage: 0.02 }).message).toMatch(/Move closer/);
    expect(aligned("front", { coverage: 0.9 }).message).toMatch(/Move back/);
    expect(aligned("front", { centerX: 0.2, mirroredPreview: false }).message).toMatch(/Shift right/);
    expect(aligned("front", { centerX: 0.2, mirroredPreview: true }).message).toMatch(/Shift left/);
    expect(aligned("front", { centerX: 0.85, mirroredPreview: false }).message).toMatch(/Shift left/);
    expect(aligned("front", { centerY: 0.8 }).message).toMatch(/Move up/);
    expect(aligned("front", { centerY: 0.15 }).message).toMatch(/Move down/);
    expect(aligned("front", { pose: { yaw: 0, pitch: 0, roll: 20 } }).message).toMatch(/eye line/);
    expect(aligned("front", { faceCount: 0, centerX: null, centerY: null }).message).toMatch(/Step into the outline/);
    expect(aligned("front", { faceCount: 2 }).message).toMatch(/Only one face/);
  });

  it("keeps a borderline pose ready once it has already locked", () => {
    const input = {
      view: "front" as const,
      faceCount: 1,
      pose: { yaw: 14, pitch: 0, roll: 0 },
      coverage: 0.22,
      centerX: 0.5,
      centerY: 0.47,
      facesLeft: false,
      mirroredPreview: true,
    };
    expect(assessCaptureAlignment(input).status).toBe("adjust");
    expect(assessCaptureAlignment(input, { stable: true }).status).toBe("ready");
  });

  it("reads a live mesh into an oval without inventing missing points", () => {
    expect(faceOvalPoints([])).toEqual([]);
    const face: RawFaceLandmark[] = Array.from({ length: 478 }, (_, index) => ({
      x: 0.35 + (index % 5) * 0.04,
      y: 0.2 + (index % 7) * 0.05,
      z: 0,
    }));
    const summary = summarizeLiveFaces([face]);
    expect(summary.faceCount).toBe(1);
    expect(summary.oval).toHaveLength(FACE_OVAL_LOOP.length);
    expect(summary.centerX).toBeGreaterThan(0.3);
    expect(summary.nose).not.toBeNull();
    expect(summarizeLiveFaces([]).faceCount).toBe(0);
  });
});
