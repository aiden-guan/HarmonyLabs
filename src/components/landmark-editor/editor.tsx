"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RotateCcw,
  Undo2,
  Redo2,
  ArrowRight,
} from "lucide-react";
import { FaceStage } from "@/components/face-overlay/face-stage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LANDMARK_GUIDE, landmarkKeysForView } from "@/lib/face/semantic-landmarks";
import { cn } from "@/lib/utils";
import type { AnalysisDetail } from "@/lib/data/model";
import type { FaceView, SemanticLandmark, SemanticLandmarkKey } from "@/types/face";

function group(analysis: AnalysisDetail): Record<FaceView, SemanticLandmark[]> {
  const from = (view: FaceView) =>
    analysis.landmarks
      .filter((landmark) => landmark.view === view)
      .map(({ view: _view, ...landmark }) => landmark);
  return { front: from("front"), profile: from("profile") };
}

export function LandmarkEditor({
  analysis,
  isGuest = false,
}: {
  analysis: AnalysisDetail;
  isGuest?: boolean;
}) {
  const router = useRouter();
  const initial = useMemo(() => group(analysis), [analysis]);
  const baseline = useMemo(
    () => ({
      front: analysis.detectedLandmarks.front ?? initial.front,
      profile: analysis.detectedLandmarks.profile ?? initial.profile,
    }),
    [analysis.detectedLandmarks, initial],
  );
  const [view, setView] = useState<FaceView>("front");
  const [landmarks, setLandmarks] = useState(initial);
  const landmarksRef = useRef(initial);
  const viewRef = useRef<FaceView>("front");
  const [selected, setSelected] = useState<SemanticLandmarkKey | null>(landmarkKeysForView("front")[0] ?? null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const past = useRef<Record<FaceView, SemanticLandmark[][]>>({ front: [], profile: [] });
  const future = useRef<Record<FaceView, SemanticLandmark[][]>>({ front: [], profile: [] });
  const beforeDrag = useRef<SemanticLandmark[] | null>(null);

  const current = landmarks[view];
  const photo = analysis.photos.find((item) => item.view === view);
  const selectedLandmark = current.find((item) => item.key === selected) ?? null;

  function updatePoint(key: SemanticLandmarkKey, point: { x: number; y: number }) {
    const activeView = viewRef.current;
    if (!beforeDrag.current) beforeDrag.current = landmarksRef.current[activeView];
    setLandmarks((state) => {
      const next = {
        ...state,
        [activeView]: state[activeView].map((landmark) =>
          landmark.key === key ? { ...landmark, ...point, source: "manual" as const } : landmark,
        ),
      };
      landmarksRef.current = next;
      return next;
    });
  }

  async function persist(next = landmarksRef.current, activeView = viewRef.current) {
    const response = await fetch(`/api/analyses/${analysis.id}/landmarks`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ view: activeView, landmarks: next[activeView] }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "Could not save landmarks.");
  }

  function commit() {
    const activeView = viewRef.current;
    if (beforeDrag.current) {
      past.current[activeView].push(beforeDrag.current);
      past.current[activeView] = past.current[activeView].slice(-50);
      future.current[activeView] = [];
      beforeDrag.current = null;
    }
    void persist().catch((reason) => setError(reason instanceof Error ? reason.message : "Could not save landmarks."));
  }

  function undo() {
    const previous = past.current[view].pop();
    if (!previous) return;
    future.current[view].push(landmarksRef.current[view]);
    const next = { ...landmarksRef.current, [view]: previous };
    landmarksRef.current = next;
    setLandmarks(next);
    void persist(next, view).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not save landmarks."));
  }

  function redo() {
    const nextView = future.current[view].pop();
    if (!nextView) return;
    past.current[view].push(landmarksRef.current[view]);
    const next = { ...landmarksRef.current, [view]: nextView };
    landmarksRef.current = next;
    setLandmarks(next);
    void persist(next, view).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not save landmarks."));
  }

  function placeTrichion() {
    const activeView = viewRef.current;
    if (activeView !== "front") return;
    if (landmarksRef.current.front.some((landmark) => landmark.key === "trichion")) {
      setSelected("trichion");
      return;
    }
    past.current.front.push(landmarksRef.current.front);
    future.current.front = [];
    const added: SemanticLandmark = {
      key: "trichion",
      x: 0.5,
      y: 0.08,
      confidence: 1,
      source: "manual",
    };
    const next = { ...landmarksRef.current, front: [...landmarksRef.current.front, added] };
    landmarksRef.current = next;
    setLandmarks(next);
    setSelected("trichion");
    void persist(next, "front").catch((reason) => setError(reason instanceof Error ? reason.message : "Could not save landmarks."));
  }

  function reset() {
    past.current[view].push(landmarksRef.current[view]);
    future.current[view] = [];
    const next = { ...landmarksRef.current, [view]: baseline[view] };
    landmarksRef.current = next;
    setLandmarks(next);
    void persist(next, view).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not save landmarks."));
  }

  async function continueFlow() {
    if (landmarksRef.current[view].length === 0) {
      setError(`Place landmarks on the ${view} photograph before continuing.`);
      return;
    }
    setPending(true);
    setError("");
    try {
      await persist();
      if (view === "front") {
        viewRef.current = "profile";
        setView("profile");
        setSelected(landmarkKeysForView("profile")[0] ?? null);
        setPending(false);
        return;
      }
      const response = await fetch(`/api/analyses/${analysis.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front: landmarksRef.current.front,
          profile: landmarksRef.current.profile,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not calculate measurements.");
      if (body.requiresAuth || isGuest) {
        router.push(`/auth/login?next=${encodeURIComponent(`/analysis/${analysis.id}`)}&reason=view_results`);
      } else {
        router.push(`/analysis/${analysis.id}`);
        router.refresh();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not continue.");
      setPending(false);
    }
  }

  if (!photo) {
    return (
      <div className="rounded-lg border border-line bg-panel p-8 text-center">
        <p className="text-sm text-muted">This analysis is missing the {view} photograph.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-accent font-semibold block">
            LANDMARK VERIFICATION{analysis.name ? ` · ${analysis.name}` : ""}
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            Review proposed landmarks
          </h1>
          <p className="mt-0.5 text-xs text-muted">
            Drag any point to adjust coordinates. Arrow keys nudge selected point (Shift for larger step).
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-line bg-panel-muted p-1 text-xs">
            {(["front", "profile"] as FaceView[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setView(item);
                  viewRef.current = item;
                  setSelected(landmarkKeysForView(item)[0] ?? null);
                }}
                className={cn(
                  "rounded-[4px] px-3.5 py-1.5 font-medium transition-colors",
                  view === item
                    ? "bg-panel text-accent font-semibold shadow-xs"
                    : "text-muted hover:text-ink",
                )}
              >
                {item === "front" ? "Front view" : "Profile view"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Face Stage + Sidebar */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
        {/* Left: Interactive Canvas */}
        <div className="space-y-3">
          <div className="rounded-xl border border-line bg-slate-900 overflow-hidden shadow-xs">
            <FaceStage
              src={`/api/analyses/${analysis.id}/photos/${view}`}
              width={photo.width}
              height={photo.height}
              landmarks={current}
              interactive
              selected={selected}
              onSelect={setSelected}
              onMove={updatePoint}
              onCommit={commit}
            />
          </div>

          <p className="text-[11px] text-muted text-center">
            Scroll or pinch to zoom. Click and drag background to pan. Click any point to select.
          </p>
        </div>

        {/* Right Sidebar: Selected Landmark Detail + List */}
        <aside className="space-y-4">
          {/* Selected Landmark Card */}
          <Card className="border border-line bg-panel shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted font-medium">
                  SELECTED LANDMARK
                </span>
                {selectedLandmark ? (
                  <Badge variant={selectedLandmark.source === "manual" ? "accent" : "outline"}>
                    {selectedLandmark.source === "manual" ? "Adjusted" : "Auto-detected"}
                  </Badge>
                ) : null}
              </div>
              <CardTitle className="text-lg">
                {selectedLandmark ? LANDMARK_GUIDE[selectedLandmark.key].label : "None selected"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted leading-relaxed">
                {selectedLandmark
                  ? LANDMARK_GUIDE[selectedLandmark.key].hint
                  : "Click a landmark on the photograph to inspect and reposition it."}
              </p>

              {selectedLandmark ? (
                <div className="flex items-center justify-between pt-2 border-t border-line/60 font-mono text-xs text-muted">
                  <span>Confidence</span>
                  <span className="font-semibold text-ink">
                    {Math.round(selectedLandmark.confidence * 100)}%
                  </span>
                </div>
              ) : null}

              {/* History Controls */}
              <div className="flex items-center gap-1.5 pt-3 border-t border-line/60">
                <Button variant="secondary" size="sm" onClick={reset} className="flex-1 gap-1 text-xs">
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={undo} className="flex-1 gap-1 text-xs">
                  <Undo2 className="h-3 w-3" />
                  <span>Undo</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={redo} className="flex-1 gap-1 text-xs">
                  <Redo2 className="h-3 w-3" />
                  <span>Redo</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Landmarks Navigation List */}
          <Card className="border border-line bg-panel shadow-xs">
            <CardHeader className="py-2.5 px-4 border-b border-line/60 flex flex-row items-center justify-between gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted font-medium">
                {view === "front" ? "Front" : "Profile"} points ({current.length})
              </span>
              {view === "front" && !current.some((landmark) => landmark.key === "trichion") ? (
                <button type="button" onClick={placeTrichion} className="text-[11px] font-medium text-accent">
                  Add hairline
                </button>
              ) : null}
            </CardHeader>
            <div className="max-h-60 overflow-y-auto divide-y divide-line/40 p-1">
              {current.map((landmark) => {
                const isSelected = selected === landmark.key;
                return (
                  <button
                    key={landmark.key}
                    type="button"
                    onClick={() => setSelected(landmark.key)}
                    className={cn(
                      "flex w-full items-center justify-between rounded px-3 py-1.5 text-left text-xs transition-colors",
                      isSelected
                        ? "bg-accent/10 text-accent font-semibold"
                        : "text-ink hover:bg-slate-50",
                    )}
                  >
                    <span className="truncate">{LANDMARK_GUIDE[landmark.key].label}</span>
                    <span className="font-mono text-[10px] text-muted shrink-0 ml-2">
                      {Math.round(landmark.confidence * 100)}%
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {error ? (
            <div role="alert" className="rounded-md border border-signal/20 bg-signal/5 p-3 text-xs text-signal">
              {error}
            </div>
          ) : null}

          {/* Flow Progression Button */}
          <Button
            onClick={continueFlow}
            disabled={pending}
            className="w-full gap-2 shadow-xs"
            size="lg"
          >
            <span>
              {pending
                ? "Saving…"
                : view === "front"
                ? "Continue to profile"
                : "Calculate measurements"}
            </span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </aside>
      </div>
    </div>
  );
}
