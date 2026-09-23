import { formatMetricValue, formatRange, formatScore } from "@/lib/format";
import type { AnalysisContext } from "@/lib/ai/prompts";

function scored(context: AnalysisContext) {
  return context.metrics.filter((metric) => metric.score !== null && metric.value !== null);
}

function line(metric: AnalysisContext["metrics"][number]): string {
  return `${metric.label}: value ${formatMetricValue(metric.value, metric.unit)}, reference ${formatRange(metric.referenceMin, metric.referenceMax, metric.unit)}, score ${formatScore(metric.score)}`;
}

export function explainStructured(question: string, context: AnalysisContext): string {
  const q = question.toLowerCase();
  const metrics = scored(context);
  const lowest = [...metrics].sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
  const highest = [...lowest].reverse();
  const preface = context.analysis.isSample
    ? "This report uses a geometric diagram, not a photograph of a person."
    : "Proportional Harmony compares measurements with FaceLab's experimental reference ranges. It is not a measure of attractiveness.";

  if (q.includes("impact")) {
    const impacts = [...metrics]
      .filter((metric) => (metric.impact ?? 0) > 0.005)
      .sort((a, b) => (b.impact ?? 0) - (a.impact ?? 0))
      .slice(0, 5);
    if (impacts.length === 0) {
      return `${preface}\n\nNo measured item would raise Harmony by moving into its reference band. The current Harmony score is ${formatScore(context.analysis.harmony)}.`;
    }
    return `${preface}\n\nHighest potential score impact, if each measurement moved to the nearest edge of its reference band:\n${impacts
      .map((metric) => `- ${metric.label}: +${formatScore(metric.impact)} (${line(metric)})`)
      .join("\n")}`;
  }

  if (q.includes("change") || q.includes("between") || q.includes("last")) {
    if (!context.previous) {
      return `${preface}\n\nThere is no earlier completed analysis in this account to compare. I only have ${context.analysis.name}, with Harmony ${formatScore(context.analysis.harmony)}.`;
    }
    const delta = (context.analysis.harmony ?? 0) - (context.previous.harmony ?? 0);
    return `${preface}\n\nHarmony moved from ${formatScore(context.previous.harmony)} to ${formatScore(context.analysis.harmony)} (${delta >= 0 ? "+" : ""}${delta.toFixed(2)}). Differences can come from camera pose, lighting, or landmark edits, not only from a change in the face.\n${context.previous.changes
      .map((change) => `- ${change.label}: ${formatScore(change.previous)} → ${formatScore(change.current)}`)
      .join("\n")}`;
  }

  if (q.includes("front") && (q.includes("higher") || q.includes("why"))) {
    return `${preface}\n\nFront score ${formatScore(context.analysis.frontScore)}. Profile score ${formatScore(context.analysis.profileScore)}. Harmony ${formatScore(context.analysis.harmony)} weights the front view at 62% and the profile at 38%.\nThe lower-scoring side is driven by:\n${lowest
      .slice(0, 4)
      .map((metric) => `- ${line(metric)}`)
      .join("\n")}`;
  }

  if (q.includes("profile")) {
    const profile = lowest.filter((metric) => metric.view === "profile");
    return `${preface}\n\nProfile score ${formatScore(context.analysis.profileScore)}.\n${profile
      .slice(0, 5)
      .map((metric) => `- ${line(metric)}`)
      .join("\n")}`;
  }

  if (q.includes("furthest") || q.includes("deviation") || q.includes("reference")) {
    return `${preface}\n\nMeasurements furthest from the configured reference, by score:\n${lowest
      .slice(0, 5)
      .map((metric) => `- ${line(metric)}`)
      .join("\n")}`;
  }

  const warning =
    context.qualityWarnings.length > 0
      ? `\n\nPhoto notes: ${context.qualityWarnings.join(" ")}`
      : "";
  return `${preface}\n\nHarmony ${formatScore(context.analysis.harmony)}. Front ${formatScore(context.analysis.frontScore)}. Profile ${formatScore(context.analysis.profileScore)}.\nHigher scores:\n${highest
    .slice(0, 3)
    .map((metric) => `- ${line(metric)}`)
    .join("\n")}\nLower scores:\n${lowest
    .slice(0, 3)
    .map((metric) => `- ${line(metric)}`)
    .join("\n")}${warning}`;
}
