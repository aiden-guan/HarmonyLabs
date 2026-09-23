import { planFrankfortLevel, rotateRawLandmarks } from "@/lib/face/frankfort";
import { mapLandmarks } from "@/lib/face/mediapipe-map";
import {
  estimatePose,
  evaluatePhotoQuality,
  faceCoverage,
  faceHeightFraction,
  mirrorRawLandmarks,
  profileFacesLeft,
  profileShapeCue,
} from "@/lib/face/quality";
import type { FaceView, PhotoQuality, RawFaceLandmark, SemanticLandmark } from "@/types/face";

export interface InterpretedPhoto {
  hardError: string | null;
  landmarks: SemanticLandmark[];
  quality: PhotoQuality;
  /** Clockwise radians already applied to the landmarks. The saved photo must match. */
  levelRadians: number | null;
}

export function interpretDetection(input: {
  faces: RawFaceLandmark[][];
  view: FaceView;
  blurScore: number;
  brightnessScore: number;
  width?: number;
  height?: number;
}): InterpretedPhoto {
  const faceCount = input.faces.length;
  const primary = input.faces[0] ?? [];
  let raw = primary;
  let mirrored = false;
  if (input.view === "profile" && raw.length > 0 && profileFacesLeft(raw)) {
    raw = mirrorRawLandmarks(raw);
    mirrored = true;
  }
  const frame =
    input.width && input.height && input.width > 0 && input.height > 0
      ? { width: input.width, height: input.height }
      : undefined;
  const width = frame?.width ?? 1;
  const height = frame?.height ?? 1;
  const pose = raw.length > 0 ? estimatePose(raw, frame) : { yaw: null, pitch: null, roll: null };
  const cue = raw.length > 0 ? profileShapeCue(raw, frame) : undefined;
  const level =
    input.view === "profile" && raw.length > 0 ? planFrankfortLevel(raw, width, height) : { radians: null, warnTilt: null };
  if (level.radians !== null) raw = rotateRawLandmarks(raw, level.radians, width, height);
  const evaluated = evaluatePhotoQuality({
    view: input.view,
    faceCount,
    pose,
    blurScore: input.blurScore,
    brightnessScore: input.brightnessScore,
    faceCoverage: raw.length > 0 ? faceCoverage(raw) : 0,
    mirrored,
    profileCue: cue,
    facialHeight: raw.length > 0 ? faceHeightFraction(raw) : null,
    frankfortTilt: level.warnTilt,
  });
  if (level.radians !== null) {
    evaluated.quality.notes = [
      ...(evaluated.quality.notes ?? []),
      "The profile was leveled slightly so the head sits closer to horizontal.",
    ];
  }
  const landmarks = evaluated.hardError || raw.length === 0 ? [] : Object.values(mapLandmarks(raw, input.view)).filter((item): item is SemanticLandmark => Boolean(item));
  return { hardError: evaluated.hardError, landmarks, quality: evaluated.quality, levelRadians: level.radians };
}
