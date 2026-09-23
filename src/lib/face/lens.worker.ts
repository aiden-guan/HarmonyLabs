import { undistortRaster, type LensModel } from "./camera-optics";

const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage: (message: unknown) => void;
};

interface LensRequest {
  id: number;
  bitmap: ImageBitmap;
  width: number;
  height: number;
  lens: LensModel;
}

scope.onmessage = (event: MessageEvent<LensRequest>) => {
  const { id, bitmap, width, height, lens } = event.data;
  void correct(id, bitmap, width, height, lens);
};

async function correct(id: number, bitmap: ImageBitmap, width: number, height: number, lens: LensModel) {
  try {
    if (typeof OffscreenCanvas === "undefined") {
      throw new Error("Lens correction is unavailable in this browser.");
    }
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Could not correct the photo.");
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const pixels = context.getImageData(0, 0, width, height);
    const corrected = undistortRaster({ width, height, data: pixels.data }, lens);
    const copy = new Uint8ClampedArray(corrected.data.length);
    copy.set(corrected.data);
    context.putImageData(new ImageData(copy, width, height), 0, 0);
    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.92 });
    scope.postMessage({ id, ok: true, blob });
  } catch (error) {
    try {
      bitmap.close();
    } catch {
      // Already released.
    }
    scope.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : "Could not correct the photo.",
    });
  }
}
