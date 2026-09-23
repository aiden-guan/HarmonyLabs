import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = {
  default: "border-line bg-panel-muted text-ink",
  accent: "border-accent/20 bg-accent/10 text-accent",
  success: "border-good/25 bg-good/10 text-good",
  warning: "border-warn/25 bg-warn/10 text-warn",
  danger: "border-signal/25 bg-signal/10 text-signal",
  outline: "border-line text-muted bg-transparent",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof badgeVariants;
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-[11px] font-medium transition-colors",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
