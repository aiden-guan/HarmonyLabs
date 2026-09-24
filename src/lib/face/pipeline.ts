import { calculateMetrics, METRICS } from "@/lib/face/metrics";
import { buildReport, type HarmonyReport, type ScoreInput } from "@/lib/face/scoring/aggregate";
import { landmarkMeasurementFactor } from "@/lib/face/scoring/landmark-confidence";
import { evidenceBadge, resolveEvidence } from "@/lib/face/scoring/resolve-evidence";
import { scoreAgainstModel } from "@/lib/face/scoring/score-metric";
import { EVIDENCE_LEVEL_WEIGHT, EVIDENCE_TIER_WEIGHT } from "@/lib/face/scoring/weights";
import type { CaptureGrade } from "@/types/face";
import type { SemanticLandmarkMap } from "@/types/face";
import type { DistanceProtocol, PresentationProfile } from "@/lib/face/versions";

export interface CaptureScoringContext {
  presentation?: PresentationProfile;
  adultAcknowledged?: boolean;
  distanceProtocol?: DistanceProtocol;
  frontGrade?: CaptureGrade;
  profileGrade?: CaptureGrade;
  perspectiveRisk?: boolean;
}

export interface MeasurementPipelineResult extends HarmonyReport {
  availableCount: number;
  missingCount: number;
  adultScoringWithheld: boolean;
  presentation: PresentationProfile;
}

function gradeFactor(grade: CaptureGrade | undefined): number {
  if (grade === "measurement-grade") return 1;
  if (grade === "good") return 0.85;
  if (grade === "limited") return 0.55;
  return 0.9;
}

function captureFactor(evidencePerspective: boolean, view: "front" | "profile", context: CaptureScoringContext): number {
  const grade = view === "front" ? context.frontGrade : context.profileGrade;
  let factor = gradeFactor(grade);
  if (!evidencePerspective) return factor;
  if (context.perspectiveRisk) factor *= 0.72;
  else if (context.distanceProtocol === "not-followed") factor *= 0.8;
  return factor;
}

export function runMeasurementPipeline(input: {
  front: SemanticLandmarkMap;
  profile: SemanticLandmarkMap;
  capture?: CaptureScoringContext;
}): MeasurementPipelineResult {
  const capture = input.capture ?? {};
  const presentation = capture.presentation ?? "neutral";
  const adult = capture.adultAcknowledged !== false;
  const calculated = calculateMetrics(input);
  const inputs: ScoreInput[] = calculated.map((item) => {
    const definition = METRICS.find((metric) => metric.id === item.id);
    if (!definition) throw new Error(`Unknown metric ${item.id}`);
    const resolved = resolveEvidence(definition.evidence, presentation);
    const bands = resolved.bands;
    const landmarks = landmarkMeasurementFactor(
      definition.view === "front" ? input.front : input.profile,
      definition.requiredLandmarks,
    );
    const captureWeight = captureFactor(definition.evidence.perspectiveSensitive, definition.view, capture);
    const measurementConfidence =
      item.value === null
        ? null
        : definition.evidence.measurementReliability * landmarks.factor * captureWeight;
    const reliabilityFactor =
      definition.evidence.measurementReliability *
      resolved.formulaCompatibility *
      landmarks.factor *
      captureWeight *
      EVIDENCE_LEVEL_WEIGHT[definition.evidence.evidenceLevel];
    const eligible = definition.evidence.scoreEligible && adult && item.value !== null;
    const influence = eligible ? EVIDENCE_TIER_WEIGHT[definition.evidence.evidenceTier] * reliabilityFactor : 0;
    const score =
      !eligible || item.value === null
        ? null
        : scoreAgainstModel(item.value, {
            shape: definition.evidence.scoringShape,
            bands,
            uncertainty: definition.evidence.uncertainty,
          });
    return {
      id: definition.id,
      label: definition.label,
      category: definition.category,
      view: definition.view,
      unit: definition.unit,
      value: item.value,
      score,
      weight: influence,
      referenceMin: bands.harmoniousRange.min,
      referenceMax: bands.harmoniousRange.max,
      explanation: definition.explanation,
      formula: definition.formula,
      normalization: definition.normalization,
      overlay: definition.overlay,
      featureGroup: definition.featureGroup,
      evidenceTier: definition.evidence.evidenceTier,
      scoreEligible: definition.evidence.scoreEligible && adult,
      influence,
      reliabilityFactor,
      measurementConfidence,
      evidenceLabel: evidenceBadge(definition.evidence),
      scoreCeiling: definition.evidence.scoringShape === "extremeness" ? 9.5 : 10,
    };
  });
  const report = buildReport(inputs);
  const availableCount = inputs.filter((item) => item.value !== null).length;
  return {
    ...report,
    harmony: adult ? report.harmony : null,
    front: adult ? report.front : null,
    profile: adult ? report.profile : null,
    availableCount,
    missingCount: inputs.length - availableCount,
    adultScoringWithheld: !adult,
    presentation,
  };
}
