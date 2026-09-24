import type { PresentationBands, ScoringShape } from "@/lib/face/scoring/evidence-types";

/** Inside an aesthetic target, away from the center. */
const TARGET_EDGE = 9.15;
/** Edge of a flat aesthetic interval that covers more than one supported value. */
const FLAT_EDGE = 9.5;
/** Edge of the broader harmony range when a target exists. */
const HARMONY_EDGE = 7;
/** Extremeness screen: high across the band, never a perfect peak at the mean. */
const EXTREME_CENTER = 9.5;
const EXTREME_EDGE = 9;

export interface ScoreModel {
  shape: ScoringShape;
  bands: PresentationBands;
  uncertainty?: number;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function finish(score: number): number | null {
  if (!Number.isFinite(score)) return null;
  return clamp(score, 0, 10);
}

function decay(edgeScore: number, distance: number, sigma: number): number | null {
  if (!(sigma > 0) || !Number.isFinite(distance)) return null;
  return finish(edgeScore * Math.exp(-(distance ** 2) / (2 * sigma ** 2)));
}

function bridge(value: number, fromEdge: number, toEdge: number, fromScore: number, toScore: number): number {
  const span = Math.abs(toEdge - fromEdge);
  if (span < 1e-9) return toScore;
  const t = Math.abs(value - fromEdge) / span;
  return lerp(fromScore, toScore, smoothstep(t));
}

function validBands(bands: PresentationBands): boolean {
  const harm = bands.harmoniousRange;
  if (!harm || !(harm.max >= harm.min)) return false;
  if (!(bands.sigmaLow > 0) || !(bands.sigmaHigh > 0)) return false;
  const target = bands.aestheticTarget;
  if (!target) return true;
  return target.max >= target.min && target.min >= harm.min - 1e-6 && target.max <= harm.max + 1e-6;
}

function scoreLower(value: number, model: ScoreModel): number | null {
  const harmMax = model.bands.harmoniousRange.max;
  const dead = Math.max(0, model.uncertainty ?? 0);
  const aestheticMax = model.bands.aestheticTarget?.max ?? dead;
  if (value <= dead) return 10;
  if (aestheticMax > dead && value <= aestheticMax) {
    return finish(bridge(value, dead, aestheticMax, 10, TARGET_EDGE));
  }
  const start = Math.max(dead, aestheticMax);
  if (value <= harmMax) {
    return finish(bridge(value, start, harmMax, start === dead ? 10 : TARGET_EDGE, HARMONY_EDGE));
  }
  return decay(HARMONY_EDGE, value - harmMax, model.bands.sigmaHigh);
}

function scoreExtremeness(value: number, model: ScoreModel): number | null {
  const harm = model.bands.harmoniousRange;
  const center = (harm.min + harm.max) / 2;
  if (value >= harm.min && value <= harm.max) {
    const edge = value < center ? harm.min : harm.max;
    const span = Math.abs(center - edge);
    if (span < 1e-9) return EXTREME_CENTER;
    const t = Math.abs(value - center) / span;
    return finish(lerp(EXTREME_CENTER, EXTREME_EDGE, smoothstep(t)));
  }
  const sigma = value < harm.min ? model.bands.sigmaLow : model.bands.sigmaHigh;
  const distance = value < harm.min ? harm.min - value : value - harm.max;
  return decay(EXTREME_EDGE, distance, sigma);
}

function scoreTarget(value: number, model: ScoreModel): number | null {
  const harm = model.bands.harmoniousRange;
  const target = model.bands.aestheticTarget;
  const flat = model.shape === "flat-target";
  const uncertainty = Math.max(0, model.uncertainty ?? 0);

  if (!target) {
    const center = (harm.min + harm.max) / 2;
    if (Math.abs(value - center) <= uncertainty) return 10;
    if (value >= harm.min && value <= harm.max) {
      const edge = value < center ? harm.min : harm.max;
      return finish(bridge(value, center, edge, 10, HARMONY_EDGE));
    }
    const sigma = value < harm.min ? model.bands.sigmaLow : model.bands.sigmaHigh;
    const distance = value < harm.min ? harm.min - value : value - harm.max;
    return decay(HARMONY_EDGE, distance, sigma);
  }

  const center = clamp(target.center ?? (target.min + target.max) / 2, target.min, target.max);
  if (!flat && Math.abs(value - center) <= uncertainty) return 10;

  if (value >= target.min && value <= target.max) {
    if (flat) {
      const half = Math.max(target.max - center, center - target.min, 1e-9);
      const t = Math.min(1, Math.abs(value - center) / half);
      return finish(FLAT_EDGE + (10 - FLAT_EDGE) * (1 - t ** 4));
    }
    const edge = value < center ? target.min : target.max;
    return finish(bridge(value, center, edge, 10, TARGET_EDGE));
  }

  if (value >= harm.min && value <= harm.max) {
    const inner = value < target.min ? target.min : target.max;
    const outer = value < target.min ? harm.min : harm.max;
    const from = flat ? FLAT_EDGE : TARGET_EDGE;
    return finish(bridge(value, inner, outer, from, HARMONY_EDGE));
  }

  const sigma = value < harm.min ? model.bands.sigmaLow : model.bands.sigmaHigh;
  const distance = value < harm.min ? harm.min - value : value - harm.max;
  return decay(HARMONY_EDGE, distance, sigma);
}

/**
 * Continuous 0–10 score against an aesthetic target and a wider harmony range.
 * The harmony range does not score 10. Evidence quality is not applied here.
 */
export function scoreAgainstModel(value: number, model: ScoreModel): number | null {
  if (!Number.isFinite(value) || !validBands(model.bands)) return null;
  if (model.shape === "lower-is-better") return scoreLower(value, model);
  if (model.shape === "extremeness") return scoreExtremeness(value, model);
  return scoreTarget(value, model);
}

/** @deprecated Positional V1 API. Prefer scoreAgainstModel. */
export function scoreMetric(value: number, low: number, high: number, sigma: number): number | null {
  return scoreAgainstModel(value, {
    shape: "peaked-target",
    bands: {
      aestheticTarget: { min: (low + high) / 2, max: (low + high) / 2, center: (low + high) / 2 },
      harmoniousRange: { min: low, max: high },
      sigmaLow: sigma,
      sigmaHigh: sigma,
    },
  });
}
