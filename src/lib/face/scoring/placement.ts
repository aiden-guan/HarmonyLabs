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
  great: "Within target",
  average: "Near target",
  low: "Outside reference",
  high: "Outside reference",
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
    return `Aesthetic target is ${ideal}. Harmony range is ${usual}. This result is within target.`;
  }
  if (standing === "average") {
    return `Harmony range is ${usual}. Aesthetic target is ${ideal}. This result is near target.`;
  }
  if (standing === "low") {
    return `Harmony range is ${usual}. Aesthetic target is ${ideal}. This result is outside reference.`;
  }
  return `Harmony range is ${usual}. Aesthetic target is ${ideal}. This result is outside reference.`;
}
