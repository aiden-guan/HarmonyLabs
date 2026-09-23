import type { MetricUnit } from "@/types/face";

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toFixed(2);
}

export function formatMetricValue(value: number | null | undefined, unit: MetricUnit): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (unit === "degrees") return `${value.toFixed(1)}°`;
  if (unit === "percent") return `${value.toFixed(1)}%`;
  return value.toFixed(3);
}

export function formatRange(min: number, max: number, unit: MetricUnit): string {
  return `${formatMetricValue(min, unit)}–${formatMetricValue(max, unit)}`;
}

export function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function formatLongWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}
