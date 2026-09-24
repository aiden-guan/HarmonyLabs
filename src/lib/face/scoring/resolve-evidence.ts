import type { MetricEvidence, PresentationBands, ResolvedEvidence } from "@/lib/face/scoring/evidence-types";
import type { PresentationProfile } from "@/lib/face/versions";

export function resolveEvidence(
  evidence: MetricEvidence,
  presentation: PresentationProfile,
): ResolvedEvidence {
  const bands: PresentationBands = evidence.bands[presentation] ?? evidence.bands.neutral;
  let formulaCompatibility = evidence.formulaCompatibility;
  if (presentation === "feminine" && evidence.feminineCompatibility != null) {
    formulaCompatibility *= evidence.feminineCompatibility;
  }
  if (presentation === "masculine" && evidence.masculineCompatibility != null) {
    formulaCompatibility *= evidence.masculineCompatibility;
  }
  return { evidence, bands, formulaCompatibility };
}

export function evidenceBadge(evidence: MetricEvidence): string {
  if (!evidence.scoreEligible || evidence.evidenceTier === 4) return "Informational only";
  if (evidence.evidenceTier === 1) return "Direct attractiveness evidence";
  if (evidence.evidenceTier === 2) return "Established aesthetic evidence";
  return "Anthropometric proportional evidence";
}

export function confidenceLabel(confidence: number | null | undefined): "High" | "Moderate" | "Low" | null {
  if (confidence == null || !Number.isFinite(confidence)) return null;
  if (confidence >= 0.75) return "High";
  if (confidence >= 0.5) return "Moderate";
  return "Low";
}
