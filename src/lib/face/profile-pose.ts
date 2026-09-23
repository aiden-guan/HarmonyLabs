import type { ProfileShapeCue } from "@/lib/face/quality";

/**
 * Live profile pose, from combined mesh geometry.
 * Yaw alone is not a lateral profile. A three-quarter turn stays in
 * `threeQuarter` until the eyes stack and the nose leads the face.
 */
export type ProfilePoseState = "frontal" | "threeQuarter" | "nearlyLateral" | "lateral" | "unreliable";

export interface StabilityClock {
  since: number | null;
  lastOk: number | null;
}

/** How long a fresh live mesh may be and still describe the captured frame. */
export const LIVE_MESH_MAX_AGE_MS = 450;

/** Lateral geometry must hold this long before auto-capture arms. */
export const PROFILE_STABLE_MS = 750;

/** Front alignment arms a little sooner; it is a less ambiguous pose. */
export const FRONT_STABLE_MS = 400;

/** One noisy frame inside this window does not drop a stable pose. */
export const POSE_GRACE_MS = 280;

/** Armed pose holds still briefly, then captures. */
export const HOLD_STILL_MS = 1000;

const YAW_STRONG = 48;
const YAW_PROJECTION = 34;
const STACK = 0.78;
const EXTREME_STACK = 0.84;
const NOSE_PRESENT = 0.1;
const NOSE_STRONG = 0.16;
const NEAR_YAW = 38;
const PARTIAL_STACK = 0.64;
const MILD_YAW = 16;

function finite(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) ? value : null;
}

/**
 * Classify a profile from yaw, eye stacking, and nose projection together.
 * `relaxed` is a small hysteresis band for a pose that is already accepted.
 * It does not promote a three-quarter face into a lateral one.
 */
export function classifyProfilePose(
  yaw: number | null,
  cue: ProfileShapeCue,
  relaxed = false,
): ProfilePoseState {
  const absYaw = finite(yaw) === null ? null : Math.abs(yaw as number);
  const collapse = finite(cue.eyeCollapse);
  const lead = finite(cue.noseLead);
  if (absYaw === null && collapse === null) return "unreliable";

  const yawStrong = YAW_STRONG - (relaxed ? 4 : 0);
  const yawProjection = YAW_PROJECTION - (relaxed ? 4 : 0);
  const stack = STACK - (relaxed ? 0.04 : 0);
  const extremeStack = EXTREME_STACK - (relaxed ? 0.04 : 0);
  const nosePresent = NOSE_PRESENT - (relaxed ? 0.02 : 0);
  const noseStrong = NOSE_STRONG - (relaxed ? 0.02 : 0);
  const nearYaw = NEAR_YAW - (relaxed ? 4 : 0);
  const partialStack = PARTIAL_STACK - (relaxed ? 0.04 : 0);

  const strongYaw = absYaw !== null && absYaw >= yawStrong;
  const stacked = collapse !== null && collapse >= stack;
  const extremelyStacked = collapse !== null && collapse >= extremeStack;
  const noseOk = lead === null || lead >= nosePresent;
  const noseProjected = lead !== null && lead >= noseStrong;
  const projectionYaw = absYaw === null || absYaw >= yawProjection;

  // Strong turn with stacked eyes, or extreme stacking with the nose clearly in front.
  if ((strongYaw && stacked && noseOk) || (extremelyStacked && noseProjected && projectionYaw)) {
    return "lateral";
  }

  const partial = collapse !== null && collapse >= partialStack;
  const near =
    (absYaw !== null && absYaw >= nearYaw && partial) ||
    (strongYaw && collapse !== null && collapse >= 0.58) ||
    (stacked && absYaw !== null && absYaw >= 28) ||
    (absYaw !== null && absYaw >= 55 && collapse === null);
  if (near) return "nearlyLateral";

  const turned = (absYaw !== null && absYaw >= MILD_YAW) || (collapse !== null && collapse >= 0.52);
  if (turned) return "threeQuarter";
  if (absYaw !== null || collapse !== null) return "frontal";
  return "unreliable";
}

export function profilePoseMessage(state: ProfilePoseState): string {
  if (state === "threeQuarter") return "Turn a little farther.";
  if (state === "nearlyLateral") return "Almost there — keep turning slightly.";
  if (state === "lateral") return "Good profile. Keep your head level.";
  return "Turn to either side.";
}

export function advanceStability(
  clock: StabilityClock,
  ok: boolean,
  now: number,
  holdMs: number,
  graceMs: number,
): { clock: StabilityClock; armed: boolean } {
  if (ok) {
    const since = clock.since ?? now;
    return {
      clock: { since, lastOk: now },
      armed: now - since >= holdMs,
    };
  }
  if (clock.since !== null && clock.lastOk !== null && now - clock.lastOk <= graceMs) {
    return { clock, armed: now - clock.since >= holdMs };
  }
  return { clock: { since: null, lastOk: null }, armed: false };
}

/**
 * Keep the direction the person committed to until they turn back toward
 * the camera. A single noisy frame must not flip the arrow.
 */
export function nextProfileFacing(
  locked: "left" | "right" | null,
  yaw: number | null,
  facesLeft: boolean,
  eyeCollapse: number | null,
): "left" | "right" | null {
  const absYaw = yaw == null || !Number.isFinite(yaw) ? 0 : Math.abs(yaw);
  const collapse = eyeCollapse != null && Number.isFinite(eyeCollapse) ? eyeCollapse : null;
  const returned = absYaw < 12 && (collapse === null || collapse < 0.5);
  const committed = absYaw >= 22 || (collapse !== null && collapse >= 0.6);
  if (locked && !returned) return locked;
  if (!committed) return null;
  return facesLeft ? "left" : "right";
}

/**
 * The preview is mirrored, and the overlay is mirrored with it.
 * An arrow drawn toward the source-space nose therefore points the same
 * way the person sees their nose move.
 */
export function screenTurnDirection(sourceFacing: "left" | "right", mirrored: boolean): "left" | "right" {
  if (!mirrored) return sourceFacing;
  return sourceFacing === "left" ? "right" : "left";
}
