"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FaceStage } from "@/components/face-overlay/face-stage";
import { Button } from "@/components/ui/button";
import { METRICS } from "@/lib/face/metrics";
import { formatLongWhen, formatMetricValue, formatRange, formatScore } from "@/lib/format";
import type { AnalysisDetail, StoredMetric } from "@/lib/data/model";
import type { FaceView, MetricCategory, SemanticLandmark } from "@/types/face";
import { CATEGORY_LABELS } from "@/types/face";
import { AskPanel } from "@/components/analysis/ask-panel";
import { RangeTrack } from "@/components/analysis/range-track";

const filters = ["all", "facialStructure", "eyes", "nose", "lips", "jaw", "profile", "symmetry"] as const;

export function AnalysisView({ analysis }: { analysis: AnalysisDetail }) {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "measurements" | "photos" | "compare" | "ask">("overview");
  const [error, setError] = useState("");
  const metrics = useMemo(
    () =>
      analysis.metrics.map((metric) => ({
        ...metric,
        definition: METRICS.find((item) => item.id === metric.metricId),
      })),
    [analysis.metrics],
  );
  const ranked = [...metrics].filter((metric) => metric.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const strengths = ranked.filter((metric) => (metric.score ?? 0) >= 8).slice(0, 3);
  const deviations = [...ranked].reverse().filter((metric) => (metric.score ?? 10) < 9.95).slice(0, 3);
  const impacts = [...metrics].filter((metric) => (metric.impact ?? 0) > 0.005).sort((a, b) => (b.impact ?? 0) - (a.impact ?? 0)).slice(0, 5);

  async function remove() {
    if (!window.confirm("Delete this analysis and its photographs?")) return;
    const response = await fetch(`/api/analyses/${analysis.id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Could not delete the analysis.");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-sm text-muted">{analysis.name}</p>
          <h1 className="mt-1 text-3xl tracking-tight">Analysis</h1>
          <p className="mt-1 text-sm text-muted">{formatLongWhen(analysis.createdAt)}</p>
          {analysis.isSample ? (
            <p className="mt-2 max-w-xl text-sm text-warn">This report uses a drawn diagram, not a photograph of a person.</p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Proportional harmony</p>
          <p className="font-mono text-4xl">{analysis.status === "complete" ? formatScore(analysis.harmonyScore) : "—"}</p>
          <p className="text-xs text-muted">Geometric reference score, not attractiveness.</p>
        </div>
      </header>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/analysis/${analysis.id}/edit`} className="inline-flex h-10 items-center border border-line bg-panel px-4 text-sm">Edit landmarks</Link>
        <Link href={`/analysis/${analysis.id}/compare`} className="inline-flex h-10 items-center border border-line bg-panel px-4 text-sm">Compare</Link>
        <Button variant="danger" onClick={remove}>Delete</Button>
      </div>
      <div className="mt-6 flex gap-4 overflow-auto border-b border-line text-sm">
        {(["overview", "measurements", "photos", "compare", "ask"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`pb-2 capitalize ${tab === item ? "border-b-2 border-accent text-accent" : "text-muted"}`}>
            {item === "ask" ? "Ask AI" : item}
          </button>
        ))}
      </div>
      {error ? <p role="alert" className="mt-4 text-sm text-signal">{error}</p> : null}
      {analysis.status !== "complete" ? (
        <p className="mt-6 border border-line bg-panel p-4 text-sm">
          This analysis is not finished. Review the landmarks and calculate measurements to see a Harmony score.
        </p>
      ) : null}
      {tab === "overview" && analysis.status === "complete" ? (
        <Overview analysis={analysis} strengths={strengths} deviations={deviations} impacts={impacts} />
      ) : null}
      {tab === "measurements" ? <Measurements analysis={analysis} metrics={metrics} /> : null}
      {tab === "photos" ? <Photos analysis={analysis} metrics={metrics} /> : null}
      {tab === "compare" ? (
        <p className="mt-6 text-sm">
          Open the <Link className="text-accent" href={`/analysis/${analysis.id}/compare`}>comparison page</Link> to choose a second analysis.
        </p>
      ) : null}
      {tab === "ask" ? <AskPanel analysisId={analysis.id} disabled={analysis.status !== "complete"} /> : null}
    </div>
  );
}

