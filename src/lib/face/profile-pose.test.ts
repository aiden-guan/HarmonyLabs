import { describe, expect, it } from "vitest";
import {
  advanceStability,
  classifyProfilePose,
  isTrueSidePose,
  nextProfileFacing,
  profilePoseMessage,
  screenTurnDirection,
  sidePoseMessage,
} from "@/lib/face/profile-pose";

const lateralCue = { eyeCollapse: 0.9, noseLead: 0.22 };
const partialCue = { eyeCollapse: 0.66, noseLead: 0.1 };
const separated = { eyeCollapse: 0.35, noseLead: 0.02 };

describe("profile pose", () => {
  it("keeps a frontal face and a mild turn out of the ready pose", () => {
    expect(classifyProfilePose(0, separated)).toBe("frontal");
    expect(classifyProfilePose(2, { eyeCollapse: 0.4, noseLead: 0.03 })).toBe("frontal");
    expect(classifyProfilePose(18, { eyeCollapse: 0.48, noseLead: 0.05 })).toBe("threeQuarter");
    expect(classifyProfilePose(22, { eyeCollapse: 0.48, noseLead: 0.06 })).toBe("threeQuarter");
    expect(classifyProfilePose(-24, { eyeCollapse: 0.5, noseLead: 0.06 })).toBe("threeQuarter");
  });

  it("does not treat a three-quarter face as lateral", () => {
    expect(classifyProfilePose(32, { eyeCollapse: 0.62, noseLead: 0.08 })).toBe("threeQuarter");
    expect(classifyProfilePose(36, partialCue)).toBe("threeQuarter");
    expect(classifyProfilePose(40, { eyeCollapse: 0.7, noseLead: 0.12 })).not.toBe("lateral");
    expect(classifyProfilePose(28, { eyeCollapse: null, noseLead: null })).not.toBe("lateral");
    expect(classifyProfilePose(61, { eyeCollapse: null, noseLead: null })).toBe("nearlyLateral");
  });

  it("accepts a true left or right profile and asks for a little more when it is only near", () => {
    expect(classifyProfilePose(58, lateralCue)).toBe("lateral");
    expect(classifyProfilePose(-62, lateralCue)).toBe("lateral");
    expect(classifyProfilePose(36, { eyeCollapse: 0.86, noseLead: 0.22 })).toBe("lateral");
    expect(classifyProfilePose(52, { eyeCollapse: 0.68, noseLead: 0.12 })).toBe("nearlyLateral");
    expect(profilePoseMessage("threeQuarter")).toMatch(/farther/);
    expect(profilePoseMessage("nearlyLateral")).toMatch(/slightly/);
    expect(profilePoseMessage("frontal")).toMatch(/either side/);
  });

  it("keeps a three-quarter turn out of the side-profile stage", () => {
    expect(isTrueSidePose(58, lateralCue)).toBe(true);
    expect(isTrueSidePose(-62, lateralCue)).toBe(true);
    expect(isTrueSidePose(36, { eyeCollapse: 0.86, noseLead: 0.22 })).toBe(false);
    expect(isTrueSidePose(46, { eyeCollapse: 0.76, noseLead: 0.12 }, true)).toBe(false);
    expect(isTrueSidePose(50, { eyeCollapse: 0.86, noseLead: 0.15 }, false)).toBe(false);
    expect(isTrueSidePose(50, { eyeCollapse: 0.86, noseLead: 0.15 }, true)).toBe(true);
    expect(sidePoseMessage(36, { eyeCollapse: 0.86, noseLead: 0.22 })).toMatch(/fully sideways/);
    expect(sidePoseMessage(58, lateralCue)).toMatch(/Good side profile/);
  });

  it("does not promote a three-quarter pose just because the previous frame was stable", () => {
    const threeQuarter = { eyeCollapse: 0.6, noseLead: 0.08 };
    expect(classifyProfilePose(30, threeQuarter, true)).not.toBe("lateral");
    expect(classifyProfilePose(46, { eyeCollapse: 0.76, noseLead: 0.12 }, false)).not.toBe("lateral");
    expect(classifyProfilePose(46, { eyeCollapse: 0.76, noseLead: 0.12 }, true)).toBe("lateral");
  });

  it("locks a profile direction until the face returns toward the camera", () => {
    let facing = nextProfileFacing(null, 0, false, 0.3);
    expect(facing).toBeNull();
    facing = nextProfileFacing(facing, 30, true, 0.7);
    expect(facing).toBe("left");
    facing = nextProfileFacing(facing, -40, false, 0.8);
    expect(facing).toBe("left");
    facing = nextProfileFacing(facing, 4, false, 0.3);
    expect(facing).toBeNull();
    facing = nextProfileFacing(facing, -32, false, 0.72);
    expect(facing).toBe("right");
  });

  it("points the mirrored turn cue the way the selfie preview moves", () => {
    expect(screenTurnDirection("left", true)).toBe("right");
    expect(screenTurnDirection("right", true)).toBe("left");
    expect(screenTurnDirection("left", false)).toBe("left");
  });
});

describe("pose stability", () => {
  it("does not arm auto-capture from one ready frame between misses", () => {
    let clock = { since: null as number | null, lastOk: null as number | null };
    let armed = false;
    for (const sample of [
      { ok: false, now: 0 },
      { ok: true, now: 200 },
      { ok: false, now: 400 },
      { ok: false, now: 800 },
    ]) {
      const next = advanceStability(clock, sample.ok, sample.now, 750, 280);
      clock = next.clock;
      armed = next.armed;
    }
    expect(armed).toBe(false);
    expect(clock.since).toBeNull();
  });

  it("arms after the pose holds and keeps it through one noisy frame", () => {
    let clock = { since: null as number | null, lastOk: null as number | null };
    let armed = false;
    for (const now of [0, 200, 400, 600, 800]) {
      const next = advanceStability(clock, true, now, 750, 280);
      clock = next.clock;
      armed = next.armed;
    }
    expect(armed).toBe(true);
    const noisy = advanceStability(clock, false, 1000, 750, 280);
    expect(noisy.armed).toBe(true);
    const dropped = advanceStability(noisy.clock, false, 1200, 750, 280);
    expect(dropped.armed).toBe(false);
  });
});
