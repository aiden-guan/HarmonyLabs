import { expect, test } from "vitest";
import { explainStructured } from "@/lib/ai/explain";
import { buildAnalysisContext } from "@/lib/ai/prompts";
import { sampleLandmarks } from "@/fixtures/sample-face";
import { completeAnalysis } from "@/lib/face/complete";
import { METRICS } from "@/lib/face/metrics";
import type { AnalysisDetail } from "@/lib/data/model";
import type { PhotoQuality } from "@/types/face";

const quality: PhotoQuality = {
  faceDetected: true,
  faceCount: 1,
  yaw: 0,
  pitch: 0,
  roll: 0,
  blurScore: 0.8,
  brightnessScore: 0.6,
  faceCoverage: 0.4,
  warnings: ["Profile tilt is about 8°."],
  mirrored: false,
};

function detail(name: string, createdAt: string): AnalysisDetail {
  const result = completeAnalysis({
    front: sampleLandmarks("front"),
    profile: sampleLandmarks("profile"),
    qualities: [quality],
  });
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name,
    status: "complete",
    isSample: false,
    harmonyScore: result.harmonyScore,
    frontScore: result.frontScore,
    profileScore: result.profileScore,
    createdAt,
    updatedAt: createdAt,
    profileMirrored: false,
    categoryScores: result.categoryScores,
    qualityNotes: result.qualityNotes,
    confidence: result.confidence,
    errorMessage: null,
    detectedLandmarks: {},
    photos: [],
    landmarks: [],
    metrics: result.metrics,
    messages: [],
  };
}

test("explanations cite supplied measurements and do not include image URLs", () => {
  const labels = new Map(METRICS.map((metric) => [metric.id, metric.label]));
  const context = buildAnalysisContext(detail("September", "2026-09-22T00:00:00.000Z"), null, labels);
  expect(JSON.stringify(context)).not.toMatch(/https?:\/\//);
  const text = explainStructured("What measurements are furthest from reference?", context);
  const cited = context.metrics.find((metric) => text.includes(metric.label));
  expect(cited).toBeTruthy();
  expect(text).toContain("not a measure of attractiveness");
  expect(text).not.toMatch(/diagnosis|surgery/i);
});

test("a change question without a previous analysis does not invent one", () => {
  const labels = new Map(METRICS.map((metric) => [metric.id, metric.label]));
  const context = buildAnalysisContext(detail("Only", "2026-09-22T00:00:00.000Z"), null, labels);
  const text = explainStructured("What changed between my last analysis and this one?", context);
  expect(text).toContain("no earlier completed analysis");
});
