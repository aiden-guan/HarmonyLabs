import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/types/face";
import type {
  FaceView,
  MetricCategory,
  MetricOverlay,
  MetricUnit,
} from "@/types/face";

export interface ScoreInput {
  id: string;
  label: string;
  category: MetricCategory;
  view: FaceView;
  unit: MetricUnit;
  value: number | null;
  score: number | null;
  weight: number;
  referenceMin: number;
  referenceMax: number;
  explanation: string;
  formula: string;
  normalization: string;
  overlay: MetricOverlay;
}

export interface CategoryScore {
  category: MetricCategory;
  label: string;
  score: number | null;
}

export interface ScoredMetric extends ScoreInput {
  impact: number | null;
}

export interface HarmonyReport {
  harmony: number | null;
  front: number | null;
  profile: number | null;
  partial: boolean;
  categories: CategoryScore[];
  metrics: ScoredMetric[];
  strengths: ScoredMetric[];
  deviations: ScoredMetric[];
  impacts: ScoredMetric[];
}

export const HARMONY_VIEW_WEIGHTS = {
  front: 0.62,
  profile: 0.38,
} as const;

export function weightedAverage(
  items: Array<{ score: number | null; weight: number }>,
): number | null {
  let weightSum = 0;
  let valueSum = 0;
  for (const item of items) {
    if (item.score === null || !Number.isFinite(item.score) || item.weight <= 0) {
      continue;
    }
    weightSum += item.weight;
    valueSum += item.score * item.weight;
  }
  if (weightSum <= 0) return null;
  const average = valueSum / weightSum;
  return Number.isFinite(average) ? average : null;
}

export function viewScore(metrics: ScoreInput[], view: FaceView): number | null {
  return weightedAverage(
    metrics.filter((metric) => metric.view === view).map((metric) => ({
      score: metric.score,
      weight: metric.weight,
    })),
  );
}

export function categoryScores(metrics: ScoreInput[]): CategoryScore[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    score: weightedAverage(
      metrics
        .filter((metric) => metric.category === category)
        .map((metric) => ({ score: metric.score, weight: metric.weight })),
    ),
  }));
}

/**
 * Front and profile scores are weighted averages of their metric scores.
 * Because a category score is the weighted average of its own metrics, combining
 * categories by the sum of their metric weights gives the same view score.
 * Harmony then mixes the two view scores. A missing view is reported as partial.
 */
export function combineHarmony(
  front: number | null,
  profile: number | null,
): { harmony: number | null; partial: boolean } {
  if (front === null && profile === null) return { harmony: null, partial: false };
  if (front === null) return { harmony: profile, partial: true };
  if (profile === null) return { harmony: front, partial: true };
  const { front: frontWeight, profile: profileWeight } = HARMONY_VIEW_WEIGHTS;
  const harmony =
    (front * frontWeight + profile * profileWeight) / (frontWeight + profileWeight);
  return { harmony: Number.isFinite(harmony) ? harmony : null, partial: false };
}

export function harmonyFromMetrics(metrics: ScoreInput[]): {
  harmony: number | null;
  front: number | null;
  profile: number | null;
  partial: boolean;
} {
  const front = viewScore(metrics, "front");
  const profile = viewScore(metrics, "profile");
  return { front, profile, ...combineHarmony(front, profile) };
}

export function withImpacts(metrics: ScoreInput[]): ScoredMetric[] {
  const base = harmonyFromMetrics(metrics).harmony;
  return metrics.map((metric) => {
    if (base === null || metric.score === null) {
      return { ...metric, impact: null };
    }
    if (metric.score >= 9.995) return { ...metric, impact: 0 };
    const hypothetical = metrics.map((item) =>
      item.id === metric.id ? { ...item, score: 10 } : item,
    );
    const next = harmonyFromMetrics(hypothetical).harmony;
    if (next === null) return { ...metric, impact: null };
    return { ...metric, impact: next - base };
  });
}

export function buildReport(metrics: ScoreInput[]): HarmonyReport {
  const scored = withImpacts(metrics);
  const summary = harmonyFromMetrics(scored);
  const ranked = scored
    .filter((metric) => metric.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const strengths = ranked.filter((metric) => (metric.score ?? 0) >= 8).slice(0, 3);
  const strengthList = strengths.length > 0 ? strengths : ranked.slice(0, 3);
  const deviations = [...ranked]
    .reverse()
    .filter((metric) => (metric.score ?? 10) < 9.95)
    .slice(0, 3);
  const impacts = [...scored]
    .filter((metric) => (metric.impact ?? 0) > 0.005)
    .sort((a, b) => (b.impact ?? 0) - (a.impact ?? 0))
    .slice(0, 5);

  return {
    ...summary,
    categories: categoryScores(scored),
    metrics: scored,
    strengths: strengthList,
    deviations,
    impacts,
  };
}
