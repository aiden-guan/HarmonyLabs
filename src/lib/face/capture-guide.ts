import { undistortLandmarks, type LensModel } from "@/lib/face/camera-optics";
import { FRONT_FRAME_RATIO, SIDE_FRAME_RATIO, THREE_QUARTER_FRAME_RATIO } from "@/lib/face/capture-outline";
import { FACE_OVAL_LOOP } from "@/lib/face/face-oval";
import { frankfortTilt } from "@/lib/face/frankfort";
import { extractFacialOrientation, type FacialMatrix } from "@/lib/face/facial-transform";
import { MP } from "@/lib/face/mediapipe-map";
import {
  capturePoseMessage,
  classifyCapturePose,
  screenTurnDirection,
  turnProgress,
  type HeadOrientation,
  type PoseReading,
} from "@/lib/face/profile-pose";
import {
  estimatePose,
  faceCoverage,
  faceHeightFraction,
  profileShapeCue,
  type PoseEstimate,
} from "@/lib/face/quality";
import type { FaceView, RawFaceLandmark } from "@/types/face";

/** Front, the halfway turn, and the true side are separate capture targets. */
export type CaptureView = FaceView | "threeQuarter";

export { FACE_OVAL_LOOP };

/**
 * The brackets are the preferred head region. Alignment uses the same center.
 * Turned views allow the head to sit off that center when the face is still fully in frame.
 */
export const CAPTURE_FRAME = {
  centerX: 0.5,
  centerY: 0.47,
  centerToleranceX: 0.1,
  centerToleranceY: 0.1,
  coverageMin: 0.08,
  coverageMax: 0.7,
  profileHeightMin: 0.3,
  profileHeightMax: 0.78,
  profileHeightHardMin: 0.22,
  profileHeightHardMax: 0.88,
  frontYaw: 12,
  matrixFrontYaw: 15,
  roll: 8,
  pitch: 12,
  faceHeight: 0.62,
  frontWidthRatio: FRONT_FRAME_RATIO,
  threeQuarterWidthRatio: THREE_QUARTER_FRAME_RATIO,
  profileWidthRatio: SIDE_FRAME_RATIO,
  maxWidthFraction: 0.74,
  turnedToleranceX: 0.15,
  turnedToleranceY: 0.11,
  clipMargin: 0.015,
} as const;

export interface GuideBox {
  cx: number;
  cy: number;
  faceW: number;
  faceH: number;
  left: number;
  top: number;
}

export interface AlignmentCheck {
  id: "face" | "framing" | "level" | "pose";
  label: string;
  ok: boolean;
  /** A failed check stops capture only when this is true. */
  blocks: boolean;
}

export interface CaptureAssessment {
  status: "searching" | "adjust" | "ready";
  message: string;
  profileFacing: "left" | "right" | null;
  profilePose: PoseReading["zone"] | null;
  checks: AlignmentCheck[];
  turn: { amount: number; target: number; direction: "left" | "right" | null } | null;
}

export interface LiveFaceSummary {
  faceCount: number;
  pose: PoseEstimate;
  orientationSource: HeadOrientation["source"];
  coverage: number;
  centerX: number | null;
  centerY: number | null;
  eyeCollapse: number | null;
  noseLead: number | null;
  frankfortTilt: number | null;
  facialHeight: number | null;
  /** Profile composition point: behind the nose, so the nose is not forced to center. */
  anchorX: number | null;
  anchorY: number | null;
  withinFrame: boolean;
  oval: Array<{ x: number; y: number }>;
  eyeLine: [{ x: number; y: number }, { x: number; y: number }] | null;
  nose: { x: number; y: number } | null;
}

