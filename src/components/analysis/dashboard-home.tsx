"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Plus,
  Share2,
  Calendar,
  ChevronRight,
  ScanFace,
  TrendingUp,
} from "lucide-react";
import { formatScore, formatWhen, formatLongWhen } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResultShareDialog } from "@/components/share/result-share-dialog";
import type { AnalysisSummary } from "@/types/analysis";
import type { AnalysisDetail } from "@/lib/data/model";

export function DashboardHome({ analyses }: { analyses: AnalysisSummary[] }) {
  const complete = analyses.filter((item) => item.status === "complete" && item.harmonyScore !== null);
  const chronological = [...complete].reverse();
  const latest = complete[0];

  const [shareAnalysis, setShareAnalysis] = useState<AnalysisDetail | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [loadingShare, setLoadingShare] = useState(false);

  const chart = chronological.map((item) => ({
    label: formatWhen(item.createdAt),
    harmony: item.harmonyScore,
    name: item.name || "Analysis",
  }));

  async function openShare(id: string) {
    setLoadingShare(true);
    try {
      const res = await fetch(`/api/analyses/${id}`);
      if (!res.ok) throw new Error("Could not load analysis detail.");
      const data = await res.json();
      setShareAnalysis(data.analysis);
      setShareModalOpen(true);
    } catch {
      // Fallback
    } finally {
      setLoadingShare(false);
    }
  }

  return (
    <div id="history" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-accent font-semibold block">
            FACIAL GEOMETRY DASHBOARD
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            Your analyses
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Track facial measurements, reference alignments, and proportional Harmony across your scans.
          </p>
        </div>
        <Link href="/analysis/new">
          <Button size="md" className="gap-2 shadow-xs w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            <span>New analysis</span>
          </Button>
        </Link>
      </div>

      {/* Empty State */}
      {analyses.length === 0 ? (
        <section className="rounded-xl border border-line bg-panel p-8 sm:p-12 text-center max-w-2xl mx-auto my-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent mb-4">
            <ScanFace className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-ink tracking-tight">No facial analyses yet</h2>
          <p className="mt-2 text-sm text-muted leading-relaxed max-w-md mx-auto">
            Capture or upload a front photograph and a profile to generate your first proportional measurement report.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/analysis/new">
              <Button size="md" className="gap-2 shadow-xs">
                <Plus className="h-4 w-4" />
                <span>Start an analysis</span>
              </Button>
            </Link>
          </div>
        </section>
      ) : (
        <>
          {/* Latest Analysis Hero Panel */}
          {latest ? (
            <section className="rounded-xl border border-line bg-panel overflow-hidden shadow-xs">
              <div className="border-b border-line/60 bg-slate-50/70 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">
                    LATEST COMPLETED SCAN
                  </span>
                </div>
                <span className="font-mono text-xs text-muted flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted/70" />
                  {formatLongWhen(latest.createdAt)}
                </span>
              </div>

              <div className="p-6 sm:p-8 grid gap-6 md:grid-cols-12 md:items-center">
                {/* Thumbnail Column */}
                <div className="md:col-span-4 lg:col-span-3 flex justify-center md:justify-start">
                  <div className="relative h-44 w-36 sm:h-52 sm:w-40 rounded-lg overflow-hidden border border-line bg-slate-900 shadow-sm shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/analyses/${latest.id}/photos/front`}
                      alt="Latest front analysis photograph"
                      className="h-full w-full object-cover object-top"
                    />
                    <div className="absolute inset-0 border border-white/10 rounded-lg pointer-events-none" />
                  </div>
                </div>

                {/* Score & Insights Column */}
                <div className="md:col-span-8 lg:col-span-9 flex flex-col justify-between space-y-6">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-xl font-bold text-ink tracking-tight">
                          {latest.name || "Untitled Analysis"}
                        </h2>
                        <p className="text-xs text-muted mt-0.5">
                          Canonical front & profile geometry evaluation
                        </p>
                      </div>
                      <Badge variant="accent" className="font-mono">
                        {latest.isSample ? "Geometric Sample" : "Verified Landmarks"}
                      </Badge>
                    </div>

                    {/* Scores Grid */}
                    <div className="mt-5 grid grid-cols-3 gap-3 sm:gap-6 border-y border-line/60 py-4">
                      <div>
                        <span className="font-mono text-[11px] uppercase tracking-wider text-accent font-semibold block">
                          Harmony
                        </span>
                        <div className="mt-1 flex items-baseline gap-1 font-mono">
                          <span className="text-3xl sm:text-4xl font-bold text-ink">
                            {formatScore(latest.harmonyScore)}
                          </span>
                          <span className="text-xs text-muted">/ 10</span>
                        </div>
                        <span className="text-[11px] text-muted hidden sm:block mt-1">
                          Proportional reference
                        </span>
                      </div>

                      <div>
                        <span className="font-mono text-[11px] uppercase tracking-wider text-muted font-medium block">
                          Front view
                        </span>
                        <div className="mt-1 flex items-baseline gap-1 font-mono">
                          <span className="text-2xl sm:text-3xl font-semibold text-ink">
                            {formatScore(latest.frontScore)}
                          </span>
                          <span className="text-xs text-muted">/ 10</span>
                        </div>
                        <span className="text-[11px] text-muted hidden sm:block mt-1">
                          62% weighting
                        </span>
                      </div>

                      <div>
                        <span className="font-mono text-[11px] uppercase tracking-wider text-muted font-medium block">
                          Profile view
                        </span>
                        <div className="mt-1 flex items-baseline gap-1 font-mono">
                          <span className="text-2xl sm:text-3xl font-semibold text-ink">
                            {formatScore(latest.profileScore)}
                          </span>
                          <span className="text-xs text-muted">/ 10</span>
                        </div>
                        <span className="text-[11px] text-muted hidden sm:block mt-1">
                          38% weighting
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Link href={`/analysis/${latest.id}`}>
                      <Button size="md" className="gap-2 shadow-xs">
                        <span>View report</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>

                    <Button
                      variant="secondary"
                      size="md"
                      className="gap-2"
                      onClick={() => void openShare(latest.id)}
                      disabled={loadingShare}
                    >
                      <Share2 className="h-4 w-4" />
                      <span>{loadingShare ? "Preparing card…" : "Share results"}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {/* Trend Section (if > 1 scans) */}
          {chart.length > 1 ? (
            <section className="rounded-xl border border-line bg-panel p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-accent" />
                  <h2 className="text-base font-bold text-ink tracking-tight">Harmony score progression</h2>
                </div>
                <span className="font-mono text-xs text-muted">0–10 scale</span>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart} margin={{ left: -16, right: 16, top: 12, bottom: 4 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 10]}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                      width={32}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as { label: string; harmony: number; name: string };
                          return (
                            <div className="rounded-md border border-line bg-panel p-2.5 shadow-md text-xs">
                              <p className="font-medium text-ink">{data.name}</p>
                              <p className="text-muted text-[11px]">{data.label}</p>
                              <p className="mt-1 font-mono font-semibold text-accent">
                                Harmony: {formatScore(data.harmony)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="harmony"
                      stroke="#0c4a6e"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#0c4a6e", stroke: "#ffffff", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#0c4a6e" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          ) : null}

          {/* History Scan List */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink tracking-tight">Saved scans</h2>
              <span className="font-mono text-xs text-muted">
                {analyses.length} {analyses.length === 1 ? "record" : "records"}
              </span>
            </div>

            <div className="rounded-xl border border-line bg-panel divide-y divide-line overflow-hidden shadow-xs">
              {analyses.map((analysis) => {
                const isComplete = analysis.status === "complete";
                return (
                  <Link
                    key={analysis.id}
                    href={`/analysis/${analysis.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:px-6 hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Left: Thumbnail & Info */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative h-14 w-12 rounded-md overflow-hidden border border-line bg-slate-900 shrink-0 flex items-center justify-center text-slate-400">
                        {isComplete ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/analyses/${analysis.id}/photos/front`}
                            alt=""
                            className="h-full w-full object-cover object-top"
                          />
                        ) : (
                          <ScanFace className="h-6 w-6 text-muted" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-ink group-hover:text-accent transition-colors truncate">
                            {analysis.name || "Untitled Analysis"}
                          </p>
                          {analysis.isSample ? (
                            <Badge variant="outline" className="text-[10px] py-0">Sample</Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          {formatWhen(analysis.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Right: Scores & Chevron */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/60">
                      {isComplete ? (
                        <div className="flex items-center gap-5 text-right font-mono">
                          <div>
                            <span className="block text-xs text-muted font-sans font-medium">Front / Prof</span>
                            <span className="text-xs text-ink/80">
                              {formatScore(analysis.frontScore)} · {formatScore(analysis.profileScore)}
                            </span>
                          </div>

                          <div className="pl-3 border-l border-line/60">
                            <span className="block text-[11px] uppercase tracking-wider text-accent font-sans font-semibold">
                              Harmony
                            </span>
                            <span className="text-lg font-bold text-ink">
                              {formatScore(analysis.harmonyScore)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <Badge variant="warning">Incomplete</Badge>
                      )}

                      <ChevronRight className="h-4 w-4 text-muted/60 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Share Dialog if triggered from dashboard */}
      {shareAnalysis ? (
        <ResultShareDialog
          analysis={shareAnalysis}
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
