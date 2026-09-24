import { describe, expect, it } from "vitest";
import { METRICS } from "@/lib/face/metrics";
import { runMeasurementPipeline } from "@/lib/face/pipeline";
import { runMeasurementPipelineV1 } from "@/lib/face/pipeline-v1";
import { buildReport } from "@/lib/face/scoring/aggregate";
import { scoreAgainstModel, scoreMetric } from "@/lib/face/scoring/score-metric";
import { scoreMetricV1 } from "@/lib/face/scoring/score-metric-v1";
import { EVIDENCE_TIER_WEIGHT } from "@/lib/face/scoring/weights";
import type { ScoreInput } from "@/lib/face/scoring/aggregate";
import type { SemanticLandmarkKey, SemanticLandmarkMap } from "@/types/face";

function face(points: Partial<Record<SemanticLandmarkKey, [number, number]>>, confidence = 1): SemanticLandmarkMap {
  const map: SemanticLandmarkMap = {};
  for (const [key, value] of Object.entries(points) as Array<[SemanticLandmarkKey, [number, number]]>) {
    map[key] = { key, x: value[0], y: value[1], confidence, source: "manual" };
  }
  return map;
}

const front = face({
  foreheadApex: [0.5, 0.16],
  glabella: [0.5, 0.38],
  nasion: [0.5, 0.42],
  subnasale: [0.5, 0.62],
  menton: [0.5, 0.9],
  leftZygion: [0.15, 0.46],
  rightZygion: [0.85, 0.46],
  leftGonion: [0.24, 0.72],
  rightGonion: [0.76, 0.72],
  leftChinLateral: [0.4, 0.84],
  rightChinLateral: [0.6, 0.84],
  leftPupil: [0.36, 0.44],
  rightPupil: [0.64, 0.44],
  leftOuterCanthus: [0.3, 0.43],
  leftInnerCanthus: [0.43, 0.445],
  rightInnerCanthus: [0.57, 0.445],
  rightOuterCanthus: [0.7, 0.43],
  leftEyeTop: [0.36, 0.42],
  leftEyeBottom: [0.36, 0.47],
  rightEyeTop: [0.64, 0.42],
  rightEyeBottom: [0.64, 0.47],
  leftAlare: [0.43, 0.56],
  rightAlare: [0.57, 0.56],
  pronasale: [0.5, 0.54],
  labialeSuperius: [0.5, 0.66],
  stomion: [0.5, 0.69],
  labialeInferius: [0.5, 0.73],
  leftCheilion: [0.38, 0.7],
  rightCheilion: [0.62, 0.7],
  pogonion: [0.5, 0.86],
});

function blank(partial: Partial<ScoreInput> & Pick<ScoreInput, "id" | "score" | "featureGroup">): ScoreInput {
  return {
    label: partial.id,
    category: "eyes",
    view: "front",
    unit: "ratio",
    value: 1,
    weight: partial.influence ?? 1,
    referenceMin: 0,
    referenceMax: 1,
    explanation: "test",
    formula: "test",
    normalization: "test",
    overlay: { type: "line", points: [] },
    scoreEligible: true,
    evidenceTier: 1,
    influence: 1,
    reliabilityFactor: 1,
    ...partial,
  };
}

describe("Harmony V2 score shape", () => {
  it("peaks at a supported center and declines through the harmony range", () => {
    const model = {
      shape: "peaked-target" as const,
      bands: {
        aestheticTarget: { min: 100, max: 110, center: 105 },
        harmoniousRange: { min: 90, max: 120 },
        sigmaLow: 8,
        sigmaHigh: 8,
      },
    };
    const center = scoreAgainstModel(105, model);
    const targetEdge = scoreAgainstModel(100, model);
    const harmonyEdge = scoreAgainstModel(90, model);
    const outside = scoreAgainstModel(80, model);
    expect(center).toBe(10);
    expect(targetEdge).toBeGreaterThan(9);
    expect(targetEdge).toBeLessThan(10);
    expect(harmonyEdge).toBeCloseTo(7, 5);
    expect(outside).toBeLessThan(harmonyEdge ?? 0);
    const steps = [105, 102, 100, 95, 90, 85];
    const scores = steps.map((value) => scoreAgainstModel(value, model) ?? -1);
    for (let index = 1; index < scores.length; index += 1) {
      expect(scores[index]).toBeLessThanOrEqual(scores[index - 1] + 1e-9);
    }
  });

  it("does not give 10 to every value inside a broad range", () => {
    expect(scoreMetric(0.5, 0.2, 0.8, 0.1)).toBe(10);
    expect(scoreMetric(0.2, 0.2, 0.8, 0.1)).toBeCloseTo(7, 5);
    expect(scoreMetric(0.8, 0.2, 0.8, 0.1)).toBeCloseTo(7, 5);
  });

  it("keeps V1 plateau scoring available for stored analyses", () => {
    expect(scoreMetricV1(0.5, 0.4, 0.6, 0.1)).toBe(10);
    expect(scoreMetricV1(0.4, 0.4, 0.6, 0.1)).toBe(10);
    expect(scoreMetricV1(0.6, 0.4, 0.6, 0.1)).toBe(10);
  });

  it("stays finite and bounded", () => {
    const values = [-1000, -1, 0, 0.2, 0.5, 1, 50, 1e6];
    for (const value of values) {
      const score = scoreMetric(value, 0.4, 0.6, 0.1);
      if (score === null) continue;
      expect(Number.isFinite(score)).toBe(true);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    }
    expect(scoreAgainstModel(Number.POSITIVE_INFINITY, {
      shape: "flat-target",
      bands: { harmoniousRange: { min: 0, max: 1 }, sigmaLow: 1, sigmaHigh: 1 },
    })).toBeNull();
  });
});

