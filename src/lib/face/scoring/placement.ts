import { formatRange } from "@/lib/format";
import type { MetricUnit } from "@/types/face";

export interface MeasurementScale {
  min: number;
  max: number;
  idealMin: number;
  idealMax: number;
}

export type RangeStanding = "great" | "average" | "low" | "high";

export const STANDING_LABEL: Record<RangeStanding, string> = {
  great: "Great",
  average: "Average",
  low: "Below usual",
  high: "Above usual",
};

export function measurementScale(
  storedMin: number,
  storedMax: number,
  ideal: { idealMin: number; idealMax: number } | null,
): MeasurementScale {
  const min = Math.min(storedMin, storedMax);
  const max = Math.max(storedMin, storedMax);
  const idealMin = ideal?.idealMin ?? min;
  const idealMax = ideal?.idealMax ?? max;
  if (idealMin < min || idealMax > max || idealMax < idealMin) {
    return { min, max, idealMin: min, idealMax: max };
  }
  return { min, max, idealMin, idealMax };
}

export function rangeStanding(value: number, scale: MeasurementScale): RangeStanding {
  if (value >= scale.idealMin && value <= scale.idealMax) return "great";
  if (value >= scale.min && value <= scale.max) return "average";
  if (value < scale.min) return "low";
  return "high";
}

export function rangeSummary(
  standing: RangeStanding,
  value: number,
  scale: MeasurementScale,
  unit: MetricUnit,
): string {
  const ideal = formatRange(scale.idealMin, scale.idealMax, unit);
  const usual = formatRange(scale.min, scale.max, unit);
  if (standing === "great") {
    return `Ideal is ${ideal}. Usual is ${usual}. This result is in the ideal range.`;
  }
  if (standing === "average") {
    const side = value < scale.idealMin ? "on the low side of ideal" : "on the high side of ideal";
    return `Usual is ${usual}. Ideal is ${ideal}. This result is inside the usual range, ${side}.`;
  }
  if (standing === "low") {
    return `Usual is ${usual}. Ideal is ${ideal}. This result is below the usual range.`;
  }
  return `Usual is ${usual}. Ideal is ${ideal}. This result is above the usual range.`;
}
