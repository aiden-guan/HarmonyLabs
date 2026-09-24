import { describe, expect, it } from "vitest";
import {
  advanceStability,
  capturePoseMessage,
  classifyCapturePose,
  FRONT_STABLE_MS,
  isSidePose,
  isThreeQuarterPose,
  nextProfileFacing,
  POSE_GRACE_MS,
  screenTurnDirection,
  SIDE_STABLE_MS,
  THREE_QUARTER_STABLE_MS,
  type HeadOrientation,
} from "@/lib/face/profile-pose";

const matrix = (yaw: number): HeadOrientation => ({ yaw, pitch: 0, roll: 0, source: "matrix" });
const geometry = (yaw: number): HeadOrientation => ({ yaw, pitch: 0, roll: 0, source: "geometry" });
const openEyes = { eyeCollapse: 0.55, noseLead: 0.1 };
const stacked = { eyeCollapse: 0.9, noseLead: 0.22 };

describe("three-quarter pose", () => {
  it("accepts a portrait turn without a stacked far eye", () => {
    expect(isThreeQuarterPose(matrix(40), openEyes)).toBe(true);
    expect(isThreeQuarterPose(matrix(-40), { eyeCollapse: 0.5, noseLead: 0.08 })).toBe(true);
    expect(isThreeQuarterPose(matrix(40), { eyeCollapse: 0.62, noseLead: 0.11 })).toBe(true);
    expect(classifyCapturePose(matrix(40), openEyes).ideal).toBe(true);
    expect(capturePoseMessage("threeQuarter", classifyCapturePose(matrix(40), openEyes))).toMatch(/Perfect three-quarter/);
  });

  it("does not require eye collapse near 0.86", () => {
    expect(isThreeQuarterPose(matrix(38), { eyeCollapse: 0.48, noseLead: 0.07 })).toBe(true);
    expect(isSidePose(matrix(38), { eyeCollapse: 0.86, noseLead: 0.22 })).toBe(false);
    expect(isThreeQuarterPose(matrix(38), { eyeCollapse: 0.86, noseLead: 0.22 })).toBe(true);
  });

  it("asks for more turn when the head is still nearly frontal", () => {
    const mild = classifyCapturePose(matrix(16), { eyeCollapse: 0.4, noseLead: 0.04 });
    expect(mild.threeQuarter).toBe(false);
    expect(capturePoseMessage("threeQuarter", mild)).toMatch(/farther|halfway|slightly/);
    expect(capturePoseMessage("threeQuarter", classifyCapturePose(matrix(22), openEyes))).toMatch(/farther/);
  });

  it("asks the person to come back when the turn is nearly a profile", () => {
    const reading = classifyCapturePose(matrix(64), openEyes);
    expect(reading.threeQuarter).toBe(false);
    expect(capturePoseMessage("threeQuarter", reading)).toMatch(/too far/);
  });

  it("accepts the same turn to either side", () => {
    expect(isThreeQuarterPose(matrix(42), openEyes)).toBe(isThreeQuarterPose(matrix(-42), openEyes));
  });
});

