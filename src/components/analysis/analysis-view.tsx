"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Share2,
  Sliders,
  GitCompare,
  Trash2,
  Search,
  Layers,
  Calendar,
} from "lucide-react";
import { FaceStage } from "@/components/face-overlay/face-stage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { METRICS } from "@/lib/face/metrics";
import { formatLongWhen, formatMetricValue, formatRange, formatScore } from "@/lib/format";
import { confidenceLabel, evidenceBadge } from "@/lib/face/scoring/resolve-evidence";
import type { AnalysisDetail, StoredMetric } from "@/lib/data/model";
import type { FaceView, MetricCategory, SemanticLandmark } from "@/types/face";
import { CATEGORY_LABELS } from "@/types/face";
import { AskPanel } from "@/components/analysis/ask-panel";
import { RangeTrack } from "@/components/analysis/range-track";
import { measurementScale, rangeStanding, STANDING_LABEL } from "@/lib/face/scoring/placement";
import { ResultShareDialog } from "@/components/share/result-share-dialog";
import { cn } from "@/lib/utils";

const categoryFilterKeys = [
  "all",
  "facialStructure",
  "eyes",
  "nose",
  "lips",
  "jaw",
  "profile",
  "symmetry",
] as const;

type AnalysisTab = "overview" | "measurements" | "photos" | "compare" | "ask";

