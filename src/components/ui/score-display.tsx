import * as React from "react";
import { cn } from "@/lib/utils";
import { formatScore } from "@/lib/format";

export interface ScoreDisplayProps {
  label: string;
  value: number | null | undefined;
  descriptor?: string;
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
  tone?: "neutral" | "accent" | "good";
}

export function ScoreDisplay({
  label,
  value,
  descriptor,
  size = "md",
  className,
  tone = "neutral",
}: ScoreDisplayProps) {
  const formatted = formatScore(value);

  const sizeClasses = {
    sm: {
      score: "text-xl",
      scale: "text-xs",
      label: "text-xs",
    },
    md: {
      score: "text-2xl sm:text-3xl",
      scale: "text-xs sm:text-sm",
      label: "text-xs",
    },
    lg: {
      score: "text-3xl sm:text-4xl",
      scale: "text-sm",
      label: "text-xs",
    },
    hero: {
      score: "text-4xl sm:text-5xl md:text-6xl tracking-tight",
      scale: "text-base sm:text-lg text-muted/70",
      label: "text-xs uppercase tracking-[0.14em]",
    },
  };

  const toneClasses = {
    neutral: "text-ink",
    accent: "text-accent",
    good: "text-good",
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <span className={cn("font-medium text-muted", sizeClasses[size].label)}>
        {label}
      </span>
      <div className="mt-1 flex items-baseline gap-1.5 font-mono">
        <span className={cn("font-semibold leading-none", toneClasses[tone], sizeClasses[size].score)}>
          {formatted}
        </span>
        {value !== null && value !== undefined && Number.isFinite(value) ? (
          <span className={cn("font-normal text-muted/60", sizeClasses[size].scale)}>
            / 10
          </span>
        ) : null}
      </div>
      {descriptor ? (
        <span className="mt-1.5 text-xs text-muted leading-relaxed">
          {descriptor}
        </span>
      ) : null}
    </div>
  );
}
