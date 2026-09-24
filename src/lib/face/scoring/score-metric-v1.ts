/**
 * Harmony V1 score. Values inside [low, high] score 10.
 * Kept so stored V1 results can be reproduced. New analyses use scoreAgainstModel.
 */
export function scoreMetricV1(
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