export function AnalysisView({ analysis }: { analysis: AnalysisDetail }) {
  const router = useRouter();
  const [tab, setTab] = useState<AnalysisTab>("overview");
  const [error, setError] = useState("");
  const [shareOpen, setShareOpen] = useState(false);

  const metrics = useMemo(
    () =>
      analysis.metrics.map((metric) => ({
        ...metric,
        definition: METRICS.find((item) => item.id === metric.metricId),
      })),
    [analysis.metrics],
  );

  const ranked = [...metrics].filter((metric) => metric.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const strengths = ranked.filter((metric) => (metric.score ?? 0) >= 8).slice(0, 4);
  const deviations = [...ranked].reverse().filter((metric) => (metric.score ?? 10) < 9.95).slice(0, 4);
  const impacts = [...metrics].filter((metric) => (metric.impact ?? 0) > 0.005).sort((a, b) => (b.impact ?? 0) - (a.impact ?? 0)).slice(0, 5);

  const isComplete = analysis.status === "complete";
  const frontPhoto = analysis.photos.find((p) => p.view === "front");

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

  const tabItems = [
    { id: "overview" as const, label: "Overview" },
    { id: "measurements" as const, label: "Measurements", count: metrics.length },
    { id: "photos" as const, label: "Photos" },
    { id: "compare" as const, label: "Compare" },
    { id: "ask" as const, label: "Ask AI" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* RESULT HERO PANEL */}
      <section className="rounded-xl border border-line bg-panel p-6 sm:p-8 shadow-xs">
        <div className="grid gap-8 md:grid-cols-12 md:items-center">
          {/* Left: Front Photo Thumbnail Frame */}
          <div className="md:col-span-4 lg:col-span-3 flex justify-center md:justify-start">
            <div className="relative h-56 w-44 sm:h-64 sm:w-48 rounded-lg overflow-hidden border border-line bg-slate-900 shadow-sm shrink-0">
              {frontPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/analyses/${analysis.id}/photos/front`}
                  alt="Front analysis photograph"
                  className="h-full w-full object-cover object-top select-none"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-500 font-mono text-xs">
                  No front photo
                </div>
              )}

              {/* Lab registration corner accents */}
              <div className="pointer-events-none absolute inset-0 border border-white/10 rounded-lg" />
              <div className="absolute left-2.5 top-2.5 h-2 w-2 border-l border-t border-sky-400" />
              <div className="absolute right-2.5 top-2.5 h-2 w-2 border-r border-t border-sky-400" />
              <div className="absolute bottom-2.5 left-2.5 h-2 w-2 border-b border-l border-sky-400" />
              <div className="absolute bottom-2.5 right-2.5 h-2 w-2 border-b border-r border-sky-400" />
            </div>
          </div>

          {/* Right: Scores, Metadata & Primary Actions */}
          <div className="md:col-span-8 lg:col-span-9 flex flex-col justify-between space-y-6">
            <div>
              {/* Header Title Row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs uppercase tracking-[0.16em] text-accent font-semibold">
                      FACIAL MEASUREMENT REPORT
                    </span>
                    {analysis.isSample ? (
                      <Badge variant="warning">Geometric Sample</Badge>
                    ) : null}
                    {analysis.confidence ? (
                      <Badge variant={analysis.confidence === "High" ? "success" : "default"}>
                        Confidence: {analysis.confidence}
                      </Badge>
                    ) : null}
                  </div>
                  <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                    {analysis.name || "Analysis Report"}
                  </h1>
                  <p className="mt-0.5 text-xs text-muted flex items-center gap-1.5 font-mono">
                    <Calendar className="h-3 w-3 text-muted/70" />
                    <span>{formatLongWhen(analysis.createdAt)}</span>
                  </p>
                </div>
              </div>

              {/* Score Presentation Hero */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 border-y border-line/60 py-4">
                {/* Primary Harmony Score */}
                <div>
                  <span className="font-mono text-xs uppercase tracking-[0.14em] text-accent font-semibold block">
                    Harmony
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5 font-mono">
                    <span className="text-4xl sm:text-5xl font-bold text-ink tracking-tight">
                      {isComplete ? formatScore(analysis.harmonyScore) : "—"}
                    </span>
                    {isComplete ? (
                      <span className="text-sm text-muted/70 font-normal">/ 10</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted leading-tight">
                    Research-informed facial proportional score.
                  </p>
                </div>

                {/* Front Score */}
                <div className="sm:border-l sm:border-line/60 sm:pl-6">
                  <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted font-medium block">
                    Front harmony
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5 font-mono">
                    <span className="text-3xl sm:text-4xl font-semibold text-ink">
                      {isComplete ? formatScore(analysis.frontScore) : "—"}
                    </span>
                    {isComplete ? (
                      <span className="text-xs text-muted/70 font-normal">/ 10</span>
                    ) : null}
                  </div>
                  <span className="mt-1 text-xs text-muted block">
                    Front view, reported separately
                  </span>
                </div>

                {/* Profile Score */}
                <div className="sm:border-l sm:border-line/60 sm:pl-6">
                  <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted font-medium block">
                    Profile harmony
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5 font-mono">
                    <span className="text-3xl sm:text-4xl font-semibold text-ink">
                      {isComplete ? formatScore(analysis.profileScore) : "—"}
                    </span>
                    {isComplete ? (
                      <span className="text-xs text-muted/70 font-normal">/ 10</span>
                    ) : null}
                  </div>
                  <span className="mt-1 text-xs text-muted block">
                    Profile view, reported separately
                  </span>
                </div>
              </div>
              <details className="mt-4 text-xs text-muted leading-relaxed">
                <summary className="cursor-pointer font-medium text-ink">How Harmony is built</summary>
                <p className="mt-2">
                  HarmonyLabs compares reproducible facial measurements with research-backed attractiveness, aesthetic-harmony, and proportional references. Stronger evidence receives greater influence on Harmony.
                </p>
                <p className="mt-2">
                  Some references come from direct attractiveness experiments, while others come from established aesthetic or anthropometric research. Evidence strength is shown for each measurement. Harmony is not a clinical diagnosis and not a universal mathematical face.
                </p>
                {analysis.scoringVersion && analysis.scoringVersion !== "harmony-v2" ? (
                  <p className="mt-2">This report is stored as {analysis.scoringVersion}. It was not rewritten with Harmony V2.</p>
                ) : (
                  <p className="mt-2">Scoring version {analysis.scoringVersion ?? "harmony-v2"}.</p>
                )}
              </details>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {isComplete ? (
                <Button
                  size="md"
                  onClick={() => setShareOpen(true)}
                  className="gap-2 shadow-xs"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share results</span>
                </Button>
              ) : null}

              <Link href={`/analysis/${analysis.id}/edit`}>
                <Button variant="secondary" size="md" className="gap-2">
                  <Sliders className="h-4 w-4 text-muted" />
                  <span>Edit landmarks</span>
                </Button>
              </Link>

              <Link href={`/analysis/${analysis.id}/compare`}>
                <Button variant="secondary" size="md" className="gap-2">
                  <GitCompare className="h-4 w-4 text-muted" />
                  <span>Compare</span>
                </Button>
              </Link>

              <Button
                variant="danger"
                size="md"
                onClick={remove}
                className="gap-1.5 ml-auto"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div role="alert" className="rounded-md border border-signal/20 bg-signal/5 p-4 text-xs text-signal">
          {error}
        </div>
      ) : null}

      {!isComplete ? (
        <div className="rounded-xl border border-line bg-panel p-6 text-sm text-muted leading-relaxed">
          This analysis is incomplete. Review and confirm landmarks on the front and profile views to compute measurements.
          <div className="mt-4">
            <Link href={`/analysis/${analysis.id}/edit`}>
              <Button size="sm">Resume landmark review</Button>
            </Link>
          </div>
        </div>
      ) : null}

      {/* REPORT TABS NAVIGATION */}
      <div className="border-b border-line">
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {tabItems.map((item) => {
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent",
                  isActive
                    ? "text-accent font-semibold"
                    : "text-muted hover:text-ink",
                )}
              >
                <span>{item.label}</span>
                {item.count !== undefined ? (
                  <span className="rounded px-1.5 py-0.2 font-mono text-[10px] bg-slate-100 text-muted">
                    {item.count}
                  </span>
                ) : null}
                {isActive ? (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT PANELS */}
      {tab === "overview" && isComplete ? (
        <OverviewPanel
          analysis={analysis}
          strengths={strengths}
          deviations={deviations}
          impacts={impacts}
        />
      ) : null}

      {tab === "measurements" ? (
        <MeasurementsPanel analysis={analysis} metrics={metrics} />
      ) : null}

      {tab === "photos" ? (
        <PhotosPanel analysis={analysis} metrics={metrics} />
      ) : null}

      {tab === "compare" ? (
        <Card className="border border-line bg-panel p-6">
          <CardHeader className="p-0 pb-3">
            <CardTitle>Compare analyses</CardTitle>
            <CardDescription>
              Select another completed scan from your library to examine delta values and anatomical variations side-by-side.
            </CardDescription>
          </CardHeader>
          <div className="mt-4">
            <Link href={`/analysis/${analysis.id}/compare`}>
              <Button className="gap-2">
                <GitCompare className="h-4 w-4" />
                <span>Open comparison studio</span>
              </Button>
            </Link>
          </div>
        </Card>
      ) : null}

      {tab === "ask" ? (
        <AskPanel analysisId={analysis.id} disabled={!isComplete} />
      ) : null}

      {/* Share Dialog */}
      <ResultShareDialog
        analysis={analysis}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}

function OverviewPanel({
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
  return (
    <div className="space-y-6">
      {/* Category Proportions Breakdown */}
      <Card className="border border-line bg-panel shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Category breakdowns</CardTitle>
              <CardDescription>
                Proportional scores evaluated across primary anatomical facial regions (0–10 reference scale).
              </CardDescription>
            </div>
            <span className="font-mono text-xs text-muted">0–10 SCALE</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {analysis.categoryScores.map((cat) => {
              const score = cat.score ?? 0;
              const pct = Math.min(100, Math.max(0, score * 10));
              return (
                <div
                  key={cat.category}
                  className="rounded-lg border border-line/70 bg-slate-50/60 p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-ink">{cat.label}</span>
                    <span className="font-mono text-sm font-bold text-accent">
                      {formatScore(cat.score)}
                    </span>
                  </div>

                  {/* Progress Track */}
                  <div className="h-2 w-full rounded-full bg-slate-200/80 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        score >= 8 ? "bg-good" : score >= 6.5 ? "bg-accent" : "bg-warn",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex justify-between font-mono text-[10px] text-muted">
                    <span>Reference: 8.0+</span>
                    <span>10.0</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 3-Column Key Insights Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Closest to Reference */}
        <Card className="border border-line bg-panel shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3">
            <span className="font-mono text-[11px] uppercase tracking-wider text-good font-semibold">
              CLOSEST TO REFERENCE
            </span>
            <CardTitle className="text-base">Optimal Proportions</CardTitle>
            <CardDescription>
              Measurements that align most closely with ideal anthropological bands.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y divide-line/60 text-xs">
              {strengths.length === 0 ? (
                <li className="py-2.5 text-muted">All scores within normal variance.</li>
              ) : null}
              {strengths.map((metric) => (
                <li key={metric.metricId} className="flex items-center justify-between py-2.5">
                  <span className="font-medium text-ink truncate mr-2">
                    {metric.definition?.label ?? metric.metricId}
                  </span>
                  <span className="font-mono font-semibold text-good shrink-0">
                    {formatScore(metric.score)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Furthest from Reference */}
        <Card className="border border-line bg-panel shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3">
            <span className="font-mono text-[11px] uppercase tracking-wider text-warn font-semibold">
              FURTHEST FROM REFERENCE
            </span>
            <CardTitle className="text-base">Largest Deviations</CardTitle>
            <CardDescription>
              Proportions with the largest numerical distance from standard literature limits.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y divide-line/60 text-xs">
              {deviations.length === 0 ? (
                <li className="py-2.5 text-muted">No substantial deviations detected.</li>
              ) : null}
              {deviations.map((metric) => (
                <li key={metric.metricId} className="flex items-center justify-between py-2.5">
                  <span className="font-medium text-ink truncate mr-2">
                    {metric.definition?.label ?? metric.metricId}
                  </span>
                  <span className="font-mono font-semibold text-warn shrink-0">
                    {formatScore(metric.score)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Highest Score Influence */}
        <Card className="border border-line bg-panel shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3">
            <span className="font-mono text-[11px] uppercase tracking-wider text-accent font-semibold">
              HIGHEST INFLUENCE
            </span>
            <CardTitle className="text-base">Potential Score Gain</CardTitle>
            <CardDescription>
              Measurements that would yield the greatest upward change in overall Harmony.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y divide-line/60 text-xs">
              {impacts.length === 0 ? (
                <li className="py-2.5 text-muted">All parameters fully optimized.</li>
              ) : null}
              {impacts.map((metric) => (
                <li key={metric.metricId} className="flex items-center justify-between py-2.5">
                  <span className="font-medium text-ink truncate mr-2">
                    {metric.definition?.label ?? metric.metricId}
                  </span>
                  <span className="font-mono font-semibold text-accent shrink-0">
                    +{formatScore(metric.impact)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MeasurementsPanel({
  analysis,
  metrics,
}: {
  analysis: AnalysisDetail;
  metrics: Array<StoredMetric & { definition?: (typeof METRICS)[number] }>;
}) {
  const [filter, setFilter] = useState<(typeof categoryFilterKeys)[number]>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(metrics[0]?.metricId ?? null);

  const visible = metrics.filter((metric) => {
    const label = metric.definition?.label ?? metric.metricId;
    const matchesFilter = filter === "all" || metric.category === filter;
    return matchesFilter && label.toLowerCase().includes(query.toLowerCase());
  });

  const current = metrics.find((metric) => metric.metricId === selected) ?? visible[0];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
      {/* Left Column: Filter pills, Search & Metric List */}
      <div className="space-y-4">
        {/* Category Filters */}
        <div className="flex flex-wrap gap-1.5">
          {categoryFilterKeys.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                filter === item
                  ? "border-accent bg-accent text-accent-ink shadow-xs"
                  : "border-line bg-panel text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {item === "all" ? "All categories" : CATEGORY_LABELS[item as MetricCategory]}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted/60" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search measurements"
            className="h-10 w-full rounded-md border border-line bg-panel pl-9 pr-3 text-sm text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Scrollable Metric List */}
        <div className="rounded-xl border border-line bg-panel divide-y divide-line overflow-hidden shadow-xs">
          {visible.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">
              No measurements found matching &ldquo;{query}&rdquo;.
            </div>
          ) : null}

          {visible.map((metric) => {
            const isSelected = current?.metricId === metric.metricId;
            return (
              <div
                key={metric.metricId}
                className={cn(
                  "p-4 transition-colors",
                  isSelected ? "bg-slate-50/90" : "hover:bg-slate-50/50",
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-ink">
                        {metric.definition?.label ?? metric.metricId}
                      </span>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {metric.view}
                      </Badge>
                    </div>

                    <p className="font-mono text-xs text-muted">
                      Value: <span className="text-ink font-medium">{formatMetricValue(metric.value, metric.unit)}</span>
                      {metric.value !== null ? (
                        <> · <span className="text-accent">{STANDING_LABEL[rangeStanding(metric.value, measurementScale(metric.referenceMin, metric.referenceMax, metric.definition?.referenceRange ?? null))]}</span></>
                      ) : null}
                      {" "}· Score <span className="font-bold text-ink">{formatScore(metric.score)}</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelected(metric.metricId)}
                    className={cn(
                      "self-start rounded px-2.5 py-1 text-xs font-semibold transition-colors border",
                      isSelected
                        ? "border-accent bg-accent text-accent-ink"
                        : "border-line bg-panel text-accent hover:bg-slate-100",
                    )}
                  >
                    View
                  </button>
                </div>

                <RangeTrack
                  min={metric.referenceMin}
                  max={metric.referenceMax}
                  idealMin={metric.definition?.referenceRange.idealMin ?? metric.referenceMin}
                  idealMax={metric.definition?.referenceRange.idealMax ?? metric.referenceMax}
                  value={metric.value}
                  unit={metric.unit}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Sticky Selected Metric Detail & Overlay Visualizer */}
      <div className="sticky top-20">
        <MetricDetailCard analysis={analysis} metric={current} />
      </div>
    </div>
  );
}

function MetricEvidencePanel({
  metric,
  scoringVersion,
}: {
  metric: StoredMetric & { definition?: (typeof METRICS)[number] };
  scoringVersion?: string | null;
}) {
  const evidence = metric.definition?.evidence;
  const currentModel = !scoringVersion || scoringVersion === "harmony-v2";
  const unit = metric.unit;
  const target = evidence?.bands.neutral.aestheticTarget;
  const population = evidence?.bands.neutral.populationRange;
  const source = evidence?.references[0];
  return (
    <div className="rounded-md border border-line bg-panel-muted p-3 text-xs space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="outline">{evidence ? evidenceBadge(evidence) : "Stored measurement"}</Badge>
        <span className="font-mono text-muted">
          Measurement confidence: {confidenceLabel(metric.measurementConfidence) ?? "—"}
        </span>
      </div>
      <div className="flex justify-between font-mono">
        <span className="text-muted">Measured:</span>
        <span className="font-bold text-ink">{formatMetricValue(metric.value, unit)}</span>
      </div>
      {currentModel && target ? (
        <div className="flex justify-between font-mono">
          <span className="text-muted">Aesthetic target:</span>
          <span className="text-ink">{formatRange(target.min, target.max, unit)}</span>
        </div>
      ) : null}
      <div className="flex justify-between font-mono">
        <span className="text-muted">Harmony range:</span>
        <span className="text-ink">{formatRange(metric.referenceMin, metric.referenceMax, unit)}</span>
      </div>
      {currentModel && population ? (
        <div className="flex justify-between font-mono">
          <span className="text-muted">Population range:</span>
          <span className="text-ink">{formatRange(population.min, population.max, unit)}</span>
        </div>
      ) : null}
      <div className="flex justify-between font-mono">
        <span className="text-muted">Contribution:</span>
        <span className="text-ink">{metric.contribution === null || metric.contribution === undefined ? "—" : formatScore(metric.contribution)}</span>
      </div>
      {!currentModel ? (
        <p className="text-[11px] leading-relaxed text-muted">
          This analysis is stored as {scoringVersion ?? "harmony-v1"}. The narrative below is the current Harmony V2 definition and was not used to produce the stored score.
        </p>
      ) : null}
      {evidence ? (
        <div className="space-y-1 border-t border-line/60 pt-1.5 text-[11px] leading-relaxed text-muted">
          <p><span className="font-medium text-ink/80">Source population:</span> {evidence.sourcePopulation}</p>
          {source ? (
            <p>
              <span className="font-medium text-ink/80">Research reference:</span> {source.authors ? `${source.authors} (${source.year}). ` : `${source.year}. `}
              {source.title}
              {source.pmid ? ` PMID ${source.pmid}.` : ""}
              {source.doi ? ` DOI ${source.doi}.` : ""}
            </p>
          ) : null}
          <p><span className="font-medium text-ink/80">Formula:</span> {metric.definition?.formula}</p>
          {evidence.limitations[0] ? <p><span className="font-medium text-ink/80">Limitation:</span> {evidence.limitations[0]}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function MetricDetailCard({
  analysis,
  metric,
}: {
  analysis: AnalysisDetail;
  metric?: StoredMetric & { definition?: (typeof METRICS)[number] };
}) {
  if (!metric?.definition) {
    return (
      <Card className="border border-line bg-panel p-6 text-center text-sm text-muted">
        Select a measurement to view its facial geometric vector.
      </Card>
    );
  }

  const view = metric.view as FaceView;
  const photo = analysis.photos.find((item) => item.view === view);
  const landmarks: SemanticLandmark[] = analysis.landmarks
    .filter((landmark) => landmark.view === view)
    .map(({ view: _view, ...landmark }) => landmark);

  return (
    <Card className="border border-line bg-panel shadow-xs overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="accent" className="capitalize">{view} metric</Badge>
          <span className="font-mono text-sm font-bold text-ink">
            Score: {formatScore(metric.score)}
          </span>
        </div>
        <CardTitle className="text-lg mt-1">{metric.definition.label}</CardTitle>
        <CardDescription>{metric.definition.explanation}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {photo ? (
          <div className="rounded-lg border border-line bg-slate-900 overflow-hidden shadow-inner">
            <FaceStage
              key={`${analysis.id}-${metric.metricId}-${view}`}
              src={`/api/analyses/${analysis.id}/photos/${view}`}
              width={photo.width}
              height={photo.height}
              landmarks={landmarks.filter((landmark) =>
                metric.definition?.requiredLandmarks.includes(landmark.key),
              )}
              overlay={metric.definition.overlay}
            />
          </div>
        ) : (
          <p className="text-xs text-signal p-4 text-center">Photo unavailable.</p>
        )}

        <MetricEvidencePanel metric={metric} scoringVersion={analysis.scoringVersion} />
      </CardContent>
    </Card>
  );
}

function PhotosPanel({
  analysis,
  metrics,
}: {
  analysis: AnalysisDetail;
  metrics: Array<StoredMetric & { definition?: (typeof METRICS)[number] }>;
}) {
  const [view, setView] = useState<FaceView>("front");
  const [selectedMetricId, setSelectedMetricId] = useState<string>("none");

  const photo = analysis.photos.find((p) => p.view === view);
  const metric = metrics.find((m) => m.metricId === selectedMetricId);

  const landmarks: SemanticLandmark[] = analysis.landmarks
    .filter((landmark) => landmark.view === view)
    .map(({ view: _view, ...landmark }) => landmark);

  return (
    <div className="space-y-6">
      {/* Photo Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-line bg-panel p-4 shadow-xs">
        <div className="inline-flex rounded-md border border-line bg-panel-muted p-1 text-xs">
          <button
            type="button"
            onClick={() => {
              setView("front");
              setSelectedMetricId("none");
            }}
            className={cn(
              "rounded-[4px] px-3.5 py-1.5 font-medium transition-colors",
              view === "front" ? "bg-panel text-accent font-semibold shadow-xs" : "text-muted hover:text-ink",
            )}
          >
            Front photograph
          </button>
          <button
            type="button"
            onClick={() => {
              setView("profile");
              setSelectedMetricId("none");
            }}
            className={cn(
              "rounded-[4px] px-3.5 py-1.5 font-medium transition-colors",
              view === "profile" ? "bg-panel text-accent font-semibold shadow-xs" : "text-muted hover:text-ink",
            )}
          >
            Profile photograph
          </button>
        </div>

        {/* Overlay Selector */}
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted shrink-0" />
          <select
            value={selectedMetricId}
            onChange={(e) => setSelectedMetricId(e.target.value)}
            className="h-9 rounded-md border border-line bg-panel px-3 text-xs text-ink focus:border-accent focus:outline-none"
          >
            <option value="none">Raw photograph (no overlay)</option>
            {metrics
              .filter((m) => m.view === view)
              .map((m) => (
                <option key={m.metricId} value={m.metricId}>
                  Overlay: {m.definition?.label ?? m.metricId}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Main Photographic Stage */}
      {photo ? (
        <div className="rounded-xl border border-line bg-slate-900 overflow-hidden shadow-xs">
          <FaceStage
            key={`${analysis.id}-${view}`}
            src={`/api/analyses/${analysis.id}/photos/${view}`}
            width={photo.width}
            height={photo.height}
            landmarks={
              metric?.definition
                ? landmarks.filter((l) => metric.definition?.requiredLandmarks.includes(l.key))
                : []
            }
            overlay={metric?.definition?.overlay ?? null}
          />
        </div>
      ) : (
        <Card className="border border-line bg-panel p-12 text-center text-muted">
          No {view} photograph available for this report.
        </Card>
      )}
    </div>
  );
}
