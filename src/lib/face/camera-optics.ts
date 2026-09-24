import type { RawFaceLandmark } from "@/types/face";

export type DeviceClass = "mobile" | "desktop";

export interface DeviceSignals {
  userAgent: string;
  maxTouchPoints: number;
  coarsePointer: boolean;
  screenWidth: number;
  screenHeight: number;
  /** `navigator.userAgentData.mobile`, when the browser exposes it. */
  userAgentMobile?: boolean;
}

/**
 * Estimated radial (Brown–Conrady) distortion.
 * This pulls wide-lens barrel distortion back toward the optical center.
 * It does not undo perspective enlargement from holding the camera close to the face.
 * That requires a longer subject distance, about 1.2–1.5 m (4–5 ft).
 */
export interface LensModel {
  device: DeviceClass;
  longEdgeFov: number;
  k1: number;
  k2: number;
}

export interface Raster {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

const MOBILE_LENS: LensModel = { device: "mobile", longEdgeFov: 74, k1: 0.15, k2: 0.05 };
const DESKTOP_LENS: LensModel = { device: "desktop", longEdgeFov: 62, k1: 0.04, k2: 0.012 };

export function detectDeviceClass(signals: DeviceSignals): DeviceClass {
  if (signals.userAgentMobile === true) return "mobile";
  const ua = signals.userAgent;
  if (/Android|iPhone|iPod|iPad|webOS|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)) return "mobile";
  // iPadOS reports a desktop Macintosh UA and exposes itself through touch.
  if (/Macintosh/i.test(ua) && signals.maxTouchPoints > 1) return "mobile";
  const shortSide = Math.min(signals.screenWidth, signals.screenHeight);
  if (signals.coarsePointer && shortSide > 0 && shortSide <= 900) return "mobile";
  return "desktop";
}

export function readDeviceSignals(): DeviceSignals {
  if (typeof window === "undefined") {
    return {
      userAgent: "",
      maxTouchPoints: 0,
      coarsePointer: false,
      screenWidth: 1280,
      screenHeight: 800,
    };
  }
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  return {
    userAgent: nav.userAgent ?? "",
    maxTouchPoints: nav.maxTouchPoints ?? 0,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    screenWidth: window.screen?.width ?? 0,
    screenHeight: window.screen?.height ?? 0,
    userAgentMobile: nav.userAgentData?.mobile,
  };
}

export function lensForDevice(device: DeviceClass): LensModel {
  return device === "mobile" ? MOBILE_LENS : DESKTOP_LENS;
}

export function cameraProfileNote(device: DeviceClass): string {
  if (device === "mobile") {
    return "Phone camera. Radial lens distortion can be reduced. Perspective from a close selfie cannot. Step back to about 4–5 ft (1.2–1.5 m) and crop instead of holding the phone near your face.";
  }
  return "Desk camera. A light radial correction is applied. It does not replace a standardized camera distance.";
}

/** Constraints follow the device and how it is held, without requiring an exact size. */
export function cameraVideoConstraints(device: DeviceClass, portrait: boolean): MediaTrackConstraints {
  if (device === "mobile" && portrait) {
    return {
      facingMode: { ideal: "user" },
      width: { ideal: 1080 },
      height: { ideal: 1440 },
      aspectRatio: { ideal: 3 / 4 },
    };
  }
  if (device === "mobile") {
    return {
      facingMode: { ideal: "user" },
      width: { ideal: 1440 },
      height: { ideal: 1080 },
      aspectRatio: { ideal: 4 / 3 },
    };
  }
  return {
    facingMode: { ideal: "user" },
    width: { ideal: 1280 },
    height: { ideal: 960 },
    aspectRatio: { ideal: 4 / 3 },
  };
}

/**
 * The stage matches the camera buffer and stays within the viewport.
 * A mismatched box with `object-fit: fill` is what stretches a phone preview.
 */
export function previewFrameStyle(width: number, height: number): { aspectRatio: string; width: string } {
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  return {
    aspectRatio: `${safeW} / ${safeH}`,
    width: `min(100%, calc(max(12rem, 100dvh - 15rem) * ${safeW} / ${safeH}))`,
  };
}

export function focalLengthPixels(width: number, height: number, longEdgeFov: number): number {
  const edge = Math.max(width, height, 1);
  const half = (Math.min(120, Math.max(20, longEdgeFov)) * Math.PI) / 360;
  const tan = Math.tan(half);
  if (!Number.isFinite(tan) || tan < 1e-4) return edge;
  return edge / 2 / tan;
}

