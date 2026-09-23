import { undistortLandmarks, type LensModel } from "@/lib/face/camera-optics";
import { SIDE_FRAME_RATIO } from "@/lib/face/capture-outline";
import { FACE_OVAL_LOOP } from "@/lib/face/face-oval";
import { frankfortTilt } from "@/lib/face/frankfort";
import { MP } from "@/lib/face/mediapipe-map";
import {
  classifyProfilePose,
  isTrueSidePose,
  profilePoseMessage,
  sidePoseMessage,
  type ProfilePoseState,
} from "@/lib/face/profile-pose";
import {
  estimatePose,
  faceCoverage,
  faceHeightFraction,
  profileFacesLeft,
  profileShapeCue,
  type PoseEstimate,
} from "@/lib/face/quality";
import type { FaceView, RawFaceLandmark } from "@/types/face";

/** Front, the halfway turn, and the true side are separate capture targets. */
export type CaptureView = FaceView | "threeQuarter";

export { FACE_OVAL_LOOP };

/**
 * The outline drawn on the camera is this frame. Alignment checks use the same
 * center so "line up with the outline" and the pose cue describe one target.
 */
export const CAPTURE_FRAME = {
  centerX: 0.5,
  centerY: 0.47,
  centerToleranceX: 0.07,
  centerToleranceY: 0.08,
  coverageMin: 0.08,
  coverageMax: 0.7,
  /** Profile size is forehead-to-chin height, not the narrower side-view area. */
  profileHeightMin: 0.34,
  profileHeightMax: 0.72,
  frontYaw: 12,
  roll: 8,
  pitch: 12,
  faceHeight: 0.62,
  frontWidthRatio: 0.72,
  /** Halfway turn: narrower than a true side, wider than a straight-on face. */
  threeQuarterWidthRatio: 0.84,
  profileWidthRatio: SIDE_FRAME_RATIO,
  maxWidthFraction: 0.74,
  profileCenterToleranceX: 0.11,
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
  id: "face" | "distance" | "center" | "level" | "pose";
  label: string;
  ok: boolean;
}

export interface CaptureAssessment {
  status: "searching" | "adjust" | "ready";
  message: string;
  profileFacing: "left" | "right";
  profilePose: ProfilePoseState | null;
  checks: AlignmentCheck[];
}

export interface LiveFaceSummary {
  faceCount: number;
  pose: PoseEstimate;
  coverage: number;
  centerX: number | null;
  centerY: number | null;
  facesLeft: boolean;
  eyeCollapse: number | null;
  noseLead: number | null;
  frankfortTilt: number | null;
  facialHeight: number | null;
  /** Profile composition point: behind the nose, so the nose is not forced to center. */
  anchorX: number | null;
  anchorY: number | null;
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
    facesLeft: boolean;
    mirroredPreview: boolean;
    eyeCollapse?: number | null;
    noseLead?: number | null;
    frankfortTilt?: number | null;
    facialHeight?: number | null;
    anchorX?: number | null;
    anchorY?: number | null;
  },
  options?: { stable?: boolean },
): CaptureAssessment {
  const band = options?.stable ? 1.35 : 1;
  const hasFace = input.faceCount === 1;
  const turned = input.view !== "front";
  const centerX = turned && input.anchorX != null ? input.anchorX : input.centerX;
  const centerY = turned && input.anchorY != null ? input.anchorY : input.centerY;
  const height = input.facialHeight ?? null;
  const distanceOk = turned
    ? hasFace &&
      height !== null &&
      height >= CAPTURE_FRAME.profileHeightMin / band &&
      height <= CAPTURE_FRAME.profileHeightMax * band
    : hasFace &&
      input.coverage >= CAPTURE_FRAME.coverageMin / band &&
      input.coverage <= CAPTURE_FRAME.coverageMax * band;
  const toleranceX = (turned ? CAPTURE_FRAME.profileCenterToleranceX : CAPTURE_FRAME.centerToleranceX) * band;
  const centerOk =
    hasFace &&
    centerX !== null &&
    centerY !== null &&
    Math.abs(centerX - CAPTURE_FRAME.centerX) <= toleranceX &&
    Math.abs(centerY - CAPTURE_FRAME.centerY) <= CAPTURE_FRAME.centerToleranceY * band;
  const { yaw, pitch, roll } = input.pose;
  const frankfort = input.frankfortTilt;
  const levelOk = turned
    ? hasFace && (frankfort == null || Math.abs(frankfort) <= 15 * band)
    : hasFace &&
      roll !== null &&
      pitch !== null &&
      Math.abs(roll) <= CAPTURE_FRAME.roll * band &&
      Math.abs(pitch) <= CAPTURE_FRAME.pitch * band;
  const cue = { eyeCollapse: input.eyeCollapse ?? null, noseLead: input.noseLead ?? null };
  const profilePose = turned ? classifyProfilePose(yaw, cue, options?.stable === true) : null;
  const poseOk =
    hasFace &&
    (input.view === "front"
      ? yaw !== null && Math.abs(yaw) <= CAPTURE_FRAME.frontYaw * band
      : input.view === "threeQuarter"
        ? profilePose === "lateral"
        : isTrueSidePose(yaw, cue, options?.stable === true));

  const checks: AlignmentCheck[] = [
    { id: "face", label: "One face", ok: hasFace },
    { id: "distance", label: "Distance", ok: distanceOk },
    { id: "center", label: "Centered", ok: centerOk },
    { id: "level", label: "Level", ok: levelOk },
    {
      id: "pose",
      label: input.view === "front" ? "Straight on" : input.view === "threeQuarter" ? "Three-quarter" : "Side view",
      ok: poseOk,
    },
  ];
  const ready = checks.every((check) => check.ok);
  const order: AlignmentCheck["id"][] = turned
    ? ["face", "distance", "pose", "level", "center"]
    : ["face", "distance", "center", "level", "pose"];
  const failed = order.map((id) => checks.find((check) => check.id === id)).find((check) => check && !check.ok);
  return {
    status: ready ? "ready" : hasFace ? "adjust" : "searching",
    message: ready
      ? input.view === "profile"
        ? "Good side profile. Keep your head level."
        : input.view === "threeQuarter"
          ? "Good three-quarter. Hold still."
          : "Aligned. Hold still."
      : failed
        ? instruction({ ...input, centerX, centerY }, failed.id, band, profilePose)
        : "Aligned. Hold still.",
    profileFacing: input.facesLeft ? "left" : "right",
    profilePose,
    checks,
  };
}

