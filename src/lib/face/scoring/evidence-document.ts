import { METRICS } from "@/lib/face/metrics";
import { evidenceBadge } from "@/lib/face/scoring/resolve-evidence";
import { EVIDENCE_TIER_WEIGHT } from "@/lib/face/scoring/weights";

function band(label: string, range: { min: number; max: number; center?: number } | undefined, unit: string): string {
  if (!range) return "";
  const center = range.center === undefined ? "" : ` (center ${range.center})`;
  return `${label}: ${range.min}–${range.max}${center} ${unit}. `;
}

export function renderEvidenceMarkdown(): string {
  const rows = METRICS.map((metric) => {
    const evidence = metric.evidence;
    const unit = metric.unit;
    const neutral = evidence.bands.neutral;
    const refs = evidence.references
      .map((reference) => {
        const id = reference.pmid ? `PMID ${reference.pmid}` : reference.doi ? `DOI ${reference.doi}` : "no indexed id";
        return `${reference.authors ?? "HarmonyLabs context"} (${reference.year}). ${reference.title}. ${id}. Population: ${reference.population}. ${reference.methodology}`;
      })
      .join(" ");
    return [
      `## ${metric.label}`,
      "",
      `- Metric ID: \`${metric.id}\``,
      `- View: ${metric.view}`,
      `- Formula: ${metric.formula}`,
      `- Landmarks: ${metric.requiredLandmarks.join(", ")}`,
      `- Landmark sources: direct MediaPipe points, derived contour or breadth estimates, and manual edits. Approximate zygion and gonion stay derived unless the user moves them.`,
      `- Evidence tier: ${evidence.evidenceTier} (${evidenceBadge(evidence)})`,
      `- Evidence type: ${evidence.evidenceType}`,
      `- Evidence level: ${evidence.evidenceLevel}`,
      `- Harmony eligible: ${evidence.scoreEligible ? "yes" : "no"}`,
      `- Evidence weight: ${EVIDENCE_TIER_WEIGHT[evidence.evidenceTier]}`,
      `- Measurement reliability prior: ${evidence.measurementReliability}`,
      `- Formula compatibility: ${evidence.formulaCompatibility}`,
      `- Scoring shape: ${evidence.scoringShape}`,
      `- Source population: ${evidence.sourcePopulation}`,
      `- ${band("Aesthetic target", neutral.aestheticTarget, unit)}${band("Harmony range", neutral.harmoniousRange, unit)}${band("Population range", neutral.populationRange, unit)}`.trim(),
      `- Formula notes: ${evidence.formulaCompatibilityNotes.join(" ")}`,
      `- Accuracy budget: ${evidence.accuracyBudget.join(" ")}`,
      `- Limitations: ${evidence.limitations.join(" ")}`,
      `- References: ${refs}`,
      "",
    ].join("\n");
  });

  return [
    "# Measurement evidence",
    "",
    "This catalog is the Harmony V2 evidence registry. Scoring reads the same records in `src/lib/face/scoring/evidence-registry.ts`. A population mean is not an aesthetic optimum. A metric with `Harmony eligible: no` is informational and has zero Harmony weight.",
    "",
    "Tier 1 is direct attractiveness or preference evidence. Tier 2 is established aesthetic-harmony evidence. Tier 3 is anthropometric proportional evidence and contributes modestly. Tier 4 is unsupported and does not affect Harmony.",
    "",
    "Presentation-specific masculine and feminine bands are used only when the user selects that profile. They are never inferred from the photograph.",
    "",
    ...rows,
  ].join("\n");
}