export function captureGuideBox(width: number, height: number, view: CaptureView): GuideBox {
  const ratio =
    view === "front"
      ? CAPTURE_FRAME.frontWidthRatio
      : view === "threeQuarter"
        ? CAPTURE_FRAME.threeQuarterWidthRatio
        : CAPTURE_FRAME.profileWidthRatio;
  let faceH = height * CAPTURE_FRAME.faceHeight;
  let faceW = faceH * ratio;
  const maxW = width * CAPTURE_FRAME.maxWidthFraction;
  if (faceW > maxW) {
    faceW = maxW;
    faceH = faceW / ratio;
  }
  const cx = width * CAPTURE_FRAME.centerX;
  const cy = height * CAPTURE_FRAME.centerY;
  return { cx, cy, faceW, faceH, left: cx - faceW / 2, top: cy - faceH / 2 };
}

export function assessCaptureAlignment(
  input: {
    view: CaptureView;
    faceCount: number;
    pose: PoseEstimate;
    coverage: number;
    centerX: number | null;
    centerY: number | null;
    mirroredPreview: boolean;
    eyeCollapse?: number | null;
    noseLead?: number | null;
    frankfortTilt?: number | null;
    facialHeight?: number | null;
    anchorX?: number | null;
    anchorY?: number | null;
    orientationSource?: HeadOrientation["source"];
    withinFrame?: boolean;
    committedFacing?: "left" | "right" | null;
  },
  options?: { stable?: boolean },
): CaptureAssessment {
  const band = options?.stable ? 1.25 : 1;
  const hasFace = input.faceCount === 1;
  const turned = input.view !== "front";
  const centerX = turned && input.anchorX != null ? input.anchorX : input.centerX;
  const centerY = turned && input.anchorY != null ? input.anchorY : input.centerY;
  const framing = framingCheck(input, centerX, centerY, band, hasFace, turned);
  const level = levelCheck(input, band, hasFace, turned);
  const orientation: HeadOrientation = {
    yaw: input.pose.yaw,
    pitch: input.pose.pitch,
    roll: input.pose.roll,
    source: input.orientationSource ?? "geometry",
  };
  const cue = { eyeCollapse: input.eyeCollapse ?? null, noseLead: input.noseLead ?? null };
  const reading = hasFace ? classifyCapturePose(orientation, cue, options?.stable === true) : null;
  const frontLimit = (orientation.source === "matrix" ? CAPTURE_FRAME.matrixFrontYaw : CAPTURE_FRAME.frontYaw) + (options?.stable ? 4 : 0);
  const poseOk =
    hasFace &&
    (input.view === "front"
      ? input.pose.yaw !== null && Math.abs(input.pose.yaw) <= frontLimit
      : input.view === "threeQuarter"
        ? reading?.threeQuarter === true
        : reading?.side === true);
  const checks: AlignmentCheck[] = [
    { id: "face", label: "Face detected", ok: hasFace, blocks: true },
    { id: "framing", label: "Framing", ok: framing.ok, blocks: framing.blocks },
    { id: "level", label: "Head level", ok: level.ok, blocks: level.blocks },
    { id: "pose", label: "Angle", ok: poseOk, blocks: true },
  ];
  const ready = checks.every((check) => check.ok || !check.blocks);
  const screenDirection = input.committedFacing ? screenTurnDirection(input.committedFacing, input.mirroredPreview) : null;
  const order: AlignmentCheck["id"][] = turned ? ["face", "framing", "pose", "level"] : ["face", "framing", "level", "pose"];
  const failed = order.map((id) => checks.find((check) => check.id === id)).find((check) => check && !check.ok && check.blocks);
  const progress = input.view === "front" ? null : turnProgress(orientation, input.view);
  return {
    status: ready ? "ready" : hasFace ? "adjust" : "searching",
    message: ready
      ? input.view === "front"
        ? "Aligned. Hold still."
        : capturePoseMessage(input.view, reading ?? { zone: "unreliable", threeQuarter: false, side: false, sideBorderline: false, ideal: false }, screenDirection)
      : failed
        ? instruction(input, failed.id, framing.issue, reading, screenDirection, band)
        : "Aligned. Hold still.",
    profileFacing: screenDirection,
    profilePose: reading?.zone ?? null,
    checks,
    turn: progress ? { ...progress, direction: screenDirection } : null,
  };
}

