export {
  buildReport,
  categoryScores,
  combineHarmony,
  harmonyFromMetrics,
  scoreFeatureGroups,
  viewScore,
  weightedAverage,
  withImpacts,
} from "@/lib/face/scoring/aggregate";
export { HARMONY_VIEW_WEIGHTS_V1 } from "@/lib/face/scoring/aggregate-v1";
export { scoreMetricV1 } from "@/lib/face/scoring/score-metric-v1";
export { scoreAgainstModel } from "@/lib/face/scoring/score-metric";
export type {
  CategoryScore,
  HarmonyReport,
  ScoreInput,
  ScoredMetric,
} from "@/lib/face/scoring/aggregate";
export { scoreMetric } from "@/lib/face/scoring/score-metric";
export { referenceRanges } from "@/lib/face/scoring/reference-ranges";
export { scoreModules } from "@/lib/face/scoring/modules";
