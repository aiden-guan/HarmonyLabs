import type { FaceView, PhotoQuality, RawFaceLandmark } from "@/types/face";
import { MP } from "@/lib/face/mediapipe-map";

export interface PoseEstimate {
  yaw: number | null;
  pitch: number | null;
  roll: number | null;
}

function degrees(radians: number): number | null {
  if (!Number.isFinite(radians)) return null;
  return (radians * 180) / Math.PI;
}

/**
 * Approximate pose from mesh geometry.
 * Yaw uses the depth difference of the lateral face points relative to their
 * horizontal span. It is not a calibrated head-pose sensor.
 * Positive yaw means the subject's left side is closer to the camera.
 * Roll is the slope of the eye line. The horizontal span is absolute so a
 * level face stays near 0° whether mesh-left sits on the image left or right.
 */
export function estimatePose(raw: RawFaceLandmark[]): PoseEstimate {
  const left = raw[MP.leftLateral[0]];
  const right = raw[MP.rightLateral[0]];
  const forehead = raw[MP.foreheadApex];
  const chin = raw[MP.menton];
  const leftEye = raw[MP.leftEyeOuter];
  const rightEye = raw[MP.rightEyeOuter];
  if (!left || !right || !forehead || !chin || !leftEye || !rightEye) {
    return { yaw: null, pitch: null, roll: null };
  }
  const yaw = degrees(
    Math.atan2(right.z - left.z, Math.abs(left.x - right.x) + 1e-6),
  );
  const pitch = degrees(
    Math.atan2(chin.z - forehead.z, Math.abs(chin.y - forehead.y) + 1e-6),
  );
  const roll = degrees(
    Math.atan2(leftEye.y - rightEye.y, Math.abs(leftEye.x - rightEye.x) + 1e-6),
  );
  return { yaw, pitch, roll };
}

export function faceCoverage(raw: RawFaceLandmark[]): number {
  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;
  let count = 0;
  for (const point of raw) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    if (point.x < -0.05 || point.x > 1.05 || point.y < -0.05 || point.y > 1.05) {
      continue;
    }
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
    count += 1;
  }
  if (count < 10) return 0;
  return Math.max(0, Math.min(1, (maxX - minX) * (maxY - minY)));
}

/** Nose tip relative to the lateral-face midpoint. Positive means the nose sits to image-right. */
export function noseOffset(raw: RawFaceLandmark[]): number | null {
  const nose = raw[MP.pronasale];
  const left = raw[MP.leftLateral[0]];
  const right = raw[MP.rightLateral[0]];
  if (!nose || !left || !right) return null;
  const center = (left.x + right.x) / 2;
  return nose.x - center;
}

/**
 * Left-facing profiles are mirrored so every stored profile uses a
 * right-facing frame. Anterior is then the larger x direction.
 */
export function profileFacesLeft(raw: RawFaceLandmark[]): boolean {
  const offset = noseOffset(raw);
  return offset !== null && offset < -0.02;
}

export interface ProfileShapeCue {
  eyeCollapse: number | null;
  noseLead: number | null;
}

/**
 * How close the photograph is to a true lateral, independent of the depth yaw.
 * Eye collapse is 1 when the two outer canthi overlap. Nose lead is how far
 * the tip sits ahead of the eyes, as a fraction of face height.
 */
export function profileShapeCue(raw: RawFaceLandmark[]): ProfileShapeCue {
  const left = raw[MP.leftEyeOuter];
  const right = raw[MP.rightEyeOuter];
  const forehead = raw[MP.foreheadApex];
  const chin = raw[MP.menton];
  const nose = raw[MP.pronasale];
  if (!left || !right || !forehead || !chin) return { eyeCollapse: null, noseLead: null };
  const faceH = Math.abs(chin.y - forehead.y);
  if (faceH < 0.05) return { eyeCollapse: null, noseLead: null };
  const eyeCollapse = 1 - Math.abs(left.x - right.x) / faceH;
  const noseLead = nose ? Math.abs(nose.x - (left.x + right.x) / 2) / faceH : null;
  return {
    eyeCollapse: Number.isFinite(eyeCollapse) ? eyeCollapse : null,
    noseLead: noseLead !== null && Number.isFinite(noseLead) ? noseLead : null,
  };
}

/**
 * A side photo is ready once the nose is in front and the eyes have started
 * to stack, or the depth yaw is already a side view. Only a near-frontal
 * photo is refused. A slightly open far eyebrow stays usable, and a small
 * head tilt is leveled afterwards from the ear to the lower eyelid.
 */
export function profileTurn(
  yaw: number | null,
  cue: ProfileShapeCue,
  relaxed = false,
): "ready" | "close" | "no" {
  if (yaw === null && cue.eyeCollapse === null) return "ready";
  const absYaw = yaw === null ? null : Math.abs(yaw);
  const collapse = cue.eyeCollapse;
  const lead = cue.noseLead;
  const stacked =
    collapse !== null &&
    collapse >= (relaxed ? 0.48 : 0.55) &&
    (lead === null || lead >= (relaxed ? 0.04 : 0.05));
  const yawReady = absYaw !== null && absYaw >= (relaxed ? 24 : 28);
  if (stacked || yawReady) return "ready";
  const eyesApart = collapse === null || collapse < (relaxed ? 0.38 : 0.42);
  const yawFlat = absYaw === null || absYaw < (relaxed ? 14 : 18);
  if (eyesApart && yawFlat) return "no";
  return "close";
}