function Overview({
  analysis,
  strengths,
  deviations,
  impacts,
}: {
  analysis: AnalysisDetail;
  strengths: Array<StoredMetric & { definition?: { label: string } }>;
  deviations: Array<StoredMetric & { definition?: { label: string } }>;
  impacts: Array<StoredMetric & { definition?: { label: string } }>;
}) {
  const data = analysis.categoryScores.map((category) => ({
    label: category.label,
    score: category.score ?? 0,
  }));
  return (
    <div className="mt-6 space-y-6">
      {analysis.confidence ? (
        <p className="text-sm text-muted">
          Measurement confidence: {analysis.confidence}. {analysis.qualityNotes.join(" ")}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <ScoreCard label="Harmony" value={analysis.harmonyScore} />
        <ScoreCard label="Front" value={analysis.frontScore} />
        <ScoreCard label="Profile" value={analysis.profileScore} />
      </div>
      <div className="h-80 border border-line bg-panel p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
            <CartesianGrid stroke="#d3dde6" horizontal={false} />
            <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="score" fill="#1c4e6e" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <ListCard title="Strengths" items={strengths} />
        <ListCard title="Largest deviations" items={deviations} />
        <article className="border border-line bg-panel p-4">
          <h2 className="text-sm text-muted">Highest potential score impact</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {impacts.map((metric) => (
              <li key={metric.metricId} className="flex justify-between gap-3">
                <span>{metric.definition?.label ?? metric.metricId}</span>
                <span className="font-mono">+{formatScore(metric.impact)}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number | null }) {
  return (
    <article className="border border-line bg-panel p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-mono text-3xl">{formatScore(value)}</p>
    </article>
  );
}

function ListCard({ title, items }: { title: string; items: Array<StoredMetric & { definition?: { label: string } }> }) {
  return (
    <article className="border border-line bg-panel p-4">
      <h2 className="text-sm text-muted">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {items.length === 0 ? <li>Nothing to list.</li> : null}
        {items.map((metric) => (
          <li key={metric.metricId} className="flex justify-between gap-3">
            <span>{metric.definition?.label ?? metric.metricId}</span>
            <span className="font-mono">{formatScore(metric.score)}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function Measurements({
  analysis,
  metrics,
}: {
  analysis: AnalysisDetail;
  metrics: Array<StoredMetric & { definition?: (typeof METRICS)[number] }>;
}) {
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(metrics[0]?.metricId ?? null);
  const visible = metrics.filter((metric) => {
    const label = metric.definition?.label ?? metric.metricId;
    const matchesFilter = filter === "all" || metric.category === filter;
    return matchesFilter && label.toLowerCase().includes(query.toLowerCase());
  });
  const current = metrics.find((metric) => metric.metricId === selected) ?? visible[0];
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button key={item} type="button" onClick={() => setFilter(item)} className={`h-8 px-2 text-xs ${filter === item ? "bg-accent text-accent-ink" : "border border-line"}`}>
              {item === "all" ? "All" : CATEGORY_LABELS[item as MetricCategory]}
            </button>
          ))}
        </div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search measurements" className="mt-3 h-10 w-full border border-line bg-white px-3 text-sm" />
        <ul className="mt-4 divide-y divide-line border border-line bg-panel">
          {visible.map((metric) => (
            <li key={metric.metricId} className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_auto]">
              <div>
                <p className="text-sm">{metric.definition?.label ?? metric.metricId}</p>
                <p className="mt-1 font-mono text-xs text-muted">
                  Value {formatMetricValue(metric.value, metric.unit)} · Reference {formatRange(metric.referenceMin, metric.referenceMax, metric.unit)} · Score {formatScore(metric.score)}
                </p>
                <RangeTrack min={metric.referenceMin} max={metric.referenceMax} value={metric.value} />
              </div>
              <button type="button" className="text-sm text-accent" onClick={() => setSelected(metric.metricId)}>
                View
              </button>
            </li>
          ))}
        </ul>
      </div>
      <MetricPhoto analysis={analysis} metric={current} />
    </div>
  );
}

function Photos({
  analysis,
  metrics,
}: {
  analysis: AnalysisDetail;
  metrics: Array<StoredMetric & { definition?: (typeof METRICS)[number] }>;
}) {
  const [metricId, setMetricId] = useState(metrics[0]?.metricId ?? "");
  const metric = metrics.find((item) => item.metricId === metricId);
  return (
    <div className="mt-6 space-y-4">
      <label className="block text-sm">
        Measurement
        <select className="mt-1 h-10 w-full max-w-sm border border-line bg-white px-2" value={metricId} onChange={(event) => setMetricId(event.target.value)}>
          {metrics.map((item) => (
            <option key={item.metricId} value={item.metricId}>{item.definition?.label ?? item.metricId}</option>
          ))}
        </select>
      </label>
      <MetricPhoto analysis={analysis} metric={metric} />
    </div>
  );
}

function MetricPhoto({
  analysis,
  metric,
}: {
  analysis: AnalysisDetail;
  metric?: StoredMetric & { definition?: (typeof METRICS)[number] };
}) {
  if (!metric?.definition) return <p className="text-sm text-muted">Select a measurement.</p>;
  const view = metric.view as FaceView;
  const photo = analysis.photos.find((item) => item.view === view);
  const landmarks: SemanticLandmark[] = analysis.landmarks
    .filter((landmark) => landmark.view === view)
    .map(({ view: _view, ...landmark }) => landmark);
  if (!photo) return <p className="text-sm">The {view} photograph is missing.</p>;
  return (
    <div>
      <p className="mb-2 text-sm">{metric.definition.label}</p>
      <p className="mb-3 text-xs leading-5 text-muted">{metric.definition.explanation}</p>
      <FaceStage
        src={`/api/analyses/${analysis.id}/photos/${view}`}
        width={photo.width}
        height={photo.height}
        landmarks={landmarks.filter((landmark) => metric.definition?.requiredLandmarks.includes(landmark.key))}
        overlay={metric.definition.overlay}
      />
    </div>
  );
}

