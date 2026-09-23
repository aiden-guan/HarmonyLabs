import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-accent text-accent-ink hover:bg-accent-hover active:opacity-95 shadow-xs",
  secondary: "border border-line bg-panel text-ink hover:bg-panel-muted hover:border-line-strong active:bg-panel",
  outline: "border border-line bg-transparent text-ink hover:bg-panel hover:border-line-strong",
  ghost: "text-ink hover:bg-panel-muted",
  danger: "border border-signal/20 bg-panel text-signal hover:bg-signal/5 hover:border-signal/40",
};

const sizes = {
  sm: "h-8 px-2.5 text-xs rounded-[5px]",
  md: "h-10 px-4 text-sm rounded-md",
  lg: "h-11 px-5 text-sm font-medium rounded-md",
  icon: "h-9 w-9 p-0 rounded-md",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-colors select-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

