"use client";

import * as React from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ResultSharePreviewProps {
  previewUrl: string | null;
  loading: boolean;
  error: string | null;
  className?: string;
}

/**
 * Renders the 4:5 portrait preview for the HarmonyLabs share card.
 * Maintains a consistent layout corresponding to the 1080x1350 canvas output.
 */
export function ResultSharePreview({
  previewUrl,
  loading,
  error,
  className,
}: ResultSharePreviewProps) {
  return (
    <div
      className={cn(
        "relative w-full max-w-[260px] sm:max-w-[300px] aspect-[4/5] overflow-hidden rounded-lg border border-line bg-slate-950 shadow-md flex items-center justify-center select-none",
        className,
      )}
      data-testid="share-card-preview"
    >
      {/* Decorative lab corner registration marks */}
      <div className="pointer-events-none absolute left-2 top-2 h-2 w-2 border-l border-t border-sky-400/60 z-10" />
      <div className="pointer-events-none absolute right-2 top-2 h-2 w-2 border-r border-t border-sky-400/60 z-10" />
      <div className="pointer-events-none absolute bottom-2 left-2 h-2 w-2 border-b border-l border-sky-400/60 z-10" />
      <div className="pointer-events-none absolute bottom-2 right-2 h-2 w-2 border-b border-r border-sky-400/60 z-10" />

      {loading ? (
        <div className="flex flex-col items-center gap-2 text-slate-400 p-4 text-center z-10">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
          <span className="text-xs font-mono text-slate-300">Generating share card…</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 p-6 text-center text-signal z-10">
          <AlertCircle className="h-6 w-6" />
          <p className="text-xs leading-relaxed">{error}</p>
        </div>
      ) : previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="HarmonyLabs Shareable Result Card Preview"
          className="h-full w-full object-contain"
        />
      ) : null}
    </div>
  );
}
