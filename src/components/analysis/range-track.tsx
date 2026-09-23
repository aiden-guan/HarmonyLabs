export function RangeTrack({ min, max, value }: { min: number; max: number; value: number | null }) {
  const span = max - min || 1;
  const windowMin = min - span * 0.75;
  const windowMax = max + span * 0.75;
  const pct = (point: number) => ((point - windowMin) / (windowMax - windowMin)) * 100;
  const marker = value === null ? null : Math.min(100, Math.max(0, pct(value)));
  return (
    <div className="mt-3">
      <div className="relative h-2 bg-[#e1e7ec]" aria-hidden>
        <div className="absolute inset-y-0 bg-[#c5d5e2]" style={{ left: `${pct(min)}%`, width: `${pct(max) - pct(min)}%` }} />
        {marker !== null ? <div className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-ink" style={{ left: `calc(${marker}% - 6px)` }} /> : null}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted">
        <span>low</span>
        <span>reference</span>
        <span>high</span>
      </div>
    </div>
  );
}
