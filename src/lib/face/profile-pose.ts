import type { ProfileShapeCue } from "@/lib/face/quality";

/**
 * Capture pose from one orientation source.
 *
 * Matrix yaw is the facial-transformation Euler angle in degrees. Those bands
 * are the live target: a portrait three-quarter is about 35–45°, and a side
 * view is about 68–90°. MediaPipe's single-camera fit rarely sits at a literal
 * 90°, so the acceptable side band starts at 68° and a slightly shorter turn
 * can still be kept with a warning.
 *
 * Geometry yaw is the landmark atan2 fallback. It is not degrees. Its cuts
 * live here so a missing matrix still names the same poses, including the
 * geometric profile sample, without a second classifier.
 */
export type OrientationSource = "matrix" | "geometry";

export interface HeadOrientation {
  yaw: number | null;
  pitch: number | null;
  roll: number | null;
  source: OrientationSource;
}

export type PoseZone = "frontal" | "approaching" | "threeQuarter" | "between" | "side" | "past" | "unreliable";

export interface PoseReading {
  zone: PoseZone;
  threeQuarter: boolean;
  side: boolean;
  /** Usable side, below the clear side band. */
  sideBorderline: boolean;
  ideal: boolean;
}

export interface StabilityClock {
  since: number | null;
  lastOk: number | null;
}

export type CaptureStage = "front" | "threeQuarter" | "profile";

/** How long a fresh live mesh may be and still describe the captured frame. */
export const LIVE_MESH_MAX_AGE_MS = 450;

/** Live FaceLandmarker interval. Detection itself skips a frame when it is still running. */
export const LIVE_INFERENCE_MS = 110;

export const FRONT_STABLE_MS = 280;
export const THREE_QUARTER_STABLE_MS = 400;
export const SIDE_STABLE_MS = 450;

/** One noisy frame inside this window does not drop a stable pose. */
export const POSE_GRACE_MS = 250;

/** Short beat after the pose is already stable, then the shutter fires. */
export const HOLD_STILL_MS = 320;

interface Bands {
  frontalMax: number;
  tqMin: number;
  tqIdealMin: number;
  tqIdealMax: number;
  tqMax: number;
  sideBorderMin: number;
  sideMin: number;
  sideIdealMin: number;
  sideIdealMax: number;
  sideMax: number;
}

const MATRIX_BANDS: Bands = {
  frontalMax: 15,
  tqMin: 28,
  tqIdealMin: 35,
  tqIdealMax: 45,
  tqMax: 52,
  sideBorderMin: 60,
  sideMin: 68,
  sideIdealMin: 78,
  sideIdealMax: 90,
  sideMax: 96,
};

const MATRIX_BANDS_RELAXED: Bands = {
  ...MATRIX_BANDS,
  frontalMax: 18,
  tqMin: 25,
  tqMax: 55,
  sideBorderMin: 56,
  sideMin: 64,
  sideMax: 100,
};

const GEOMETRY_BANDS: Bands = {
  frontalMax: 12,
  tqMin: 24,
  tqIdealMin: 30,
  tqIdealMax: 42,
  tqMax: 46,
  sideBorderMin: 52,
  sideMin: 58,
  sideIdealMin: 60,
  sideIdealMax: 85,
  sideMax: 100,
};

const GEOMETRY_BANDS_RELAXED: Bands = {
  ...GEOMETRY_BANDS,
  frontalMax: 16,
  tqMin: 20,
  tqMax: 50,
  sideBorderMin: 54,
  sideMin: 56,
  sideMax: 104,
};

function finite(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) ? value : null;
}

function bandsFor(source: OrientationSource, relaxed: boolean): Bands {
  if (source === "matrix") return relaxed ? MATRIX_BANDS_RELAXED : MATRIX_BANDS;
  return relaxed ? GEOMETRY_BANDS_RELAXED : GEOMETRY_BANDS;
}

function cueFacts(cue: ProfileShapeCue) {
  const collapse = finite(cue.eyeCollapse);
  const lead = finite(cue.noseLead);
  return {
    collapse,
    lead,
    missing: collapse === null && lead === null,
    supports: (collapse !== null && collapse >= 0.7) || (lead !== null && lead >= 0.12),
    strong: (collapse !== null && collapse >= 0.78) || (lead !== null && lead >= 0.16),
    contradicts: collapse !== null && collapse < 0.3 && lead !== null && lead < 0.05,
  };
}

const EMPTY_READING: PoseReading = {
  zone: "unreliable",
  threeQuarter: false,
  side: false,
  sideBorderline: false,
  ideal: false,
};

/**
 * One classification for live capture and for the photo check.
 * `relaxed` is the hysteresis band after a pose has already been accepted.
 * It does not turn a three-quarter face into a side face.
 */