export function summarizeLiveFaces(
  faces: RawFaceLandmark[][],
  frame?: { width: number; height: number },
  lens?: LensModel | null,
  transform?: FacialMatrix | null,
): LiveFaceSummary {
  const face = faces[0];
  if (!face) {
    return {
      faceCount: faces.length,
      pose: { yaw: null, pitch: null, roll: null },
      orientationSource: "geometry",
      coverage: 0,
      centerX: null,
      centerY: null,
      eyeCollapse: null,
      noseLead: null,
      frankfortTilt: null,
      facialHeight: null,
      anchorX: null,
      anchorY: null,
      withinFrame: false,
      oval: [],
      eyeLine: null,
      nose: null,
    };
  }
  const box = faceBox(face);
  const rightEye = face[33];
  const leftEye = face[263];
  const nose = face[1];
  const measured = lens && frame && frame.width > 1 && frame.height > 1 ? undistortLandmarks(face, frame, lens) : face;
  const cue = profileShapeCue(measured, frame);
  const anchor = profileCompositionPoint(measured);
  const geometric = estimatePose(measured, frame);
  const matrix = transform ? extractFacialOrientation(transform) : null;
  const pose: PoseEstimate = matrix
    ? { yaw: matrix.yaw, pitch: matrix.pitch, roll: matrix.roll }
    : geometric;
  return {
    faceCount: faces.length,
    pose,
    orientationSource: matrix ? "matrix" : "geometry",
    coverage: faceCoverage(face),
    centerX: box ? (box.minX + box.maxX) / 2 : null,
    centerY: box ? (box.minY + box.maxY) / 2 : null,
    eyeCollapse: cue.eyeCollapse,
    noseLead: cue.noseLead,
    frankfortTilt: frame && frame.width > 0 && frame.height > 0 ? frankfortTilt(face, frame.width, frame.height) : null,
    facialHeight: faceHeightFraction(measured),
    anchorX: anchor?.x ?? null,
    anchorY: anchor?.y ?? null,
    withinFrame: landmarksWithinFrame(box),
    oval: faceOvalPoints(face),
    eyeLine:
      rightEye && leftEye
        ? [
            { x: rightEye.x, y: rightEye.y },
            { x: leftEye.x, y: leftEye.y },
          ]
        : null,
    nose: nose && Number.isFinite(nose.x) && Number.isFinite(nose.y) ? { x: nose.x, y: nose.y } : null,
  };
}

export function faceOvalPoints(face: RawFaceLandmark[]): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  for (const index of FACE_OVAL_LOOP) {
    const point = face[index];
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return [];
    points.push({ x: point.x, y: point.y });
  }
  return points;
}

function faceBox(raw: RawFaceLandmark[]): { minX: number; maxX: number; minY: number; maxY: number } | null {
  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;
  let count = 0;
  for (const point of raw) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    if (point.x < -0.05 || point.x > 1.05 || point.y < -0.05 || point.y > 1.05) continue;
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
    count += 1;
  }
  if (count < 10) return null;
  return { minX, maxX, minY, maxY };
}

function landmarksWithinFrame(box: { minX: number; maxX: number; minY: number; maxY: number } | null): boolean {
  if (!box) return false;
  const margin = CAPTURE_FRAME.clipMargin;
  return box.minX >= margin && box.minY >= margin && box.maxX <= 1 - margin && box.maxY <= 1 - margin;
}

/**
 * Profile framing uses a point between the visible ear and the nose, closer
 * to the ear. Centering that point leaves room in front of the nose and
 * behind the head. The nose itself is not the target.
 */