export function mirrorRawLandmarks(raw: RawFaceLandmark[]): RawFaceLandmark[] {
  return raw.map((point) => ({
    ...point,
    x: 1 - point.x,
  }));
}

function roundDegrees(value: number): string {
  return `${Math.round(Math.abs(value))}°`;
}

export function evaluatePhotoQuality(input: {
  view: FaceView;
  faceCount: number;
  pose: PoseEstimate;
  blurScore: number;
  brightnessScore: number;
  faceCoverage: number;
  mirrored: boolean;
  profileCue?: ProfileShapeCue;
  /** Degrees the ear-to-eyelid line sits off horizontal, when it was not leveled. */
  frankfortTilt?: number | null;
}): { quality: PhotoQuality; hardError: string | null } {
  const warnings: string[] = [];
  const { yaw, pitch, roll } = input.pose;
  let hardError: string | null = null;

  if (input.faceCount <= 0) {
    hardError = "No face was detected. Use a photo where one face is clearly visible.";
  } else if (input.faceCount > 1) {
    hardError =
      "More than one face was detected. Upload a photo with only the face you want measured.";
  }

  if (input.blurScore < 0.12) {
    hardError =
      hardError ??
      "This photo is too blurry to place landmarks reliably. Retake it with the face in focus.";
  } else if (input.blurScore < 0.35) {
    warnings.push("The photo looks soft. Edges and landmarks may be less reliable.");
  }

  if (input.brightnessScore < 0.18) {
    warnings.push("The photo is very dark. Landmark placement may be harder to verify.");
  } else if (input.brightnessScore > 0.92) {
    warnings.push("The photo is very bright. Some contours may be washed out.");
  }

  if (input.view !== "profile" && roll !== null && Math.abs(roll) > 28) {
    hardError =
      hardError ??
      `Head tilt is about ${roundDegrees(roll)}. Retake the photo with the camera closer to level.`;
  } else if (input.view !== "profile" && roll !== null && Math.abs(roll) > 10) {
    warnings.push(
      `Head tilt is about ${roundDegrees(roll)}. Measurements can shift when the camera is not level.`,
    );
  }

  if (input.view !== "profile" && pitch !== null && Math.abs(pitch) > 18) {
    warnings.push(
      `Chin or forehead pitch is about ${roundDegrees(pitch)}. Vertical proportions may differ from a level photo.`,
    );
  }

  if (input.faceCoverage > 0 && input.faceCoverage < 0.12) {
    warnings.push("The face fills very little of the frame. A closer photo is easier to verify.");
  } else if (input.faceCoverage > 0.72) {
    warnings.push("The face is extremely close to the camera. Perspective can distort proportions.");
  }

  if (input.view === "front" && yaw !== null) {
    if (Math.abs(yaw) > 38) {
      hardError =
        hardError ??
        `This front photo is turned about ${roundDegrees(yaw)}. Use a photo facing the camera.`;
    } else if (Math.abs(yaw) > 18) {
      warnings.push(
        `The front photo is turned about ${roundDegrees(yaw)}. Frontal measurements assume a near-straight view.`,
      );
    }
  }

  if (input.view === "profile") {
    const turn = profileTurn(yaw, input.profileCue ?? { eyeCollapse: null, noseLead: null });
    if (turn === "no") {
      hardError =
        hardError ??
        "This is not a side view yet. Turn until the far eyebrow is hidden and look straight ahead.";
    } else if (turn === "close") {
      warnings.push(
        "The far eyebrow may still be visible. A fuller side view keeps these angles steady. You can check the points on the next screen.",
      );
    }
    if (input.frankfortTilt != null && Math.abs(input.frankfortTilt) > 15) {
      warnings.push(
        `The head is tilted about ${roundDegrees(input.frankfortTilt)} from level. Look straight ahead. A small tilt is corrected automatically; a larger one still changes the profile.`,
      );
    }
  }

  if (input.mirrored) {
    warnings.push(
      "The profile was mirrored so measurements use a right-facing frame.",
    );
  }

  return {
    hardError,
    quality: {
      faceDetected: input.faceCount > 0,
      faceCount: input.faceCount,
      yaw,
      pitch,
      roll,
      blurScore: input.blurScore,
      brightnessScore: input.brightnessScore,
      faceCoverage: input.faceCoverage,
      warnings,
      mirrored: input.mirrored,
    },
  };
}

export function measurementConfidence(
  qualities: PhotoQuality[],
): "High" | "Moderate" | "Low" {
  const warningCount = qualities.reduce(
    (count, quality) => count + quality.warnings.length,
    0,
  );
  if (warningCount === 0) return "High";
  if (warningCount <= 2) return "Moderate";
  return "Low";
}