export function classifyCapturePose(orientation: HeadOrientation, cue: ProfileShapeCue, relaxed = false): PoseReading {
  const abs = finite(orientation.yaw);
  if (abs === null) return EMPTY_READING;
  const turn = Math.abs(abs);
  const band = bandsFor(orientation.source, relaxed);
  const facts = cueFacts(cue);

  let side = false;
  let sideBorderline = false;
  if (orientation.source === "matrix") {
    const clear = turn >= band.sideMin && turn <= band.sideMax && !facts.contradicts;
    const borderline = turn >= band.sideBorderMin && turn < band.sideMin && (facts.supports || facts.missing) && !facts.contradicts;
    side = clear || borderline;
    sideBorderline = borderline;
  } else {
    const clear = turn >= band.sideMin && turn <= band.sideMax && (facts.supports || facts.missing);
    const borderline = turn >= band.sideBorderMin && turn < band.sideMin && facts.strong;
    side = clear || borderline;
    sideBorderline = borderline;
  }

  const frontalEyes = orientation.source === "matrix" && facts.collapse !== null && facts.collapse < 0.2 && (facts.lead === null || facts.lead < 0.03);
  const threeQuarter = !side && turn >= band.tqMin && turn <= band.tqMax && !frontalEyes;
  const ideal = side
    ? !sideBorderline && turn >= band.sideIdealMin && turn <= band.sideIdealMax
    : threeQuarter && turn >= band.tqIdealMin && turn <= band.tqIdealMax;

  let zone: PoseZone;
  if (side) zone = "side";
  else if ((turn >= band.sideMin && turn <= band.sideMax && facts.contradicts) || turn > band.sideMax) zone = "past";
  else if (turn <= band.frontalMax) zone = "frontal";
  else if (turn < band.tqMin) zone = "approaching";
  else if (threeQuarter) zone = "threeQuarter";
  else zone = "between";

  return { zone, threeQuarter, side, sideBorderline, ideal };
}

/** A halfway turn with both eyes still available. Does not require a stacked far eye. */
export function isThreeQuarterPose(orientation: HeadOrientation, cue: ProfileShapeCue, relaxed = false): boolean {
  return classifyCapturePose(orientation, cue, relaxed).threeQuarter;
}

/** A real side profile, including a slightly short one marked borderline by the classifier. */
export function isSidePose(orientation: HeadOrientation, cue: ProfileShapeCue, relaxed = false): boolean {
  return classifyCapturePose(orientation, cue, relaxed).side;
}

export function capturePoseMessage(
  view: "threeQuarter" | "profile",
  reading: PoseReading,
  screenDirection: "left" | "right" | null = null,
): string {
  if (view === "threeQuarter") {
    if (reading.threeQuarter && reading.ideal) return "Perfect three-quarter angle — hold still.";
    if (reading.threeQuarter) return "Good three-quarter angle — hold still.";
    if (reading.zone === "between" || reading.zone === "side" || reading.zone === "past") {
      return "You've turned a little too far. Come back toward the camera.";
    }
    if (reading.zone === "frontal" && screenDirection) return `Turn slightly ${screenDirection}.`;
    if (reading.zone === "frontal" || reading.zone === "unreliable") return "Turn your head about halfway to either side.";
    return "Turn a little farther.";
  }
  if (reading.side && reading.ideal) return "Perfect side profile — hold still.";
  if (reading.side) return "Good side profile — hold still.";
  if (reading.zone === "past") return "Turn slightly back until your profile is visible.";
  if (reading.zone === "between") return "Almost there — turn slightly farther.";
  return "Keep turning until you're fully sideways.";
}

export function stableHoldMs(view: CaptureStage): number {
  if (view === "front") return FRONT_STABLE_MS;
  if (view === "threeQuarter") return THREE_QUARTER_STABLE_MS;
  return SIDE_STABLE_MS;
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
 * the camera. Yaw sign is image space: positive points toward image-left.
 * A noisy opposite sample does not flip the arrow.
 */
export function nextProfileFacing(locked: "left" | "right" | null, yaw: number | null): "left" | "right" | null {
  if (yaw == null || !Number.isFinite(yaw)) return locked;
  const abs = Math.abs(yaw);
  if (locked && abs >= 8) return locked;
  if (abs < 16) return null;
  return yaw > 0 ? "left" : "right";
}

/**
 * The preview is mirrored, and instructions should match the direction the
 * person sees. Pose yaw itself stays in unmirrored image space.
 */
export function screenTurnDirection(sourceFacing: "left" | "right", mirrored: boolean): "left" | "right" {
  if (!mirrored) return sourceFacing;
  return sourceFacing === "left" ? "right" : "left";
}

/** 0 is frontal and 1 is a full side, on the scale of the orientation source. */
export function turnProgress(orientation: HeadOrientation, view: "threeQuarter" | "profile"): { amount: number; target: number } {
  const abs = Math.abs(finite(orientation.yaw) ?? 0);
  const span = orientation.source === "matrix" ? 90 : 75;
  const targetYaw = view === "threeQuarter" ? (orientation.source === "matrix" ? 40 : 36) : orientation.source === "matrix" ? 84 : 66;
  return {
    amount: Math.max(0, Math.min(1, abs / span)),
    target: Math.max(0, Math.min(1, targetYaw / span)),
  };
}