describe("Harmony V2 aggregation", () => {
  it("gives unsupported metrics no Harmony influence", () => {
    const report = runMeasurementPipeline({ front, profile: {} });
    const informational = report.metrics.filter((metric) => metric.scoreEligible === false);
    expect(informational.length).toBeGreaterThan(0);
    for (const metric of informational) {
      expect(metric.score).toBeNull();
      expect(metric.influence).toBe(0);
      expect(metric.impact ?? 0).toBe(0);
    }
  });

  it("does not turn a missing measurement into a zero score", () => {
    const report = runMeasurementPipeline({ front: {}, profile: {} });
    expect(report.harmony).toBeNull();
    expect(report.metrics.every((metric) => metric.score === null || metric.value !== null)).toBe(true);
    expect(report.metrics.some((metric) => metric.value === null && metric.score !== 0)).toBe(true);
  });

  it("lowers influence when landmark confidence drops and leaves the metric score alone", () => {
    const high = runMeasurementPipeline({ front, profile: {} });
    const low = runMeasurementPipeline({
      front: face(
        Object.fromEntries(
          Object.entries(front).map(([key, landmark]) => [key, [landmark!.x, landmark!.y]]),
        ) as Partial<Record<SemanticLandmarkKey, [number, number]>>,
        0.2,
      ),
      profile: {},
    });
    const id = "eye-spacing-ratio";
    const a = high.metrics.find((metric) => metric.id === id);
    const b = low.metrics.find((metric) => metric.id === id);
    expect(a?.score).not.toBeNull();
    expect(b?.score).toBeCloseTo(a?.score ?? -1, 6);
    expect(b?.influence ?? 1).toBeLessThan(a?.influence ?? 0);
  });

  it("lets a low-confidence metric pull Harmony less than an equal-confidence metric", () => {
    const shared = { featureGroup: "eyeSpacing" as const, evidenceTier: 3 as const };
    const balanced = buildReport([
      blank({ id: "low-score", score: 4, influence: 1, ...shared }),
      blank({ id: "high-score", score: 10, influence: 1, ...shared }),
    ]);
    const downweighted = buildReport([
      blank({ id: "low-score", score: 4, influence: 1, reliabilityFactor: 1, ...shared }),
      blank({ id: "high-score", score: 10, influence: 0.15, reliabilityFactor: 0.15, ...shared }),
    ]);
    expect(balanced.harmony).toBeCloseTo(7, 5);
    expect(downweighted.harmony).toBeLessThan(balanced.harmony ?? 10);
    expect(downweighted.metrics.find((metric) => metric.id === "high-score")?.score).toBe(10);
  });

  it("does not let extra correlated metrics multiply a feature group's weight", () => {
    const one = buildReport([
      blank({ id: "only", score: 8, featureGroup: "jawBalance", evidenceTier: 3, influence: 1 }),
    ]);
    const many = buildReport([
      blank({ id: "a", score: 8, featureGroup: "jawBalance", evidenceTier: 3, influence: 1 }),
      blank({ id: "b", score: 8, featureGroup: "jawBalance", evidenceTier: 3, influence: 1 }),
      blank({ id: "c", score: 8, featureGroup: "jawBalance", evidenceTier: 3, influence: 1 }),
      blank({ id: "d", score: 8, featureGroup: "jawBalance", evidenceTier: 3, influence: 1 }),
    ]);
    const anchor = buildReport([
      blank({ id: "tier1", score: 6, featureGroup: "eyeSpacing", evidenceTier: 1, influence: 1 }),
    ]);
    expect(one.groups.find((group) => group.id === "jawBalance")?.weight).toBeCloseTo(
      many.groups.find((group) => group.id === "jawBalance")?.weight ?? -1,
      5,
    );
    expect(many.harmony).toBeCloseTo(one.harmony ?? -1, 5);
    expect(anchor.groups.find((group) => group.id === "eyeSpacing")?.weight ?? 0).toBeGreaterThan(
      many.groups.find((group) => group.id === "jawBalance")?.weight ?? 1,
    );
  });

  it("stops a pile of tier-3 metrics from outweighing one tier-1 metric", () => {
    const tier3 = (["oralProportions", "facialVerticals", "jawBalance", "nasalWidthBalance"] as const).map(
      (featureGroup, index) =>
        blank({
          id: `t3-${index}`,
          score: 10,
          featureGroup,
          evidenceTier: 3,
          influence: 5,
          reliabilityFactor: 1,
        }),
    );
    const report = buildReport([
      blank({
        id: "direct",
        score: 4,
        featureGroup: "eyeSpacing",
        evidenceTier: 1,
        influence: EVIDENCE_TIER_WEIGHT[1],
        reliabilityFactor: 1,
      }),
      ...tier3,
    ]);
    expect(report.harmony).toBeLessThan(8);
    const directShare = report.metrics.find((metric) => metric.id === "direct")?.contribution ?? 0;
    const tier3Share = report.metrics
      .filter((metric) => metric.id.startsWith("t3-"))
      .reduce((sum, metric) => sum + (metric.contribution ?? 0), 0);
    expect(directShare).toBeGreaterThan(tier3Share);
  });

  it("withholds adult scoring only when the acknowledgment is explicitly false", () => {
    const withheld = runMeasurementPipeline({ front, profile: {}, capture: { adultAcknowledged: false } });
    expect(withheld.harmony).toBeNull();
    expect(withheld.adultScoringWithheld).toBe(true);
    expect(withheld.metrics.every((metric) => metric.score === null)).toBe(true);
    const legacy = runMeasurementPipeline({ front, profile: {} });
    expect(legacy.adultScoringWithheld).toBe(false);
    expect(legacy.harmony).not.toBeNull();
  });

  it("is deterministic", () => {
    const first = runMeasurementPipeline({ front, profile: {} });
    const second = runMeasurementPipeline({ front, profile: {} });
    expect(first.harmony).toBe(second.harmony);
    expect(first.metrics.map((metric) => metric.score)).toEqual(second.metrics.map((metric) => metric.score));
  });

  it("keeps V1 and V2 version labels distinct", () => {
    const current = runMeasurementPipeline({ front, profile: {} });
    const previous = runMeasurementPipelineV1({ front, profile: {} });
    expect(current.scoringVersion).toBe("harmony-v2");
    expect(previous.scoringVersion).toBe("harmony-v1");
    expect(previous.harmony).not.toBe(current.harmony);
  });
});

