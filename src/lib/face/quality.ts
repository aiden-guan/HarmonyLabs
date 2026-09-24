import type { FaceView, PhotoQuality, RawFaceLandmark } from "@/types/face";
import { MP } from "@/lib/face/mediapipe-map";
import { classifyCapturePose, type HeadOrientation } from "@/lib/face/profile-pose";

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
 * Pose checks were tuned on 4:3 desk-camera frames. Normalized x and y are
 * fractions of width and height, so a portrait phone frame changes pitch and
 * roll unless it is scaled back onto that 4:3 frame. Yaw already compares two
 * width-scaled quantities, so it stays put.
 */
export const TUNED_FRAME_ASPECT = 4 / 3;

export function frameAspectScale(frame?: { width: number; height: number }): number {
  if (!frame || frame.width <= 0 || frame.height <= 0) return 1;
  return frame.width / frame.height / TUNED_FRAME_ASPECT;
}

/**
 * Approximate pose from mesh geometry.
 * Yaw uses the depth difference of the lateral face points relative to their
 * horizontal span. It is not a calibrated head-pose sensor.
 * Positive yaw means the subject's left side is closer to the camera.
 * Roll is the slope of the eye line. The horizontal span is absolute so a
 * level face stays near 0° whether mesh-left sits on the image left or right.
 */
export function estimatePose(raw: RawFaceLandmark[], frame?: { width: number; height: number }): PoseEstimate {
  const left = raw[MP.leftLateral[0]];
  const right = raw[MP.rightLateral[0]];
  const forehead = raw[MP.foreheadApex];
  const chin = raw[MP.menton];
  const leftEye = raw[MP.leftEyeOuter];
  const rightEye = raw[MP.rightEyeOuter];
  if (!left || !right || !forehead || !chin || !leftEye || !rightEye) {
    return { yaw: null, pitch: null, roll: null };
  }
  const aspect = frameAspectScale(frame);
  const yaw = degrees(
    Math.atan2(right.z - left.z, Math.abs(left.x - right.x) + 1e-6),
  );
  const pitch = degrees(
    Math.atan2((chin.z - forehead.z) * aspect, Math.abs(chin.y - forehead.y) + 1e-6),
  );
  const roll = degrees(
    Math.atan2(leftEye.y - rightEye.y, Math.abs(leftEye.x - rightEye.x) * aspect + 1e-6),
  );
  return { yaw, pitch, roll };
}

