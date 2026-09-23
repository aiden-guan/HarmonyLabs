"use client";

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
import { formatScore, formatWhen } from "@/lib/format";
import type { AnalysisSummary } from "@/types/analysis";

export function DashboardHome({ analyses }: { analyses: AnalysisSummary[] }) {
  const complete = analyses.filter((item) => item.status === "complete" && item.harmonyScore !== null);
  const chronological = [...complete].reverse();
  const latest = complete[0];
  const chart = chronological.map((item) => ({
    label: formatWhen(item.createdAt),
    harmony: item.harmonyScore,
  }));

  return (
    <div id="history" className="mx-auto max-w-6xl px-5 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">Overview</p>
          <h1 className="mt-2 text-3xl tracking-tight">Saved analyses</h1>
        </div>
        <Link href="/analysis/new" className="inline-flex h-10 items-center bg-accent px-4 text-sm text-accent-ink">
          New analysis
        </Link>
      </header>

      {analyses.length === 0 ? (
        <section className="mt-8 border border-line bg-panel p-6">
          <h2 className="text-xl">No analyses yet</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            Take or upload a front photograph and a profile, or open the geometric sample to see how measurements are scored.
          </p>
          <Link href="/analysis/new" className="mt-4 inline-flex h-10 items-center border border-line bg-white px-4 text-sm">
            Start an analysis
          </Link>
        </section>
      ) : (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="border border-line bg-panel p-4">
              <p className="text-sm text-muted">Latest Harmony</p>
              <p className="mt-2 font-mono text-3xl">{formatScore(latest?.harmonyScore)}</p>
            </article>
            <article className="border border-line bg-panel p-4">
              <p className="text-sm text-muted">Front</p>
              <p className="mt-2 font-mono text-3xl">{formatScore(latest?.frontScore)}</p>
            </article>
            <article className="border border-line bg-panel p-4">
              <p className="text-sm text-muted">Profile</p>
              <p className="mt-2 font-mono text-3xl">{formatScore(latest?.profileScore)}</p>
            </article>
          </div>
          {chart.length > 1 ? (
            <section className="mt-6 h-72 border border-line bg-panel p-4">
              <p className="mb-2 text-sm text-muted">Harmony over time</p>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={chart} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid stroke="#d3dde6" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} width={32} />
                  <Tooltip />
                  <Line type="monotone" dataKey="harmony" stroke="#1c4e6e" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </section>
          ) : null}
          <section className="mt-8">
            <h2 className="text-lg">History</h2>
            <ul className="mt-3 divide-y divide-line border border-line bg-panel">
              {analyses.map((analysis) => (
                <li key={analysis.id}>
                  <Link href={`/analysis/${analysis.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-white">
                    <span>
                      <span className="block text-sm">{formatWhen(analysis.createdAt)}</span>
                      <span className="block text-xs text-muted">{analysis.name}</span>
                    </span>
                    <span className="text-right">
                      <span className="block font-mono text-sm">
                        {analysis.status === "complete" ? formatScore(analysis.harmonyScore) : "Incomplete"}
                      </span>
                      <span className="block text-xs text-muted">Harmony</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