describe("evidence integrity", () => {
  it("refuses score-eligible metrics without provenance", () => {
    const eligible = METRICS.filter((metric) => metric.evidence.scoreEligible);
    expect(eligible.length).toBeGreaterThan(0);
    for (const metric of eligible) {
      expect(metric.evidence.references.length).toBeGreaterThan(0);
      expect(metric.evidence.evidenceTier).not.toBe(4);
      expect(metric.evidence.evidenceType).not.toBe("unsupported");
      expect(metric.evidence.sourcePopulation.length).toBeGreaterThan(0);
      expect(metric.evidence.formulaCompatibilityNotes.length).toBeGreaterThan(0);
      expect(metric.evidence.limitations.length).toBeGreaterThan(0);
      expect(metric.evidence.accuracyBudget.length).toBeGreaterThan(0);
      expect(metric.evidence.measurementReliability).toBeGreaterThan(0);
      expect(metric.evidence.measurementReliability).toBeLessThanOrEqual(1);
      expect(EVIDENCE_TIER_WEIGHT[metric.evidence.evidenceTier]).toBeGreaterThan(0);
    }
    for (const metric of METRICS.filter((item) => !item.evidence.scoreEligible)) {
      expect(EVIDENCE_TIER_WEIGHT[metric.evidence.evidenceTier]).toBe(0);
      expect(metric.evidence.evidenceType).toBe("unsupported");
    }
  });
});
