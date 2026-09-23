import { FACE_OVAL_LOOP } from "@/lib/face/face-oval";
import { frankfortTilt } from "@/lib/face/frankfort";
import {
  estimatePose,
  faceCoverage,
  profileFacesLeft,
  profileShapeCue,
  profileTurn,
  type PoseEstimate,
} from "@/lib/face/quality";
import type { FaceView, RawFaceLandmark } from "@/types/face";

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
  frontYaw: 12,
  roll: 8,
  pitch: 12,
  faceHeight: 0.62,
  frontWidthRatio: 0.72,
  profileWidthRatio: 0.88,
  maxWidthFraction: 0.74,
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
  oval: Array<{ x: number; y: number }>;
  eyeLine: [{ x: number; y: number }, { x: number; y: number }] | null;
  nose: { x: number; y: number } | null;
}

export function captureGuideBox(width: number, height: number, view: FaceView): GuideBox {
  const ratio = view === "front" ? CAPTURE_FRAME.frontWidthRatio : CAPTURE_FRAME.profileWidthRatio;
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
    view: FaceView;
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
  },
  options?: { stable?: boolean },
): CaptureAssessment {
  const band = options?.stable ? 1.35 : 1;
  const hasFace = input.faceCount === 1;
  const centerX = input.centerX;
  const centerY = input.centerY;
  const distanceOk =
    hasFace &&
    input.coverage >= CAPTURE_FRAME.coverageMin / band &&
    input.coverage <= CAPTURE_FRAME.coverageMax * band;
  const centerOk =
    hasFace &&
    centerX !== null &&
    centerY !== null &&
    Math.abs(centerX - CAPTURE_FRAME.centerX) <= CAPTURE_FRAME.centerToleranceX * band &&
    Math.abs(centerY - CAPTURE_FRAME.centerY) <= CAPTURE_FRAME.centerToleranceY * band;
  const { yaw, pitch, roll } = input.pose;
  const frankfort = input.frankfortTilt;
  const levelOk =
    input.view === "profile"
      ? hasFace && (frankfort == null || Math.abs(frankfort) <= 15 * band)
      : hasFace &&
        roll !== null &&
        pitch !== null &&
        Math.abs(roll) <= CAPTURE_FRAME.roll * band &&
        Math.abs(pitch) <= CAPTURE_FRAME.pitch * band;
  const profilePose =
    input.view === "profile"
      ? profileTurn(yaw, { eyeCollapse: input.eyeCollapse ?? null, noseLead: input.noseLead ?? null }, band > 1)
      : null;
  const poseOk =
    hasFace &&
    (input.view === "front"
      ? yaw !== null && Math.abs(yaw) <= CAPTURE_FRAME.frontYaw * band
      : profilePose !== "no");

  const checks: AlignmentCheck[] = [
    { id: "face", label: "One face", ok: hasFace },
    { id: "distance", label: "Distance", ok: distanceOk },
    { id: "center", label: "Centered", ok: centerOk },
    { id: "level", label: "Level", ok: levelOk },
    { id: "pose", label: input.view === "front" ? "Straight on" : "Side view", ok: poseOk },
  ];
  const ready = checks.every((check) => check.ok);
  const failed = checks.find((check) => !check.ok);
  return {
    status: ready ? "ready" : hasFace ? "adjust" : "searching",
    message:
      ready && profilePose === "close"
        ? "Close enough. If the far eyebrow is still visible, turn a little more, or hold still."
        : ready || !failed
          ? "Aligned. Hold still."
          : instruction(input, failed.id, band),
    profileFacing: input.facesLeft ? "left" : "right",
    checks,
  };
}

export function summarizeLiveFaces(
  faces: RawFaceLandmark[][],
  frame?: { width: number; height: number },
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
      oval: [],
      eyeLine: null,
      nose: null,
    };
  }
  const box = faceBox(face);
  const rightEye = face[33];
  const leftEye = face[263];
  const nose = face[1];
  const cue = profileShapeCue(face);
  return {
    faceCount: faces.length,
    pose: estimatePose(face),
    coverage: faceCoverage(face),
    centerX: box ? (box.minX + box.maxX) / 2 : null,
    centerY: box ? (box.minY + box.maxY) / 2 : null,
    facesLeft: profileFacesLeft(face),
    eyeCollapse: cue.eyeCollapse,
    noseLead: cue.noseLead,
    frankfortTilt: frame && frame.width > 0 && frame.height > 0 ? frankfortTilt(face, frame.width, frame.height) : null,
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

function instruction(
  input: {
    view: FaceView;
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
  },
  failed: AlignmentCheck["id"],
  band: number,
): string {
  if (failed === "face") {
    return input.faceCount > 1 ? "Only one face can be in the frame." : "Step into the outline.";
  }
  if (failed === "distance") {
    return input.coverage > CAPTURE_FRAME.coverageMax * band
      ? "Move back so the outline frames your whole face."
      : "Move closer until your face fills the outline.";
  }
  if (failed === "center") return centerInstruction(input, band);
  if (failed === "level") return levelInstruction(input.view, input.pose, band);
  return poseInstruction(input.view);
}

function centerInstruction(
  input: { centerX: number | null; centerY: number | null; mirroredPreview: boolean },
  band: number,
): string {
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

function levelInstruction(view: FaceView, pose: PoseEstimate, band: number): string {
  if (view === "profile") return "Look straight ahead, not up or down. Keep the ear uncovered.";
  const roll = pose.roll === null ? Number.POSITIVE_INFINITY : Math.abs(pose.roll);
  const pitch = pose.pitch === null ? Number.POSITIVE_INFINITY : Math.abs(pose.pitch);
  if (roll >= pitch && roll > CAPTURE_FRAME.roll * band) return "Level your head with the eye line.";
  return "Bring your chin level with the outline.";
}

function poseInstruction(view: FaceView): string {
  if (view === "profile") return "Turn until the far eyebrow is hidden. Look straight ahead, with the ear uncovered.";
  return "Square your face to the camera so it matches the outline.";
}