/** Forehead-to-chin span. Profile distance uses this because a side face is narrow. */
export function faceHeightFraction(raw: RawFaceLandmark[]): number | null {
  const forehead = raw[MP.foreheadApex];
  const chin = raw[MP.menton];
  if (!forehead || !chin || !Number.isFinite(forehead.y) || !Number.isFinite(chin.y)) return null;
  const span = Math.abs(chin.y - forehead.y);
  if (!Number.isFinite(span) || span < 0.02) return null;
  return span;
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
 * When the frame is known, horizontal spans are scaled onto the 4:3 frame the
 * thresholds were tuned on, so a tall phone photo does not look less turned.
 */
export function profileShapeCue(
  raw: RawFaceLandmark[],
  frame?: { width: number; height: number },
): ProfileShapeCue {
  const left = raw[MP.leftEyeOuter];
  const right = raw[MP.rightEyeOuter];
  const forehead = raw[MP.foreheadApex];
  const chin = raw[MP.menton];
  const nose = raw[MP.pronasale];
  if (!left || !right || !forehead || !chin) return { eyeCollapse: null, noseLead: null };
  const faceH = Math.abs(chin.y - forehead.y);
  if (faceH < 0.05) return { eyeCollapse: null, noseLead: null };
  const aspect = frameAspectScale(frame);
  const eyeDx = Math.abs(left.x - right.x) * aspect;
  const eyeCollapse = 1 - eyeDx / faceH;
  const noseLead = nose ? (Math.abs(nose.x - (left.x + right.x) / 2) * aspect) / faceH : null;
  return {
    eyeCollapse: Number.isFinite(eyeCollapse) ? eyeCollapse : null,
    noseLead: noseLead !== null && Number.isFinite(noseLead) ? noseLead : null,
  };
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
  /** Normalized forehead-to-chin span. Profile distance warnings use this when present. */
  facialHeight?: number | null;
  /** Degrees the ear-to-eyelid line sits off horizontal, when it was not leveled. */
  frankfortTilt?: number | null;
  /**
   * Live capture passes the same orientation the camera accepted.
   * Without it, pose is classified from the geometric yaw fallback.
   */
  orientation?: HeadOrientation | null;
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

  if (input.view === "profile" && input.facialHeight != null) {
    if (input.facialHeight < 0.28) {
      warnings.push("The face is far from the camera. A closer photo is easier to verify.");
    } else if (input.facialHeight > 0.78) {
      warnings.push("The face is extremely close to the camera. Perspective can distort proportions.");
    }
  } else if (input.faceCoverage > 0 && input.faceCoverage < 0.12) {
    warnings.push("The face fills very little of the frame. A closer photo is easier to verify.");
  } else if (input.faceCoverage > 0.72) {
    warnings.push("The face is extremely close to the camera. Perspective can distort proportions.");
  }

  const orientation: HeadOrientation = input.orientation ?? {
    yaw,
    pitch,
    roll,
    source: "geometry",
  };

  if (input.view === "front") {
    if (orientation.source === "matrix" && orientation.yaw !== null) {
      const abs = Math.abs(orientation.yaw);
      if (abs > 32) {
        hardError =
          hardError ??
          `This front photo is turned about ${roundDegrees(orientation.yaw)}. Use a photo facing the camera.`;
      } else if (abs > 18) {
        warnings.push(
          `The front photo is turned about ${roundDegrees(orientation.yaw)}. Frontal measurements assume a near-straight view.`,
        );
      }
    } else if (yaw !== null) {
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
  }

  if (input.view === "profile") {
    const cue = input.profileCue ?? { eyeCollapse: null, noseLead: null };
    const reading = classifyCapturePose(orientation, cue, true);
    if (!reading.side) {
      hardError =
        hardError ??
        (reading.threeQuarter
          ? "This is still a three-quarter view. Keep turning toward a side view."
          : "This is not a side view yet. Turn toward a side view.");
    } else if (reading.sideBorderline) {
      warnings.push(
        "The head is a little short of a full side profile. Measurements from this photo are less certain.",
      );
    }
    if (input.frankfortTilt != null && Math.abs(input.frankfortTilt) > 15) {
      warnings.push(
        "The head is tilted up or down. Look straight ahead and keep your chin neutral. A small tilt is corrected automatically.",
      );
    }
  }

  if (input.mirrored) {
    warnings.push(
      "The profile was mirrored so measurements use a right-facing frame.",
    );
  }

  const grade = captureGradeFor(input);
  const perspectiveRisk =
    input.faceCoverage > 0.5 || (input.facialHeight != null && input.facialHeight > 0.7);
  const notes = [...(input.view === "front" && perspectiveRisk
    ? ["Perspective distortion risk. A phone at arm's length enlarges the nose. Step back to about 4–5 ft (1.2–1.5 m) when you can."]
    : [])];

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
      notes,
      mirrored: input.mirrored,
      captureGrade: grade,
      perspectiveRisk,
    },
  };
}

function within(value: number | null, limit: number): boolean {
  return value !== null && Math.abs(value) <= limit;
}

function captureGradeFor(input: {
  view: FaceView;
  pose: PoseEstimate;
  orientation?: HeadOrientation | null;
  profileCue?: ProfileShapeCue;
  blurScore: number;
  facialHeight?: number | null;
  faceCoverage: number;
}): import("@/types/face").CaptureGrade {
  const yaw = input.orientation?.yaw ?? input.pose.yaw;
  const pitch = input.orientation?.pitch ?? input.pose.pitch;
  const roll = input.pose.roll;
  const sharp = input.blurScore >= 0.45;
  const close = input.faceCoverage > 0.5 || (input.facialHeight != null && input.facialHeight > 0.7);
  if (input.view === "profile") {
    const cue = input.profileCue ?? { eyeCollapse: null, noseLead: null };
    const orientation: HeadOrientation = input.orientation ?? {
      yaw,
      pitch,
      roll,
      source: "geometry",
    };
    const reading = classifyCapturePose(orientation, cue, false);
    const collapse = cue.eyeCollapse ?? 0;
    if (reading.side && reading.ideal && !reading.sideBorderline && collapse >= 0.78 && sharp && !close) {
      return "measurement-grade";
    }
    if (reading.side && !reading.sideBorderline) return "good";
    return "limited";
  }
  const tight = within(yaw, 4) && within(pitch, 4) && within(roll, 4);
  const good = within(yaw, 8) && within(pitch, 8) && within(roll, 8);
  if (tight && sharp && !close) return "measurement-grade";
  if (good) return "good";
  return "limited";
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
