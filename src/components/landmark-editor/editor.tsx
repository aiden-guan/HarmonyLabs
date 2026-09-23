"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaceStage } from "@/components/face-overlay/face-stage";
import { Button } from "@/components/ui/button";
import { LANDMARK_GUIDE, landmarkKeysForView } from "@/lib/face/semantic-landmarks";
import type { AnalysisDetail } from "@/lib/data/model";
import type { FaceView, SemanticLandmark, SemanticLandmarkKey } from "@/types/face";

function group(analysis: AnalysisDetail): Record<FaceView, SemanticLandmark[]> {
  const from = (view: FaceView) =>
    analysis.landmarks
      .filter((landmark) => landmark.view === view)
      .map(({ view: _view, ...landmark }) => landmark);
  return { front: from("front"), profile: from("profile") };
}

export function LandmarkEditor({ analysis }: { analysis: AnalysisDetail }) {
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
      router.push(`/analysis/${analysis.id}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not continue.");
      setPending(false);
    }
  }

  if (!photo) {
    return <p className="p-6 text-sm">This analysis is missing the {view} photograph.</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <p className="mb-3 text-sm text-muted md:hidden">
          Precise dragging is easier on a larger screen. You can still select a point and nudge it with the arrow keys.
        </p>
        <div className="mb-3 flex gap-2">
          {(["front", "profile"] as FaceView[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setView(item);
                viewRef.current = item;
                setSelected(landmarkKeysForView(item)[0] ?? null);
              }}
              className={`h-9 px-3 text-sm ${view === item ? "bg-accent text-accent-ink" : "border border-line bg-panel"}`}
            >
              {item === "front" ? "Front" : "Profile"}
            </button>
          ))}
        </div>
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
      <aside className="space-y-4">
        <div className="border border-line bg-panel p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Selected</p>
          <h2 className="mt-2 text-xl">{selectedLandmark ? LANDMARK_GUIDE[selectedLandmark.key].label : "None"}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {selectedLandmark ? LANDMARK_GUIDE[selectedLandmark.key].hint : "Choose a point on the photograph."}
          </p>
          {selectedLandmark ? (
            <p className="mt-3 font-mono text-sm">
              Detected confidence {Math.round(selectedLandmark.confidence * 100)}%
              <span className="mt-1 block text-muted">Source {selectedLandmark.source}</span>
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={reset}>Reset</Button>
            <Button variant="secondary" onClick={undo}>Undo</Button>
            <Button variant="secondary" onClick={redo}>Redo</Button>
          </div>
        </div>
        <ul className="max-h-72 space-y-1 overflow-auto border border-line bg-panel p-2">
          {current.map((landmark) => (
            <li key={landmark.key}>
              <button
                type="button"
                onClick={() => setSelected(landmark.key)}
                className={`flex w-full items-center justify-between px-2 py-1.5 text-left text-sm ${selected === landmark.key ? "bg-white text-accent" : ""}`}
              >
                <span>{LANDMARK_GUIDE[landmark.key].label}</span>
                <span className="font-mono text-xs text-muted">{Math.round(landmark.confidence * 100)}%</span>
              </button>
            </li>
          ))}
        </ul>
        {error ? <p role="alert" className="text-sm text-signal">{error}</p> : null}
        <Button onClick={continueFlow} disabled={pending} className="w-full">
          {pending ? "Saving…" : view === "front" ? "Continue to profile" : "Calculate measurements"}
        </Button>
      </aside>
    </div>
  );
}
