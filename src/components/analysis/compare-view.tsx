"use client";

import { useRouter } from "next/navigation";
import { GitCompare } from "lucide-react";
import { METRICS } from "@/lib/face/metrics";
import { formatMetricValue, formatScore, formatWhen } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import type { AnalysisDetail } from "@/lib/data/model";
import type { AnalysisSummary } from "@/types/analysis";
import { CATEGORY_LABELS } from "@/types/face";
import { cn } from "@/lib/utils";

export function CompareView({
  analyses,
  left,
  right,
}: {
  analyses: AnalysisSummary[];
  left: AnalysisDetail | null;
  right: AnalysisDetail | null;
}) {
  const router = useRouter();
  const complete = analyses.filter((item) => item.status === "complete");
  const leftId = left?.id ?? "";
  const rightId = right?.id ?? "";

  function choose(nextLeft: string, nextRight: string) {
    const params = new URLSearchParams();
    if (nextLeft) params.set("a", nextLeft);
    if (nextRight) params.set("b", nextRight);
    router.replace(`/compare?${params.toString()}`);
  }

  const rows = left && right ? metricRows(left, right) : [];
  const largest = [...rows].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 5);

  const harmonyDelta =
    left?.harmonyScore !== null && left?.harmonyScore !== undefined &&
    right?.harmonyScore !== null && right?.harmonyScore !== undefined
      ? right.harmonyScore - left.harmonyScore
      : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="border-b border-line pb-6">
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-accent font-semibold block">
          COMPARATIVE PROPORTIONS STUDIO
        </span>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          Compare two analyses
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted max-w-3xl leading-relaxed">
          Evaluate geometric variations between scans. Score variations typically reflect camera angle, lighting, landmark verification, or posture rather than anatomical alteration.
        </p>
      </div>

      {complete.length < 2 ? (
        <Card className="border border-line bg-panel p-8 text-center max-w-xl mx-auto my-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-muted mb-3">
            <GitCompare className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-ink">Insufficient scans for comparison</h2>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            You need at least two completed analyses to compare geometric measurements.
          </p>
        </Card>
      ) : (
        <>
          {/* Analysis Selectors */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border border-line bg-panel p-4 shadow-xs">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                Baseline scan (Scan A)
              </label>
              <Select
                value={leftId}
                onChange={(e) => choose(e.target.value, rightId)}
                className="w-full text-sm font-medium"
              >
                {complete.map((analysis) => (
                  <option key={analysis.id} value={analysis.id}>
                    {analysis.name || "Untitled"} · {formatWhen(analysis.createdAt)} (Harmony {formatScore(analysis.harmonyScore)})
                  </option>
                ))}
              </Select>
            </Card>

            <Card className="border border-line bg-panel p-4 shadow-xs">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                Comparison scan (Scan B)
              </label>
              <Select
                value={rightId}
                onChange={(e) => choose(leftId, e.target.value)}
                className="w-full text-sm font-medium"
              >
                {complete.map((analysis) => (
                  <option key={analysis.id} value={analysis.id}>
                    {analysis.name || "Untitled"} · {formatWhen(analysis.createdAt)} (Harmony {formatScore(analysis.harmonyScore)})
                  </option>
                ))}
              </Select>
            </Card>
          </div>

          {left && right ? (
            <div className="space-y-6">
              {/* Head-to-Head Delta Banner */}
              <section className="rounded-xl border border-line bg-panel p-6 shadow-xs">
                <div className="grid gap-6 sm:grid-cols-3 sm:divide-x divide-line/60">
                  {/* Left Analysis Overview */}
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-16 rounded-md overflow-hidden border border-line bg-slate-900 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/analyses/${left.id}/photos/front`}
                        alt=""
                        className="h-full w-full object-cover object-top"
                      />
                    </div>
                    <div>
                      <span className="font-mono text-[10px] uppercase text-muted block">Scan A · Baseline</span>
                      <p className="font-semibold text-sm text-ink truncate">{left.name || "Untitled"}</p>
                      <p className="font-mono text-2xl font-bold text-ink mt-0.5">
                        {formatScore(left.harmonyScore)}
                      </p>
                      <p className="text-[11px] text-muted">{formatWhen(left.createdAt)}</p>
                    </div>
                  </div>

                  {/* Center Delta */}
                  <div className="sm:pl-6 flex flex-col justify-center items-start sm:items-center py-2 sm:py-0">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted block">
                      Harmony net change
                    </span>
                    <div className="mt-1 flex items-baseline gap-2 font-mono">
                      <span
                        className={cn(
                          "text-3xl font-bold",
                          harmonyDelta !== null && harmonyDelta > 0
                            ? "text-good"
                            : harmonyDelta !== null && harmonyDelta < 0
                            ? "text-signal"
                            : "text-ink",
                        )}
                      >
                        {harmonyDelta !== null ? signed(harmonyDelta) : "0.00"}
                      </span>
                      <span className="text-xs text-muted">points</span>
                    </div>
                    <span className="text-[11px] text-muted mt-0.5">
                      {harmonyDelta !== null && harmonyDelta > 0 ? "Increased alignment" : "Decreased alignment"}
                    </span>
                  </div>

                  {/* Right Analysis Overview */}
                  <div className="sm:pl-6 flex items-center gap-4">
                    <div className="relative h-20 w-16 rounded-md overflow-hidden border border-line bg-slate-900 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/analyses/${right.id}/photos/front`}
                        alt=""
                        className="h-full w-full object-cover object-top"
                      />
                    </div>
                    <div>
                      <span className="font-mono text-[10px] uppercase text-muted block">Scan B · Comparison</span>
                      <p className="font-semibold text-sm text-ink truncate">{right.name || "Untitled"}</p>
                      <p className="font-mono text-2xl font-bold text-ink mt-0.5">
                        {formatScore(right.harmonyScore)}
                      </p>
                      <p className="text-[11px] text-muted">{formatWhen(right.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Side-by-Side Category Breakdowns */}
              <div className="grid gap-6 md:grid-cols-2">
                <ScoreColumn title={`Scan A: ${formatWhen(left.createdAt)}`} analysis={left} />
                <ScoreColumn title={`Scan B: ${formatWhen(right.createdAt)}`} analysis={right} />
              </div>

              {/* Largest Metric Changes Card */}
              <Card className="border border-line bg-panel shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle>Largest metric changes</CardTitle>
                  <CardDescription>
                    Individual measurements with the greatest numerical shifts between the two scans.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {largest.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-lg border border-line/70 bg-slate-50/60 p-3 flex items-center justify-between"
                      >
                        <span className="text-xs font-medium text-ink truncate mr-2">
                          {row.label}
                        </span>
                        <span
                          className={cn(
                            "font-mono text-xs font-bold shrink-0",
                            row.delta > 0 ? "text-good" : row.delta < 0 ? "text-signal" : "text-ink",
                          )}
                        >
                          {signed(row.delta)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Metrics Comparison Table */}
              <Card className="border border-line bg-panel shadow-xs overflow-hidden">
                <CardHeader className="pb-3 border-b border-line/60">
                  <CardTitle>Full metric comparison</CardTitle>
                  <CardDescription>
                    All anatomical measurements and calculated scores compared side-by-side.
                  </CardDescription>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead className="border-b border-line bg-slate-50/70 font-mono text-[11px] uppercase tracking-wider text-muted">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Measurement</th>
                        <th className="px-4 py-3 font-semibold">{left.name || "Scan A"} ({formatWhen(left.createdAt)})</th>
                        <th className="px-4 py-3 font-semibold">{right.name || "Scan B"} ({formatWhen(right.createdAt)})</th>
                        <th className="px-4 py-3 font-semibold text-right">Score delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60">
                      {rows.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-ink">{row.label}</td>
                          <td className="px-4 py-3 font-mono text-muted">
                            <span className="text-ink font-medium">{formatMetricValue(row.leftValue, row.unit)}</span>
                            {" "}· Score {formatScore(row.leftScore)}
                          </td>
                          <td className="px-4 py-3 font-mono text-muted">
                            <span className="text-ink font-medium">{formatMetricValue(row.rightValue, row.unit)}</span>
                            {" "}· Score {formatScore(row.rightScore)}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-3 font-mono font-bold text-right",
                              row.delta > 0 ? "text-good" : row.delta < 0 ? "text-signal" : "text-muted",
                            )}
                          >
                            {signed(row.delta)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function ScoreColumn({ title, analysis }: { title: string; analysis: AnalysisDetail }) {
  return (
    <Card className="border border-line bg-panel p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-line/60">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <p className="text-xs text-muted font-mono mt-0.5">
            Front: {formatScore(analysis.frontScore)} · Profile: {formatScore(analysis.profileScore)}
          </p>
        </div>
        <div className="text-right font-mono">
          <span className="text-[10px] uppercase text-muted block">Harmony</span>
          <span className="text-2xl font-bold text-accent">{formatScore(analysis.harmonyScore)}</span>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {analysis.categoryScores.map((cat) => (
          <div key={cat.category} className="flex items-center justify-between text-xs">
            <span className="text-muted font-medium">
              {CATEGORY_LABELS[cat.category] ?? cat.label}
            </span>
            <span className="font-mono font-semibold text-ink">{formatScore(cat.score)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function metricRows(left: AnalysisDetail, right: AnalysisDetail) {
  return METRICS.map((definition) => {
    const a = left.metrics.find((metric) => metric.metricId === definition.id);
    const b = right.metrics.find((metric) => metric.metricId === definition.id);
    return {
      id: definition.id,
      label: definition.label,
      unit: definition.unit,
      leftValue: a?.value ?? null,
      rightValue: b?.value ?? null,
      leftScore: a?.score ?? null,
      rightScore: b?.score ?? null,
      delta: (b?.score ?? 0) - (a?.score ?? 0),
    };
  }).filter((row) => row.leftScore !== null || row.rightScore !== null);
}

function signed(value: number): string {
  const formatted = value.toFixed(2);
  return value > 0 ? `+${formatted}` : formatted;
}