export function summarizeLiveFaces(
  faces: RawFaceLandmark[][],
  frame?: { width: number; height: number },
  lens?: LensModel | null,
): LiveFaceSummary {
  const face = faces[0];
  if (!face) {
    return {
      faceCount: faces.length,
      pose: { yaw: null, pitch: null, roll: null },
      coverage: 0,
      centerX: null,
      centerY: null,
      facesLeft: false,
      eyeCollapse: null,
      noseLead: null,
      frankfortTilt: null,
      facialHeight: null,
      anchorX: null,
      anchorY: null,
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
  return {
    faceCount: faces.length,
    pose: estimatePose(measured, frame),
    coverage: faceCoverage(face),
    centerX: box ? (box.minX + box.maxX) / 2 : null,
    centerY: box ? (box.minY + box.maxY) / 2 : null,
    facesLeft: profileFacesLeft(face),
    eyeCollapse: cue.eyeCollapse,
    noseLead: cue.noseLead,
    frankfortTilt: frame && frame.width > 0 && frame.height > 0 ? frankfortTilt(face, frame.width, frame.height) : null,
    facialHeight: faceHeightFraction(measured),
    anchorX: anchor?.x ?? null,
    anchorY: anchor?.y ?? null,
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

function instruction(
  input: {
    view: CaptureView;
    faceCount: number;
    pose: PoseEstimate;
    coverage: number;
    centerX: number | null;
    centerY: number | null;
    facesLeft: boolean;
    mirroredPreview: boolean;
    eyeCollapse?: number | null;
    noseLead?: number | null;
    frankfortTilt?: number | null;
    facialHeight?: number | null;
  },
  failed: AlignmentCheck["id"],
  band: number,
  profilePose: ProfilePoseState | null,
): string {
  if (failed === "face") {
    if (input.faceCount > 1) return "Only one face can be in the frame.";
    if (input.view === "threeQuarter") return "Turn halfway to either side.";
    if (input.view === "profile") return "Turn to a full side view.";
    return "Step into the outline.";
  }
  if (failed === "distance") {
    if (input.view !== "front") {
      const height = input.facialHeight ?? 0;
      return height > CAPTURE_FRAME.profileHeightMax * band ? "Move back slightly." : "Move closer.";
    }
    return input.coverage > CAPTURE_FRAME.coverageMax * band
      ? "Move back so the outline frames your whole face."
      : "Move closer until your face fills the outline.";
  }
  if (failed === "pose" && input.view === "profile") {
    return sidePoseMessage(input.pose.yaw, { eyeCollapse: input.eyeCollapse ?? null, noseLead: input.noseLead ?? null });
  }
  if (failed === "pose" && input.view === "threeQuarter") return profilePoseMessage(profilePose ?? "frontal");
  if (failed === "center") return centerInstruction(input, band);
  if (failed === "level") return levelInstruction(input.view, input.pose, band);
  return poseInstruction(input.view);
}

function centerInstruction(
  input: { view?: CaptureView; centerX: number | null; centerY: number | null; mirroredPreview: boolean },
  band: number,
): string {
  if (input.view === "profile") {
    return "Center your head in the brackets, with room in front of your nose and behind your ear.";
  }
  if (input.view === "threeQuarter") return "Center your head in the outline.";
  if (input.centerX === null || input.centerY === null) return "Center your face in the outline.";
  const dx = input.centerX - CAPTURE_FRAME.centerX;
  const dy = input.centerY - CAPTURE_FRAME.centerY;
  const tolX = CAPTURE_FRAME.centerToleranceX * band;
  const tolY = CAPTURE_FRAME.centerToleranceY * band;
  if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) > tolX) {
    let direction: "left" | "right" = dx > 0 ? "left" : "right";
    if (input.mirroredPreview) direction = direction === "left" ? "right" : "left";
    return `Shift ${direction} until your face sits in the outline.`;
  }
  if (Math.abs(dy) > tolY) {
    return dy > 0 ? "Move up into the outline." : "Move down into the outline.";
  }
  return "Center your face in the outline.";
}

function levelInstruction(view: CaptureView, pose: PoseEstimate, band: number): string {
  if (view !== "front") return "Keep your gaze level — don't raise or lower your chin.";
  const roll = pose.roll === null ? Number.POSITIVE_INFINITY : Math.abs(pose.roll);
  const pitch = pose.pitch === null ? Number.POSITIVE_INFINITY : Math.abs(pose.pitch);
  if (roll >= pitch && roll > CAPTURE_FRAME.roll * band) return "Level your head with the eye line.";
  return "Bring your chin level with the outline.";
}

function poseInstruction(view: CaptureView): string {
  if (view === "threeQuarter") return "Turn halfway to either side.";
  if (view === "profile") return "Turn to a full side view.";
  return "Square your face to the camera so it matches the outline.";
}
