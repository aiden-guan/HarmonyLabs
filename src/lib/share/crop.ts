export interface CropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export interface CropLandmark {
  x: number;
  y: number;
}

/**
 * Calculates a cover-crop rectangle for mapping an image of dimensions (sourceWidth, sourceHeight)
 * to fill a destination rectangle (destWidth, destHeight) without distortion or stretching.
 *
 * If landmarks are provided, vertical centering dynamically centers around the face bounding box
 * and guarantees that chin and facial contours are not prematurely clipped.
 *
 * @param sourceWidth Width of source image
 * @param sourceHeight Height of source image
 * @param destWidth Target width
 * @param destHeight Target height
 * @param focusY Vertical center bias between 0 (top) and 1 (bottom). Defaults to 0.4 (upper-center for faces).
 * @param landmarks Optional normalized landmark coordinates (0 to 1) to anchor the face vertically.
 * @param focusX Horizontal center bias between 0 (left) and 1 (right). Defaults to 0.5 (center).
 */
export function calculateCoverCrop(
  sourceWidth: number,
  sourceHeight: number,
  destWidth: number,
  destHeight: number,
  focusY = 0.4,
  landmarks?: CropLandmark[],
  focusX = 0.5,
): CropRect {
  if (sourceWidth <= 0 || sourceHeight <= 0 || destWidth <= 0 || destHeight <= 0) {
    return { sx: 0, sy: 0, sw: Math.max(1, sourceWidth), sh: Math.max(1, sourceHeight) };
  }

  const targetAspect = destWidth / destHeight;
  const sourceAspect = sourceWidth / sourceHeight;

  let sw = sourceWidth;
  let sh = sourceHeight;
  let sx = 0;
  let sy = 0;

  if (sourceAspect > targetAspect) {
    // Source is wider than target: crop horizontal edges
    sw = sourceHeight * targetAspect;
    const remainingX = Math.max(0, sourceWidth - sw);
    sx = remainingX * Math.max(0, Math.min(1, focusX));
  } else {
    // Source is taller than target: crop vertical edges
    sh = sourceWidth / targetAspect;
    const remainingY = Math.max(0, sourceHeight - sh);

    const validLandmarks = (landmarks ?? []).filter(
      (p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1,
    );

    if (validLandmarks.length > 0) {
      // Landmark-aware crop: compute actual face vertical extents in pixels
      const ys = validLandmarks.map((p) => p.y * sourceHeight);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const faceCenterY = (minY + maxY) / 2;

      // Position the face center slightly above the vertical midpoint of the cropped region (44%)
      let targetSy = faceCenterY - sh * 0.44;

      // Keep face features contained if crop window is tall enough
      const faceHeight = maxY - minY;
      if (sh >= faceHeight) {
        if (targetSy + sh < maxY) targetSy = maxY - sh;
        if (targetSy > minY) targetSy = minY;
      }

      sy = Math.max(0, Math.min(remainingY, targetSy));
    } else {
      // Fallback focusY bias
      sy = Math.max(0, Math.min(remainingY, remainingY * focusY));
    }
  }

  return {
    sx: Math.round(sx),
    sy: Math.round(sy),
    sw: Math.round(sw),
    sh: Math.round(sh),
  };
}