export function profileCompositionPoint(raw: RawFaceLandmark[]): { x: number; y: number } | null {
  const nose = usablePoint(raw[MP.pronasale]);
  const forehead = usablePoint(raw[MP.foreheadApex]);
  const chin = usablePoint(raw[MP.menton]);
  if (!nose || !forehead || !chin) return null;
  const posterior = farthestFrom(nose, [raw[MP.rightTragion], raw[MP.leftTragion], raw[MP.rightLateral[0]], raw[MP.leftLateral[0]]]);
  const x = posterior ? posterior.x * 0.62 + nose.x * 0.38 : nose.x;
  const y = (forehead.y + chin.y) / 2;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function usablePoint(point: RawFaceLandmark | undefined): RawFaceLandmark | null {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  return point;
}

function farthestFrom(nose: RawFaceLandmark, points: Array<RawFaceLandmark | undefined>): RawFaceLandmark | null {
  let best: RawFaceLandmark | null = null;
  let bestDistance = -1;
  for (const point of points) {
    const usable = usablePoint(point);
    if (!usable) continue;
    const distance = Math.abs(usable.x - nose.x);
    if (distance > bestDistance) {
      best = usable;
      bestDistance = distance;
    }
  }
  return best;
}

type FramingIssue = "none" | "close" | "far" | "left" | "right" | "up" | "down" | "clipped";

function framingCheck(
  input: {
    view: CaptureView;
    coverage: number;
    facialHeight?: number | null;
    withinFrame?: boolean;
    mirroredPreview: boolean;
  },
  centerX: number | null,
  centerY: number | null,
  band: number,
  hasFace: boolean,
  turned: boolean,
): { ok: boolean; blocks: boolean; issue: FramingIssue } {
  if (!hasFace) return { ok: false, blocks: true, issue: "none" };
  if (input.withinFrame === false) return { ok: false, blocks: true, issue: "clipped" };
  if (turned) {
    const height = input.facialHeight;
    if (height == null || !Number.isFinite(height)) return { ok: false, blocks: false, issue: "none" };
    if (height < CAPTURE_FRAME.profileHeightHardMin / band) return { ok: false, blocks: true, issue: "far" };
    if (height > CAPTURE_FRAME.profileHeightHardMax * band) return { ok: false, blocks: true, issue: "close" };
    const centered =
      centerX !== null &&
      centerY !== null &&
      Math.abs(centerX - CAPTURE_FRAME.centerX) <= CAPTURE_FRAME.turnedToleranceX * band &&
      Math.abs(centerY - CAPTURE_FRAME.centerY) <= CAPTURE_FRAME.turnedToleranceY * band;
    const distanceOk = height >= CAPTURE_FRAME.profileHeightMin / band && height <= CAPTURE_FRAME.profileHeightMax * band;
    if (centered && distanceOk) return { ok: true, blocks: true, issue: "none" };
    return { ok: false, blocks: false, issue: height < CAPTURE_FRAME.profileHeightMin / band ? "far" : height > CAPTURE_FRAME.profileHeightMax * band ? "close" : "none" };
  }
  if (input.coverage < 0.05) return { ok: false, blocks: true, issue: "far" };
  if (input.coverage > 0.85) return { ok: false, blocks: true, issue: "close" };
  const tolX = CAPTURE_FRAME.centerToleranceX * band;
  const tolY = CAPTURE_FRAME.centerToleranceY * band;
  let issue: FramingIssue = "none";
  if (centerX === null || centerY === null) issue = "none";
  else {
    const dx = centerX - CAPTURE_FRAME.centerX;
    const dy = centerY - CAPTURE_FRAME.centerY;
    if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) > tolX) {
      let direction: "left" | "right" = dx > 0 ? "left" : "right";
      if (input.mirroredPreview) direction = direction === "left" ? "right" : "left";
      issue = direction;
    } else if (Math.abs(dy) > tolY) issue = dy > 0 ? "up" : "down";
  }
  const distanceOk = input.coverage >= CAPTURE_FRAME.coverageMin && input.coverage <= CAPTURE_FRAME.coverageMax;
  if (!distanceOk) issue = input.coverage > CAPTURE_FRAME.coverageMax ? "close" : "far";
  const centered = issue !== "left" && issue !== "right" && issue !== "up" && issue !== "down";
  return { ok: distanceOk && centered, blocks: true, issue: distanceOk && centered ? "none" : issue };
}

