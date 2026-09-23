"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[] | readonly TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  variant?: "underline" | "pills" | "segments";
}

export function Tabs<T extends string = string>({
  items,
  value,
  onChange,
  className,
  variant = "underline",
}: TabsProps<T>) {
  if (variant === "segments") {
    return (
      <div
        role="tablist"
        className={cn(
          "inline-flex h-9 items-center rounded-md border border-line bg-panel-muted p-1 text-xs text-muted",
          className,
        )}
      >
        {items.map((item) => {
          const isActive = item.id === value;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[4px] px-3 py-1 font-medium transition-all focus-visible:outline-2 focus-visible:outline-accent",
                isActive
                  ? "bg-panel text-ink shadow-xs"
                  : "text-muted hover:text-ink hover:bg-panel/50",
              )}
            >
              {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
              <span>{item.label}</span>
              {item.count !== undefined ? (
                <span className="ml-1 rounded px-1.5 py-0.2 font-mono text-[10px] bg-panel-muted text-muted">
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === "pills") {
    return (
      <div role="tablist" className={cn("flex flex-wrap gap-1.5", className)}>
        {items.map((item) => {
          const isActive = item.id === value;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent",
                isActive
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line bg-panel text-ink hover:border-line-strong hover:bg-panel-muted",
              )}
            >
              {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
              <span>{item.label}</span>
              {item.count !== undefined ? (
                <span className="ml-1 rounded px-1 font-mono text-[10px] bg-black/10">
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      className={cn(
        "flex gap-6 overflow-x-auto border-b border-line text-sm scrollbar-none",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.id === value;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "relative flex items-center gap-2 pb-3 pt-1 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent whitespace-nowrap",
              isActive
                ? "text-accent font-semibold"
                : "text-muted hover:text-ink",
            )}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null}
            <span>{item.label}</span>
            {item.count !== undefined ? (
              <span className="rounded-full bg-panel-muted px-2 py-0.5 font-mono text-[11px] text-muted">
                {item.count}
              </span>
            ) : null}
            {isActive ? (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
