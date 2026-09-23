"use client";

import { useRouter } from "next/navigation";
import { METRICS } from "@/lib/face/metrics";
import { formatMetricValue, formatScore, formatWhen } from "@/lib/format";
import type { AnalysisDetail } from "@/lib/data/model";
import type { AnalysisSummary } from "@/types/analysis";
import { CATEGORY_LABELS } from "@/types/face";

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

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">Compare</p>
      <h1 className="mt-2 text-3xl tracking-tight">Two analyses</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Score differences can come from camera perspective, lighting, landmark correction, or head pose. They are not evidence of a physical change.
      </p>
      {complete.length < 2 ? (
        <p className="mt-6 border border-line bg-panel p-4 text-sm">Complete at least two analyses before comparing them.</p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Picker label="First" value={leftId} analyses={complete} onChange={(value) => choose(value, rightId)} />
            <Picker label="Second" value={rightId} analyses={complete} onChange={(value) => choose(leftId, value)} />
          </div>
          {left && right ? (
            <div className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <ScoreColumn title={formatWhen(left.createdAt)} analysis={left} />
                <ScoreColumn title={formatWhen(right.createdAt)} analysis={right} />
              </div>
              <section className="border border-line bg-panel p-4">
                <h2 className="text-sm text-muted">Largest metric changes</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {largest.map((row) => (
                    <li key={row.id} className="flex justify-between gap-3">
                      <span>{row.label}</span>
                      <span className="font-mono">{signed(row.delta)}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <div className="overflow-auto border border-line bg-panel">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">Measurement</th>
                      <th className="px-4 py-3 font-medium">{formatWhen(left.createdAt)}</th>
                      <th className="px-4 py-3 font-medium">{formatWhen(right.createdAt)}</th>
                      <th className="px-4 py-3 font-medium">Score change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-3">{row.label}</td>
                        <td className="px-4 py-3 font-mono">{formatMetricValue(row.leftValue, row.unit)} · {formatScore(row.leftScore)}</td>
                        <td className="px-4 py-3 font-mono">{formatMetricValue(row.rightValue, row.unit)} · {formatScore(row.rightScore)}</td>
                        <td className="px-4 py-3 font-mono">{signed(row.delta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function Picker({
  label,
  value,
  analyses,
  onChange,
}: {
  label: string;
  value: string;
  analyses: AnalysisSummary[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      {label}
      <select className="mt-1 h-10 w-full border border-line bg-white px-2" value={value} onChange={(event) => onChange(event.target.value)}>
        {analyses.map((analysis) => (
          <option key={analysis.id} value={analysis.id}>
            {formatWhen(analysis.createdAt)} · {analysis.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function ScoreColumn({ title, analysis }: { title: string; analysis: AnalysisDetail }) {
  return (
    <article className="border border-line bg-panel p-4">
      <h2 className="text-sm text-muted">{title}</h2>
      <p className="mt-2 font-mono text-3xl">{formatScore(analysis.harmonyScore)}</p>
      <p className="text-xs text-muted">Harmony · Front {formatScore(analysis.frontScore)} · Profile {formatScore(analysis.profileScore)}</p>
      <ul className="mt-4 space-y-1 text-sm">
        {analysis.categoryScores.map((category) => (
          <li key={category.category} className="flex justify-between">
            <span>{CATEGORY_LABELS[category.category] ?? category.label}</span>
            <span className="font-mono">{formatScore(category.score)}</span>
          </li>
        ))}
      </ul>
    </article>
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
