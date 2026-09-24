import { measurementConfidence } from "@/lib/face/quality";
import { runMeasurementPipeline, type CaptureScoringContext } from "@/lib/face/pipeline";
import {
  LANDMARK_MODEL_VERSION,
  METRIC_DEFINITION_VERSION,
  REFERENCE_DATA_VERSION,
  SCORING_VERSION,
} from "@/lib/face/versions";
import type { ResultSaveInput, StoredMetric } from "@/lib/data/model";
import type { FaceView, PhotoQuality, SemanticLandmark, SemanticLandmarkMap } from "@/types/face";

type QualityWithView = PhotoQuality & { view?: FaceView };

function toMap(landmarks: SemanticLandmark[]): SemanticLandmarkMap {
  const map: SemanticLandmarkMap = {};
  for (const landmark of landmarks) map[landmark.key] = landmark;
  return map;
}

export function completeAnalysis(input: {
  front: SemanticLandmark[];
  profile: SemanticLandmark[];
  qualities: QualityWithView[];
  capture?: CaptureScoringContext;
}): ResultSaveInput {
  const frontPhoto = input.qualities.find((quality) => quality.view === "front");
  const profilePhoto = input.qualities.find((quality) => quality.view === "profile");
  const report = runMeasurementPipeline({
    front: toMap(input.front),
    profile: toMap(input.profile),
    capture: {
      presentation: input.capture?.presentation,
      adultAcknowledged: input.capture?.adultAcknowledged,
      distanceProtocol: input.capture?.distanceProtocol ?? frontPhoto?.distanceProtocol,
      frontGrade: frontPhoto?.captureGrade,
      profileGrade: profilePhoto?.captureGrade,
      perspectiveRisk: Boolean(frontPhoto?.perspectiveRisk || profilePhoto?.perspectiveRisk),
    },
  });
  const metrics: StoredMetric[] = report.metrics.map((metric) => ({
    metricId: metric.id,
    value: metric.value,
    score: metric.score,
    impact: metric.impact,
    referenceMin: metric.referenceMin,
    referenceMax: metric.referenceMax,
    unit: metric.unit,
    category: metric.category,
    view: metric.view,
    evidenceTier: metric.evidenceTier,
    evidenceLabel: metric.evidenceLabel,
    scoreEligible: metric.scoreEligible,
    measurementConfidence: metric.measurementConfidence,
    contribution: metric.impact,
  }));
  const notes = [
    ...new Set(
      input.qualities.flatMap((quality) => [...quality.warnings, ...(quality.notes ?? [])]),
    ),
  ];
  if (report.partial) {
    notes.push("One photograph did not produce a full set of measurements, so Harmony uses the available view.");
  }
  if (report.availableCount < 20) {
    notes.push("Several measurements could not be calculated. Check the landmark placement.");
  }
  const failed = report.harmony === null;
  return {
    status: failed ? "failed" : "complete",
    harmonyScore: report.harmony,
    frontScore: report.front,
    profileScore: report.profile,
    categoryScores: report.categories,
    qualityNotes: notes,
    confidence: failed ? null : measurementConfidence(input.qualities),
    metrics,
    errorMessage: failed
      ? report.adultScoringWithheld
        ? "Harmony scoring is withheld until the analysis is confirmed as an adult."
        : "The landmarks did not produce a Harmony score."
      : null,
    scoringVersion: SCORING_VERSION,
    metricDefinitionVersion: METRIC_DEFINITION_VERSION,
    referenceDataVersion: REFERENCE_DATA_VERSION,
    landmarkModelVersion: LANDMARK_MODEL_VERSION,
    presentationProfile: report.presentation,
    adultAcknowledged: input.capture?.adultAcknowledged ?? true,
    distanceProtocol: input.capture?.distanceProtocol ?? frontPhoto?.distanceProtocol ?? null,
  };
}
