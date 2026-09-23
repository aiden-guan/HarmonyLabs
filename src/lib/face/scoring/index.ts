export {
  buildReport,
  categoryScores,
  combineHarmony,
  harmonyFromMetrics,
  viewScore,
  weightedAverage,
  withImpacts,
  HARMONY_VIEW_WEIGHTS,
} from "@/lib/face/scoring/aggregate";
export type {
  CategoryScore,
  HarmonyReport,
  ScoreInput,
  ScoredMetric,
} from "@/lib/face/scoring/aggregate";
export { scoreMetric } from "@/lib/face/scoring/score-metric";
export { referenceRanges } from "@/lib/face/scoring/reference-ranges";
export { scoreModules } from "@/lib/face/scoring/modules";