/** Ideal normalized point to the distorted camera image. */
export function distortNormalizedPoint(
  x: number,
  y: number,
  width: number,
  height: number,
  lens: LensModel,
): { x: number; y: number } {
  const f = focalLengthPixels(width, height, lens.longEdgeFov);
  const xu = (x * width - width / 2) / f;
  const yu = (y * height - height / 2) / f;
  const ru2 = xu * xu + yu * yu;
  const scale = 1 + lens.k1 * ru2 + lens.k2 * ru2 * ru2;
  return {
    x: (width / 2 + xu * scale * f) / width,
    y: (height / 2 + yu * scale * f) / height,
  };
}

/** Distorted camera point back to an ideal pinhole image. */
export function undistortNormalizedPoint(
  x: number,
  y: number,
  width: number,
  height: number,
  lens: LensModel,
): { x: number; y: number } {
  const f = focalLengthPixels(width, height, lens.longEdgeFov);
  const xd = (x * width - width / 2) / f;
  const yd = (y * height - height / 2) / f;
  const rd = Math.hypot(xd, yd);
  if (rd < 1e-8) return { x, y };
  let ru = rd;
  for (let i = 0; i < 8; i += 1) {
    const r2 = ru * ru;
    const scale = 1 + lens.k1 * r2 + lens.k2 * r2 * r2;
    if (scale < 0.05) break;
    ru = rd / scale;
  }
  const gain = ru / rd;
  return {
    x: (width / 2 + xd * gain * f) / width,
    y: (height / 2 + yd * gain * f) / height,
  };
}

export function undistortLandmarks(
  raw: RawFaceLandmark[],
  frame: { width: number; height: number },
  lens: LensModel,
): RawFaceLandmark[] {
  if (frame.width <= 1 || frame.height <= 1) return raw;
  if (Math.abs(lens.k1) < 1e-8 && Math.abs(lens.k2) < 1e-8) return raw;
  return raw.map((point) => {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return point;
    const next = undistortNormalizedPoint(point.x, point.y, frame.width, frame.height, lens);
    return { ...point, x: next.x, y: next.y };
  });
}

/** Pull barrel distortion out of a captured frame so landmarks are measured on a straighter image. */
export function undistortRaster(source: Raster, lens: LensModel): Raster {
  const { width, height, data } = source;
  if (width < 2 || height < 2 || (Math.abs(lens.k1) < 1e-8 && Math.abs(lens.k2) < 1e-8)) {
    return { width, height, data: new Uint8ClampedArray(data) };
  }
  const out = new Uint8ClampedArray(data.length);
  const f = focalLengthPixels(width, height, lens.longEdgeFov);
  const cx = width / 2;
  const cy = height / 2;
  const { k1, k2 } = lens;
  const maxX = width - 1;
  const maxY = height - 1;
  for (let y = 0; y < height; y += 1) {
    const yu = (y - cy) / f;
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      const xu = (x - cx) / f;
      const ru2 = xu * xu + yu * yu;
      let scale = 1 + k1 * ru2 + k2 * ru2 * ru2;
      if (scale < 0.05) scale = 0.05;
      let sx = cx + xu * scale * f;
      let sy = cy + yu * scale * f;
      if (sx < 0) sx = 0;
      else if (sx > maxX) sx = maxX;
      if (sy < 0) sy = 0;
      else if (sy > maxY) sy = maxY;
      const x0 = sx | 0;
      const y0 = sy | 0;
      const x1 = x0 < maxX ? x0 + 1 : maxX;
      const y1 = y0 < maxY ? y0 + 1 : maxY;
      const tx = sx - x0;
      const ty = sy - y0;
      const w00 = (1 - tx) * (1 - ty);
      const w10 = tx * (1 - ty);
      const w01 = (1 - tx) * ty;
      const w11 = tx * ty;
      const i00 = (y0 * width + x0) * 4;
      const i10 = (y0 * width + x1) * 4;
      const i01 = (y1 * width + x0) * 4;
      const i11 = (y1 * width + x1) * 4;
      const o = (row + x) * 4;
      out[o] = data[i00] * w00 + data[i10] * w10 + data[i01] * w01 + data[i11] * w11;
      out[o + 1] = data[i00 + 1] * w00 + data[i10 + 1] * w10 + data[i01 + 1] * w01 + data[i11 + 1] * w11;
      out[o + 2] = data[i00 + 2] * w00 + data[i10 + 2] * w10 + data[i01 + 2] * w01 + data[i11 + 2] * w11;
      out[o + 3] = 255;
    }
  }
  return { width, height, data: out };
}