function levelCheck(
  input: { pose: PoseEstimate; frankfortTilt?: number | null; orientationSource?: HeadOrientation["source"] },
  band: number,
  hasFace: boolean,
  turned: boolean,
): { ok: boolean; blocks: boolean } {
  if (!hasFace) return { ok: false, blocks: true };
  if (!turned) {
    const roll = input.pose.roll;
    const pitch = input.pose.pitch;
    const ok = roll !== null && pitch !== null && Math.abs(roll) <= CAPTURE_FRAME.roll * band && Math.abs(pitch) <= CAPTURE_FRAME.pitch * band;
    return { ok, blocks: true };
  }
  if (input.orientationSource === "matrix") {
    const pitch = input.pose.pitch == null ? 0 : Math.abs(input.pose.pitch);
    const roll = input.pose.roll == null ? 0 : Math.abs(input.pose.roll);
    if (pitch > 22 || roll > 20) return { ok: false, blocks: true };
    if (pitch > 10 || roll > 8) return { ok: false, blocks: false };
    return { ok: true, blocks: true };
  }
  const tilt = input.frankfortTilt == null ? 0 : Math.abs(input.frankfortTilt);
  if (tilt > 20) return { ok: false, blocks: true };
  if (tilt > 8) return { ok: false, blocks: false };
  return { ok: true, blocks: true };
}

function instruction(
  input: {
    view: CaptureView;
    faceCount: number;
    pose: PoseEstimate;
    coverage: number;
    mirroredPreview: boolean;
  },
  failed: AlignmentCheck["id"],
  framingIssue: FramingIssue,
  reading: PoseReading | null,
  screenDirection: "left" | "right" | null,
  band: number,
): string {
  if (failed === "face") {
    if (input.faceCount > 1) return "Only one face can be in the frame.";
    if (input.view === "threeQuarter") return "Turn your head about halfway to either side.";
    if (input.view === "profile") return "Turn toward a side view.";
    return "Step into the outline.";
  }
  if (failed === "framing") return framingMessage(input, framingIssue);
  if (failed === "level") return levelMessage(input.view, input.pose, band);
  if (failed === "pose" && input.view !== "front" && reading) return capturePoseMessage(input.view, reading, screenDirection);
  if (input.view === "threeQuarter") return "Turn your head about halfway to either side.";
  if (input.view === "profile") return "Keep turning toward a side view.";
  return "Square your face to the camera so it matches the outline.";
}

function framingMessage(input: { view: CaptureView; coverage: number }, issue: FramingIssue): string {
  if (issue === "clipped") return "Move back so your whole face stays in the frame.";
  if (issue === "far") return input.view === "front" ? "Move closer until your face fills the outline." : "Move closer.";
  if (issue === "close") return input.view === "front" ? "Move back so the outline frames your whole face." : "Move back slightly.";
  if (issue === "left" || issue === "right") return `Shift ${issue} until your face sits in the outline.`;
  if (issue === "up") return "Move up into the outline.";
  if (issue === "down") return "Move down into the outline.";
  if (input.view === "profile") return "Center your head in the brackets, with room in front of your nose.";
  return "Center your face in the outline.";
}

function levelMessage(view: CaptureView, pose: PoseEstimate, band: number): string {
  if (view !== "front") return "Keep your chin level and camera near eye height.";
  const roll = pose.roll === null ? Number.POSITIVE_INFINITY : Math.abs(pose.roll);
  const pitch = pose.pitch === null ? Number.POSITIVE_INFINITY : Math.abs(pose.pitch);
  if (roll >= pitch && roll > CAPTURE_FRAME.roll * band) return "Level your head with the eye line.";
  return "Bring your chin level with the outline.";
}
