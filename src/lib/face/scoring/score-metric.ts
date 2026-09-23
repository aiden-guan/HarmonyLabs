/**
 * Score a measurement from 0 to 10.
 * Values inside [low, high] score 10. Outside the band, the score follows a
 * Gaussian of the distance past the nearest edge. Sigma is in the metric's units.
 */
export function scoreMetric(
  value: number,
  low: number,
  high: number,
  sigma: number,
): number | null {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(low) ||
    !Number.isFinite(high) ||
    !Number.isFinite(sigma)
  ) {
    return null;
  }
  if (sigma <= 0 || high < low) return null;
  if (value >= low && value <= high) return 10;
  const deviation = value < low ? low - value : value - high;
  const score = 10 * Math.exp(-(deviation ** 2) / (2 * sigma ** 2));
  if (!Number.isFinite(score)) return null;
  return Math.max(0, Math.min(10, score));
}
