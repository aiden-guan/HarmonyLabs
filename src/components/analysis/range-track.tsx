import { formatMetricValue } from "@/lib/format";
import { measurementScale, rangeStanding, rangeSummary } from "@/lib/face/scoring/placement";
import type { MetricUnit } from "@/types/face";

export function RangeTrack({
  min,
  max,
  idealMin,
  idealMax,
  value,
  unit,
}: {
  min: number;
  max: number;
  idealMin: number;
  idealMax: number;
  value: number | null;
  unit: MetricUnit;
}) {
  const scale = measurementScale(min, max, { idealMin, idealMax });
  const standing = value === null || !Number.isFinite(value) ? null : rangeStanding(value, scale);
  const summary =
    standing === null || value === null
      ? "This measurement could not be calculated."
      : rangeSummary(standing, value, scale, unit);
  const span = scale.max - scale.min || 1;
  const windowMin = scale.min - span * 0.75;
  const windowMax = scale.max + span * 0.75;
  const pct = (point: number) => ((point - windowMin) / (windowMax - windowMin)) * 100;
  const zone = (start: number, end: number) => ({
    left: pct(start),
    width: Math.max(0, pct(end) - pct(start)),
  });
  const below = zone(windowMin, scale.min);
  const lowAverage = zone(scale.min, scale.idealMin);
  const great = zone(scale.idealMin, scale.idealMax);
  const highAverage = zone(scale.idealMax, scale.max);
  const above = zone(scale.max, windowMax);
  const marker = value === null || !Number.isFinite(value) ? null : Math.min(100, Math.max(0, pct(value)));
  return (
    <div className="mt-3">
      <div className="relative h-2 bg-[#e1e7ec]" role="img" aria-label={summary}>
        <Zone left={below.left} width={below.width} className="bg-[#e1e7ec]" />
        <Zone left={lowAverage.left} width={lowAverage.width} className="bg-[#b7c9d6]" />
        <Zone left={great.left} width={great.width} className="bg-accent" />
        <Zone left={highAverage.left} width={highAverage.width} className="bg-[#b7c9d6]" />
        <Zone left={above.left} width={above.width} className="bg-[#e1e7ec]" />
        {marker !== null ? (
          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-ink bg-white"
            style={{ left: `calc(${marker}% - 7px)` }}
          />
        ) : null}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted">
        <span>Below usual</span>
        <span>Great</span>
        <span>Above usual</span>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted">
        <span className={standing ? standingClass(standing) : undefined}>{summary}</span>
      </p>
      <p className="sr-only">
        {value === null ? "No value" : `Value ${formatMetricValue(value, unit)}`}
      </p>
    </div>
  );
}

function Zone({ left, width, className }: { left: number; width: number; className: string }) {
  if (width <= 0) return null;
  return <div className={`absolute inset-y-0 ${className}`} style={{ left: `${left}%`, width: `${width}%` }} />;
}

function standingClass(standing: "great" | "average" | "low" | "high"): string {
  if (standing === "great") return "text-good";
  if (standing === "average") return "text-ink";
  return "text-warn";
}