describe("side pose", () => {
  it("accepts a genuine profile and rejects a three-quarter turn", () => {
    expect(isSidePose(matrix(82), stacked)).toBe(true);
    expect(isSidePose(matrix(-84), stacked)).toBe(true);
    expect(isSidePose(matrix(40), openEyes)).toBe(false);
    expect(isSidePose(matrix(40), { eyeCollapse: 0.86, noseLead: 0.22 })).toBe(false);
    expect(capturePoseMessage("profile", classifyCapturePose(matrix(82), stacked))).toMatch(/Perfect side profile/);
    expect(capturePoseMessage("profile", classifyCapturePose(matrix(40), openEyes))).toMatch(/side view/);
  });

  it("keeps a borderline profile usable instead of failing it", () => {
    const reading = classifyCapturePose(matrix(54), { eyeCollapse: 0.8, noseLead: 0.14 });
    expect(reading.side).toBe(true);
    expect(reading.sideBorderline).toBe(true);
    expect(capturePoseMessage("profile", reading)).toMatch(/Good side profile/);
  });

  it("asks for a little more before the side band and a little less past it", () => {
    expect(capturePoseMessage("profile", classifyCapturePose(matrix(54), { eyeCollapse: 0.4, noseLead: 0.04 }))).toMatch(
      /slightly farther/,
    );
    expect(capturePoseMessage("profile", classifyCapturePose(matrix(110), { eyeCollapse: 0.2, noseLead: 0.02 }))).toMatch(
      /slightly back/,
    );
  });

  it("does not promote a three-quarter pose when the previous frame was stable", () => {
    expect(isSidePose(matrix(40), openEyes, true)).toBe(false);
    expect(isThreeQuarterPose(matrix(40), openEyes, true)).toBe(true);
    expect(isSidePose(geometry(46), { eyeCollapse: 0.76, noseLead: 0.12 }, true)).toBe(false);
  });
});

describe("facing and stability", () => {
  it("locks a direction until the face returns toward the camera", () => {
    let facing = nextProfileFacing(null, 0);
    expect(facing).toBeNull();
    facing = nextProfileFacing(facing, 30);
    expect(facing).toBe("left");
    facing = nextProfileFacing(facing, -40);
    expect(facing).toBe("left");
    facing = nextProfileFacing(facing, 4);
    expect(facing).toBeNull();
    facing = nextProfileFacing(facing, -32);
    expect(facing).toBe("right");
  });

  it("points the mirrored instruction the way the selfie preview moves", () => {
    expect(screenTurnDirection("left", true)).toBe("right");
    expect(screenTurnDirection("right", true)).toBe("left");
    expect(screenTurnDirection("left", false)).toBe("left");
  });

  it("does not arm auto-capture from a quick transition", () => {
    let clock = { since: null as number | null, lastOk: null as number | null };
    let armed = false;
    for (const sample of [
      { ok: false, now: 0 },
      { ok: true, now: 100 },
      { ok: false, now: 180 },
      { ok: false, now: 500 },
    ]) {
      const next = advanceStability(clock, sample.ok, sample.now, THREE_QUARTER_STABLE_MS, POSE_GRACE_MS);
      clock = next.clock;
      armed = next.armed;
    }
    expect(armed).toBe(false);
    expect(clock.since).toBeNull();
  });

  it("arms after about 400ms of a stable pose", () => {
    let clock = { since: null as number | null, lastOk: null as number | null };
    let armed = false;
    for (const now of [0, 200, 400]) {
      const next = advanceStability(clock, true, now, THREE_QUARTER_STABLE_MS, POSE_GRACE_MS);
      clock = next.clock;
      armed = next.armed;
    }
    expect(THREE_QUARTER_STABLE_MS).toBe(400);
    expect(armed).toBe(true);
    expect(FRONT_STABLE_MS).toBeLessThan(THREE_QUARTER_STABLE_MS);
    expect(SIDE_STABLE_MS).toBeGreaterThan(THREE_QUARTER_STABLE_MS);
  });

  it("keeps a stable pose through one noisy frame and drops a lasting miss", () => {
    let clock = { since: null as number | null, lastOk: null as number | null };
    for (const now of [0, 200, 450]) {
      clock = advanceStability(clock, true, now, SIDE_STABLE_MS, POSE_GRACE_MS).clock;
    }
    const noisy = advanceStability(clock, false, 600, SIDE_STABLE_MS, POSE_GRACE_MS);
    expect(noisy.armed).toBe(true);
    const dropped = advanceStability(noisy.clock, false, 600 + POSE_GRACE_MS + 40, SIDE_STABLE_MS, POSE_GRACE_MS);
    expect(dropped.armed).toBe(false);
    expect(dropped.clock.since).toBeNull();
  });
});
