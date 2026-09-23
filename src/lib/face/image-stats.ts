export interface ImageStats {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** Laplacian variance on a grayscale buffer. Higher means sharper. */
export function laplacianVariance(image: ImageStats): number {
  const { width, height, data } = image;
  if (width < 3 || height < 3 || data.length < width * height * 4) return 0;
  const gray = new Float64Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const offset = i * 4;
    gray[i] = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
  }
  let sum = 0;
  let sumSquares = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const value =
        gray[index - width] +
        gray[index - 1] -
        4 * gray[index] +
        gray[index + 1] +
        gray[index + width];
      sum += value;
      sumSquares += value * value;
      count += 1;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;
  return Math.max(0, sumSquares / count - mean * mean);
}

/** Maps Laplacian variance to a 0–1 sharpness score. 1 is sharp. */
export function sharpnessScore(variance: number): number {
  if (!Number.isFinite(variance) || variance <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - Math.exp(-variance / 80)));
}

export function brightnessScore(image: ImageStats): number {
  const { data } = image;
  if (data.length < 4) return 0;
  let sum = 0;
  const pixels = Math.floor(data.length / 4);
  for (let i = 0; i < pixels; i += 1) {
    const offset = i * 4;
    sum += 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
  }
  return Math.max(0, Math.min(1, sum / pixels / 255));
}
