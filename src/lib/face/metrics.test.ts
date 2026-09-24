import { describe, expect, it } from "vitest";
import { METRICS, calculateMetrics } from "@/lib/face/metrics";
import { mapFrontLandmarks, mapProfileLandmarks, MP } from "@/lib/face/mediapipe-map";
import { runMeasurementPipeline } from "@/lib/face/pipeline";
import {
  buildReport,
  combineHarmony,
  weightedAverage,
} from "@/lib/face/scoring/aggregate";
import { scoreMetric } from "@/lib/face/scoring/score-metric";
import type { RawFaceLandmark, SemanticLandmarkKey, SemanticLandmarkMap } from "@/types/face";

function face(
  points: Partial<Record<SemanticLandmarkKey, [number, number]>>,
): SemanticLandmarkMap {
  const map: SemanticLandmarkMap = {};
  for (const [key, value] of Object.entries(points) as Array<
    [SemanticLandmarkKey, [number, number]]
  >) {
    map[key] = {
      key,
      x: value[0],
      y: value[1],
      confidence: 1,
      source: "manual",
    };
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

describe("metric catalog", () => {
  it("publishes a complete deterministic catalog", () => {
    expect(METRICS.length).toBeGreaterThanOrEqual(25);
    expect(METRICS.length).toBe(35);
    for (const metric of METRICS) {
      expect(metric.id).toMatch(/^[a-z0-9-]+$/);
      expect(metric.requiredLandmarks.length).toBeGreaterThan(0);
      expect(metric.formula.length).toBeGreaterThan(8);
      expect(metric.explanation.length).toBeGreaterThan(12);
      expect(["literature", "informational"]).toContain(metric.referenceRange.confidence);
      if (metric.evidence.scoreEligible) {
        expect(metric.scoring.weight).toBeGreaterThan(0);
        expect(metric.evidence.references.length).toBeGreaterThan(0);
        expect(metric.evidence.evidenceTier).toBeLessThan(4);
      } else {
        expect(metric.scoring.weight).toBe(0);
        expect(metric.evidence.evidenceTier).toBe(4);
      }
      expect(metric.overlay).toBeTruthy();
    }
  });

  it("calculates front ratios from known coordinates", () => {
    const byId = Object.fromEntries(
      calculateMetrics({ front, profile: {} }).map((metric) => [metric.id, metric.value]),
    );
    expect(byId["facial-width-height"]).toBeCloseTo(0.7 / 0.74, 5);
    expect(byId["upper-third"]).toBeCloseTo(0.22 / 0.74, 5);
    expect(byId["middle-third"]).toBeCloseTo(0.24 / 0.74, 5);
    expect(byId["lower-third"]).toBeCloseTo(0.28 / 0.74, 5);
    expect(byId["jaw-cheek-ratio"]).toBeCloseTo(0.52 / 0.7, 5);
    expect(byId["chin-height-ratio"]).toBeCloseTo(0.21 / 0.28, 5);
    expect(byId["eye-spacing-ratio"]).toBeCloseTo(0.14 / Math.hypot(0.13, 0.015), 5);
    expect(byId["nasal-width-intercanthal"]).toBeCloseTo(0.14 / 0.14, 5);
    expect(byId["lip-height-ratio"]).toBeCloseTo(0.03 / 0.04, 5);
    expect(byId["eye-width-symmetry"]).toBeCloseTo(0, 5);
    expect(byId["nasal-midline-deviation"]).toBeCloseTo(0, 5);
    expect(byId["canthal-tilt"]).toBeCloseTo((Math.atan2(0.015, 0.13) * 180) / Math.PI, 4);
  });

  it("returns null when a required landmark or span is missing", () => {
    const broken = { ...front };
    delete broken.leftZygion;
    const width = METRICS.find((metric) => metric.id === "facial-width-height");
    expect(width?.calculate(broken)).toBeNull();
    const collapsed = face({
      leftZygion: [0.2, 0.4],
      rightZygion: [0.8, 0.4],
      foreheadApex: [0.5, 0.5],
      menton: [0.5, 0.5],
    });
    expect(width?.calculate(collapsed)).toBeNull();
  });

  it("calculates profile angles and chin projection", () => {
    const profile = face({
      glabella: [0.4, 0.3],
      nasion: [0.45, 0.36],
      pronasale: [0.7, 0.48],
      subnasale: [0.5, 0.55],
      columella: [0.58, 0.52],
      labialeSuperius: [0.56, 0.62],
      labialeInferius: [0.54, 0.7],
      sublabiale: [0.46, 0.76],
      pogonion: [0.55, 0.78],
      menton: [0.42, 0.9],
    });
    const convexity = METRICS.find((metric) => metric.id === "facial-convexity");
    expect(convexity?.calculate(profile)).toBeGreaterThan(90);
    expect(convexity?.calculate(profile)).toBeLessThan(180);

    const straight = face({
      glabella: [0.5, 0.3],
      subnasale: [0.5, 0.55],
      pogonion: [0.5, 0.8],
    });
    expect(convexity?.calculate(straight)).toBeCloseTo(180, 4);

    const projection = METRICS.find((metric) => metric.id === "chin-projection");
    const signed = (0.6 * 0.15 - 0.02 * 0.48) / Math.hypot(0.02, 0.6);
    const lower = Math.hypot(0.5 - 0.42, 0.55 - 0.9);
    expect(projection?.calculate(profile)).toBeCloseTo(signed / lower, 4);

    const nasal = METRICS.find((metric) => metric.id === "nasal-projection");
    const dx = 0.5 - 0.45;
    const dy = 0.55 - 0.36;
    const lineLength = Math.hypot(dx, dy);
    const offset = Math.abs(dx * (0.48 - 0.36) - dy * (0.7 - 0.45)) / lineLength;
    const dorsum = Math.hypot(0.7 - 0.45, 0.48 - 0.36);
    expect(nasal?.calculate(profile)).toBeCloseTo(offset / dorsum, 4);
  });
});

describe("scoring", () => {
  it("scores the center highest and does not flatten the harmony range at 10", () => {
    expect(scoreMetric(0.5, 0.4, 0.6, 0.1)).toBe(10);
    const edge = scoreMetric(0.4, 0.4, 0.6, 0.1);
    expect(edge).toBeCloseTo(7, 5);
    expect(scoreMetric(0.6, 0.4, 0.6, 0.1)).toBeCloseTo(7, 5);
    const justOutside = scoreMetric(0.62, 0.4, 0.6, 0.1);
    expect(justOutside).toBeLessThan(7);
    expect(justOutside).toBeGreaterThan(6);
    expect(scoreMetric(2, 0.4, 0.6, 0.1)).toBeLessThan(0.01);
    expect(scoreMetric(Number.NaN, 0, 1, 1)).toBeNull();
    expect(scoreMetric(1, 0, 1, 0)).toBeNull();
    expect(scoreMetric(1, 2, 1, 1)).toBeNull();
  });

  it("aggregates category, view, and harmony scores", () => {
    expect(weightedAverage([
      { score: 10, weight: 1 },
      { score: null, weight: 4 },
      { score: 0, weight: 1 },
    ])).toBe(5);

    const inputs = [
      base("a", "eyes", "front", 8, 2),
      base("b", "eyes", "front", 4, 2),
      base("c", "profile", "profile", 10, 1),
    ];
    const report = buildReport(inputs);
    expect(report.front).toBeCloseTo(6, 6);
    expect(report.profile).toBeCloseTo(10, 6);
    expect(report.harmony).toBeCloseTo(6.8, 6);
    expect(report.partial).toBe(false);
    expect(report.categories.find((category) => category.category === "eyes")?.score).toBe(6);
    const low = report.metrics.find((metric) => metric.id === "b");
    expect(low?.impact).toBeCloseTo(2.4, 5);
    expect(combineHarmony(8, null)).toEqual({ harmony: 8, partial: true });
  });
});

function base(
  id: string,
  category: "eyes" | "profile",
  view: "front" | "profile",
  score: number,
  weight: number,
) {
  return {
    id,
    label: id,
    category,
    view,
    unit: "ratio" as const,
    value: 1,
    score,
    weight,
    referenceMin: 0,
    referenceMax: 1,
    explanation: "test",
    formula: "test",
    normalization: "test",
    overlay: { type: "line" as const, points: [] },
  };
}

describe("landmark mapping", () => {
  it("maps mesh vertices into semantic points and marks estimates as derived", () => {
    const raw: RawFaceLandmark[] = Array.from({ length: 478 }, () => ({
      x: 0.5,
      y: 0.5,
      z: 0,
    }));
    raw[MP.nasion] = { x: 0.5, y: 0.4, z: 0 };
    raw[MP.menton] = { x: 0.5, y: 0.9, z: 0 };
    raw[MP.subnasale] = { x: 0.5, y: 0.58, z: 0 };
    raw[MP.leftPupil] = { x: 0.62, y: 0.42, z: 0 };
    raw[MP.rightPupil] = { x: 0.38, y: 0.42, z: 0 };
    raw[MP.pronasale] = { x: 0.5, y: 0.52, z: -0.04 };
    raw[MP.rightLateral[0]] = { x: 0.12, y: 0.45, z: 0.02 };
    raw[MP.rightLateral[1]] = { x: 0.2, y: 0.45, z: 0 };
    raw[MP.leftLateral[0]] = { x: 0.88, y: 0.45, z: -0.01 };
    raw[MP.rightGonion[0]] = { x: 0.22, y: 0.74, z: 0 };
    raw[MP.leftGonion[0]] = { x: 0.78, y: 0.74, z: 0 };
    raw[MP.labialeSuperius] = { x: 0.5, y: 0.66, z: 0 };
    raw[MP.upperLipInner] = { x: 0.5, y: 0.68, z: 0 };
    raw[MP.lowerLipInner] = { x: 0.5, y: 0.7, z: 0 };

    const mapped = mapFrontLandmarks(raw);
    expect(mapped.rightZygion?.x).toBeCloseTo(0.12, 5);
    expect(mapped.rightZygion?.source).toBe("derived");
    expect(mapped.leftZygion?.x).toBeCloseTo(0.88, 5);
    expect(mapped.stomion?.y).toBeCloseTo(0.69, 5);
    expect(mapped.stomion?.source).toBe("derived");
    expect(mapped.rightPupil?.source).toBe("mediapipe");
    expect(mapped.leftGonion?.x).toBeCloseTo(0.78, 5);
  });

  it("derives a right-facing profile pogonion from the most anterior chin point", () => {
    const raw: RawFaceLandmark[] = Array.from({ length: 478 }, () => ({
      x: 0.4,
      y: 0.6,
      z: 0,
    }));
    raw[MP.pronasale] = { x: 0.7, y: 0.5, z: 0 };
    raw[MP.subnasale] = { x: 0.55, y: 0.56, z: 0 };
    raw[MP.sulcus[0]] = { x: 0.41, y: 0.74, z: 0 };
    raw[MP.sulcus[1]] = { x: 0.52, y: 0.76, z: 0 };
    raw[MP.sulcus[2]] = { x: 0.5, y: 0.78, z: 0 };
    raw[MP.chinFront[1]] = { x: 0.62, y: 0.78, z: 0 };
    const mapped = mapProfileLandmarks(raw);
    expect(mapped.pogonion?.x).toBeCloseTo(0.62, 5);
    expect(mapped.pogonion?.source).toBe("derived");
    expect(mapped.sublabiale?.x).toBeCloseTo(0.41, 5);
    expect(mapped.columella?.source).toBe("derived");
    expect(mapped.columella?.x).toBeGreaterThan(mapped.subnasale?.x ?? 1);
  });
});

describe("pipeline", () => {
  it("is deterministic and does not invent values for missing views", () => {
    const first = runMeasurementPipeline({ front, profile: {} });
    const second = runMeasurementPipeline({ front, profile: {} });
    expect(first.harmony).toBe(second.harmony);
    expect(first.partial).toBe(true);
    expect(first.profile).toBeNull();
    expect(first.availableCount).toBeGreaterThan(20);
    expect(first.metrics.every((metric) => metric.view === "profile" ? metric.value === null : true)).toBe(true);
  });
});
