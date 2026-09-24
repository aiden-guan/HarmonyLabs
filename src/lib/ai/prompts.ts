import type { AnalysisDetail, StoredMetric } from "@/lib/data/model";
import { CATEGORY_LABELS } from "@/types/face";
import type { MetricCategory } from "@/types/face";

export interface AnalysisContext {
  analysis: {
    name: string;
    harmony: number | null;
    frontScore: number | null;
    profileScore: number | null;
    confidence: AnalysisDetail["confidence"];
    isSample: boolean;
    createdAt: string;
  };
  categories: Array<{ label: string; score: number | null }>;
  metrics: Array<{
    id: string;
    label: string;
    value: number | null;
    score: number | null;
    unit: StoredMetric["unit"];
    referenceMin: number;
    referenceMax: number;
    impact: number | null;
    view: StoredMetric["view"];
    category: string;
  }>;
  qualityWarnings: string[];
  previous: {
    createdAt: string;
    harmony: number | null;
    frontScore: number | null;
    profileScore: number | null;
    changes: Array<{ label: string; previous: number | null; current: number | null }>;
  } | null;
}

export function buildAnalysisContext(
  current: AnalysisDetail,
  previous: AnalysisDetail | null,
  labels: Map<string, string>,
): AnalysisContext {
  const metrics = current.metrics.map((metric) => ({
    id: metric.metricId,
    label: labels.get(metric.metricId) ?? metric.metricId,
    value: metric.value,
    score: metric.score,
    unit: metric.unit,
    referenceMin: metric.referenceMin,
    referenceMax: metric.referenceMax,
    impact: metric.impact,
    view: metric.view,
    category: CATEGORY_LABELS[metric.category as MetricCategory] ?? metric.category,
  }));
  return {
    analysis: {
      name: current.name,
      harmony: current.harmonyScore,
      frontScore: current.frontScore,
      profileScore: current.profileScore,
      confidence: current.confidence,
      isSample: current.isSample,
      createdAt: current.createdAt,
    },
    categories: current.categoryScores.map((category) => ({
      label: category.label,
      score: category.score,
    })),
    metrics,
    qualityWarnings: current.qualityNotes,
    previous: previous
      ? {
          createdAt: previous.createdAt,
          harmony: previous.harmonyScore,
          frontScore: previous.frontScore,
          profileScore: previous.profileScore,
          changes: metrics
            .map((metric) => {
              const before = previous.metrics.find((item) => item.metricId === metric.id);
              return {
                label: metric.label,
                previous: before?.score ?? null,
                current: metric.score,
              };
            })
            .filter((change) => change.previous !== null && change.current !== null)
            .sort((a, b) => Math.abs((b.current ?? 0) - (b.previous ?? 0)) - Math.abs((a.current ?? 0) - (a.previous ?? 0)))
            .slice(0, 8),
        }
      : null,
  };
}

export const AI_SYSTEM_PROMPT = `You are the HarmonyLabs measurement assistant. You explain a facial-geometry report that was already calculated.

Rules:
- Use only the numbers in the supplied JSON. If a value is missing, say so.
- Never invent measurements, landmarks, reference ranges, or scores.
- Distinguish a measured value from an interpretation of that value.
- Proportional Harmony is an application score against configurable geometric reference ranges. It is not an objective measure of attractiveness or health.
- Do not make medical, surgical, or diagnostic claims.
- Mention photographic limits when quality warnings are present: perspective, pose, lighting, and landmark placement can move a result.
- Do not ask for or describe the photograph. You cannot see it.
- Be concise and technically useful. Prefer short paragraphs and concrete metric names.`;
