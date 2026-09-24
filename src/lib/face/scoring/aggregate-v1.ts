import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/types/face";
import type { FaceView, MetricCategory, MetricOverlay, MetricUnit } from "@/types/face";

export interface ScoreInputV1 {
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

export interface HarmonyReportV1 {
  harmony: number | null;
  front: number | null;
  profile: number | null;
  partial: boolean;
  categories: Array<{ category: MetricCategory; label: string; score: number | null }>;
  metrics: Array<ScoreInputV1 & { impact: number | null }>;
  strengths: Array<ScoreInputV1 & { impact: number | null }>;
  deviations: Array<ScoreInputV1 & { impact: number | null }>;
  impacts: Array<ScoreInputV1 & { impact: number | null }>;
}

/** Fixed view mix used only to reproduce Harmony V1. */
export const HARMONY_VIEW_WEIGHTS_V1 = {
  front: 0.62,
  profile: 0.38,
} as const;

function weightedAverage(items: Array<{ score: number | null; weight: number }>): number | null {
  let weightSum = 0;
  let valueSum = 0;
  for (const item of items) {
    if (item.score === null || !Number.isFinite(item.score) || item.weight <= 0) continue;
    weightSum += item.weight;
    valueSum += item.score * item.weight;
  }
  if (weightSum <= 0) return null;
  const average = valueSum / weightSum;
  return Number.isFinite(average) ? average : null;
}

function viewScore(metrics: ScoreInputV1[], view: FaceView): number | null {
  return weightedAverage(
    metrics.filter((metric) => metric.view === view).map((metric) => ({
      score: metric.score,
      weight: metric.weight,
    })),
  );
}

export function combineHarmonyV1(
  front: number | null,
  profile: number | null,
): { harmony: number | null; partial: boolean } {
  if (front === null && profile === null) return { harmony: null, partial: false };
  if (front === null) return { harmony: profile, partial: true };
  if (profile === null) return { harmony: front, partial: true };
  const { front: frontWeight, profile: profileWeight } = HARMONY_VIEW_WEIGHTS_V1;
  const harmony = (front * frontWeight + profile * profileWeight) / (frontWeight + profileWeight);
  return { harmony: Number.isFinite(harmony) ? harmony : null, partial: false };
}

function harmonyFrom(metrics: ScoreInputV1[]) {
  const front = viewScore(metrics, "front");
  const profile = viewScore(metrics, "profile");
  return { front, profile, ...combineHarmonyV1(front, profile) };
}

export function buildReportV1(metrics: ScoreInputV1[]): HarmonyReportV1 {
  const base = harmonyFrom(metrics).harmony;
  const scored = metrics.map((metric) => {
    if (base === null || metric.score === null || metric.score >= 9.995) return { ...metric, impact: metric.score === null ? null : 0 };
    const next = harmonyFrom(metrics.map((item) => (item.id === metric.id ? { ...item, score: 10 } : item))).harmony;
    return { ...metric, impact: next === null ? null : next - base };
  });
  const summary = harmonyFrom(scored);
  const ranked = scored.filter((metric) => metric.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return {
    ...summary,
    categories: CATEGORY_ORDER.map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      score: weightedAverage(
        scored.filter((metric) => metric.category === category).map((metric) => ({
          score: metric.score,
          weight: metric.weight,
        })),
      ),
    })),
    metrics: scored,
    strengths: ranked.filter((metric) => (metric.score ?? 0) >= 8).slice(0, 3),
    deviations: [...ranked].reverse().filter((metric) => (metric.score ?? 10) < 9.95).slice(0, 3),
    impacts: [...scored].filter((metric) => (metric.impact ?? 0) > 0.005).sort((a, b) => (b.impact ?? 0) - (a.impact ?? 0)).slice(0, 5),
  };
}
