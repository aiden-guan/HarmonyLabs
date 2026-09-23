import { describe, expect, it } from "vitest";
import {
  cameraVideoConstraints,
  detectDeviceClass,
  distortNormalizedPoint,
  lensForDevice,
  previewFrameStyle,
  undistortLandmarks,
  undistortNormalizedPoint,
  undistortRaster,
  type DeviceSignals,
} from "@/lib/face/camera-optics";
import type { RawFaceLandmark } from "@/types/face";

function signals(patch: Partial<DeviceSignals>): DeviceSignals {
  return {
    userAgent: "",
    maxTouchPoints: 0,
    coarsePointer: false,
    screenWidth: 1440,
    screenHeight: 900,
    ...patch,
  };
}

describe("device class", () => {
  it("treats phones, tablets, and small touch screens as mobile cameras", () => {
    expect(
      detectDeviceClass(
        signals({
          userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
        }),
      ),
    ).toBe("mobile");
    expect(
      detectDeviceClass(
        signals({
          userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
        }),
      ),
    ).toBe("mobile");
    expect(
      detectDeviceClass(
        signals({
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
          maxTouchPoints: 5,
        }),
      ),
    ).toBe("mobile");
    expect(detectDeviceClass(signals({ coarsePointer: true, screenWidth: 390, screenHeight: 844 }))).toBe("mobile");
    expect(detectDeviceClass(signals({ userAgentMobile: true, userAgent: "Mozilla/5.0" }))).toBe("mobile");
  });

  it("keeps a desk browser, including a large touch laptop, on the webcam profile", () => {
    expect(
      detectDeviceClass(
        signals({
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        }),
      ),
    ).toBe("desktop");
    expect(
      detectDeviceClass(
        signals({
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
          maxTouchPoints: 10,
          screenWidth: 1920,
          screenHeight: 1080,
        }),
      ),
    ).toBe("desktop");
  });
});

describe("camera fit", () => {
  it("asks a portrait phone for a tall frame and a desk camera for 4:3", () => {
    const phone = cameraVideoConstraints("mobile", true);
    const turned = cameraVideoConstraints("mobile", false);
    const desk = cameraVideoConstraints("desktop", true);
    expect(phone.aspectRatio).toEqual({ ideal: 3 / 4 });
    expect(phone.width).toEqual({ ideal: 1080 });
    expect(turned.height).toEqual({ ideal: 1080 });
    expect(desk.aspectRatio).toEqual({ ideal: 4 / 3 });
    expect(desk.width).toEqual({ ideal: 1280 });
  });

  it("sizes the preview from the buffer so the picture is not stretched into the box", () => {
    const portrait = previewFrameStyle(1080, 1440);
    expect(portrait.aspectRatio).toBe("1080 / 1440");
    expect(portrait.width).toContain("1080 / 1440");
    expect(previewFrameStyle(0, 0).aspectRatio).toBe("1 / 1");
  });
});

describe("lens correction", () => {
  const frame = { width: 1080, height: 1440 };
  const mobile = lensForDevice("mobile");
  const desktop = lensForDevice("desktop");

  it("pulls wide-angle points inward, and does so more on a phone than on a desk camera", () => {
    const observed = { x: 0.86, y: 0.5 };
    const phone = undistortNormalizedPoint(observed.x, observed.y, frame.width, frame.height, mobile);
    const desk = undistortNormalizedPoint(observed.x, observed.y, frame.width, frame.height, desktop);
    expect(phone.x).toBeLessThan(observed.x);
    expect(phone.x).toBeGreaterThan(0.5);
    expect(observed.x - phone.x).toBeGreaterThan(observed.x - desk.x);
    expect(undistortNormalizedPoint(0.5, 0.5, frame.width, frame.height, mobile)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("round-trips a distorted point back to the ideal image", () => {
    const ideal = { x: 0.72, y: 0.38 };
    const observed = distortNormalizedPoint(ideal.x, ideal.y, frame.width, frame.height, mobile);
    const back = undistortNormalizedPoint(observed.x, observed.y, frame.width, frame.height, mobile);
    expect(back.x).toBeCloseTo(ideal.x, 3);
    expect(back.y).toBeCloseTo(ideal.y, 3);
  });

  it("moves landmark x and y while leaving depth untouched", () => {
    const raw: RawFaceLandmark[] = [
      { x: 0.5, y: 0.5, z: 0.2 },
      { x: 0.9, y: 0.5, z: -0.4 },
    ];
    const next = undistortLandmarks(raw, frame, mobile);
    expect(next[0]?.x).toBeCloseTo(0.5, 5);
    expect(next[1]?.x).toBeLessThan(0.9);
    expect(next[1]?.z).toBe(-0.4);
    expect(undistortLandmarks(raw, { width: 0, height: 0 }, mobile)).toBe(raw);
  });

  it("copies a frame unchanged when the lens has no distortion", () => {
    const data = new Uint8ClampedArray(16);
    data[0] = 10;
    data[4] = 200;
    const source = { width: 2, height: 2, data };
    const copy = undistortRaster(source, { device: "desktop", longEdgeFov: 62, k1: 0, k2: 0 });
    expect(Array.from(copy.data)).toEqual(Array.from(data));
  });

  it("samples farther from the center so barrel distortion is pulled inward", () => {
    const width = 41;
    const height = 21;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        data[offset] = Math.round((x / (width - 1)) * 255);
        data[offset + 3] = 255;
      }
    }
    const corrected = undistortRaster({ width, height, data }, mobile);
    const y = 10;
    const right = (y * width + 34) * 4;
    const left = (y * width + 6) * 4;
    expect(corrected.data[right]).toBeGreaterThan(data[right]);
    expect(corrected.data[left]).toBeLessThan(data[left]);
  });
});
