/**
 * Descriptive repeatability statistics for repeated captures.
 * These functions do not invent a clinical error. They summarize the samples
 * they are given. Use them once real repeated photographs exist.
 */
export interface RepeatabilitySummary {
  n: number;
  mean: number;
  /** Sample standard deviation (n − 1). Zero when n < 2. */
  sd: number;
  /** Median absolute deviation from the sample median. */
  mad: number;
  /** sd / |mean|. Null when the mean is 0. */
  cv: number | null;
  /** Mean absolute deviation from the mean. */
  absoluteRepeatabilityError: number;
}

function finite(values: number[]): number[] {
  return values.filter((value) => Number.isFinite(value));
}

function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return Number.NaN;
  const mid = Math.floor(n / 2);
  return n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function summarizeRepeats(values: number[]): RepeatabilitySummary | null {
  const xs = finite(values);
  const n = xs.length;
  if (n === 0) return null;
  const mean = xs.reduce((sum, value) => sum + value, 0) / n;
  const variance = n > 1 ? xs.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (n - 1) : 0;
  const sd = Math.sqrt(variance);
  const ordered = [...xs].sort((a, b) => a - b);
  const center = median(ordered);
  const deviations = xs.map((value) => Math.abs(value - center)).sort((a, b) => a - b);
  return {
    n,
    mean,
    sd,
    mad: median(deviations),
    cv: mean === 0 ? null : sd / Math.abs(mean),
    absoluteRepeatabilityError: xs.reduce((sum, value) => sum + Math.abs(value - mean), 0) / n,
  };
}

/**
 * Balanced one-way ICC(1). Returns null unless every group has the same
 * number of repeats and there are at least two groups. Identical groups
 * return 1. This is a statistic of the supplied repeats, not a published
 * reliability coefficient for MogLabs.
 */
export function iccOneWay(groups: number[][]): number | null {
  const clean = groups.map((group) => finite(group)).filter((group) => group.length >= 2);
  if (clean.length < 2) return null;
  const k = clean[0].length;
  if (clean.some((group) => group.length !== k)) return null;
  const n = clean.length;
  const means = clean.map((group) => group.reduce((sum, value) => sum + value, 0) / k);
  const grand = means.reduce((sum, value) => sum + value, 0) / n;
  const bms = (k * means.reduce((sum, value) => sum + (value - grand) ** 2, 0)) / (n - 1);
  let within = 0;
  for (let index = 0; index < n; index += 1) {
    for (const value of clean[index]) within += (value - means[index]) ** 2;
  }
  const wms = within / (n * (k - 1));
  const denom = bms + (k - 1) * wms;
  if (denom === 0) return 1;
  const icc = (bms - wms) / denom;
  return Number.isFinite(icc) ? icc : null;
}
