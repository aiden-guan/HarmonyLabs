import { mapLandmarks } from "@/lib/face/mediapipe-map";
import {
  estimatePose,
  evaluatePhotoQuality,
  faceCoverage,
  mirrorRawLandmarks,
  profileFacesLeft,
} from "@/lib/face/quality";
import type { FaceView, PhotoQuality, RawFaceLandmark, SemanticLandmark } from "@/types/face";

export interface InterpretedPhoto {
  hardError: string | null;
  landmarks: SemanticLandmark[];
  quality: PhotoQuality;
}

export function interpretDetection(input: {
  faces: RawFaceLandmark[][];
  view: FaceView;
  blurScore: number;
  brightnessScore: number;
}): InterpretedPhoto {
  const faceCount = input.faces.length;
  const primary = input.faces[0] ?? [];
  let raw = primary;
  let mirrored = false;
  if (input.view === "profile" && raw.length > 0 && profileFacesLeft(raw)) {
    raw = mirrorRawLandmarks(raw);
    mirrored = true;
  }
  const pose = raw.length > 0 ? estimatePose(raw) : { yaw: null, pitch: null, roll: null };
  const evaluated = evaluatePhotoQuality({
    view: input.view,
    faceCount,
    pose,
    blurScore: input.blurScore,
    brightnessScore: input.brightnessScore,
    faceCoverage: raw.length > 0 ? faceCoverage(raw) : 0,
    mirrored,
  });
  const landmarks = evaluated.hardError || raw.length === 0 ? [] : Object.values(mapLandmarks(raw, input.view)).filter((item): item is SemanticLandmark => Boolean(item));
  return { hardError: evaluated.hardError, landmarks, quality: evaluated.quality };
}
