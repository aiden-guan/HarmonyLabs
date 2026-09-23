"use client";

import { useEffect, useRef, useState } from "react";
import type { MetricOverlay, SemanticLandmark, SemanticLandmarkKey } from "@/types/face";
import { LANDMARK_GUIDE } from "@/lib/face/semantic-landmarks";

export function FaceStage({
  src,
  width,
  height,
  landmarks,
  interactive = false,
  selected,
  overlay,
  onSelect,
  onMove,
  onCommit,
}: {
  src: string;
  width: number;
  height: number;
  landmarks: SemanticLandmark[];
  interactive?: boolean;
  selected?: SemanticLandmarkKey | null;
  overlay?: MetricOverlay | null;
  onSelect?: (key: SemanticLandmarkKey) => void;
  onMove?: (key: SemanticLandmarkKey, point: { x: number; y: number }) => void;
  onCommit?: () => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [natural, setNatural] = useState({ width, height });
  const [renderedWidth, setRenderedWidth] = useState(0);
  const [coarsePointer, setCoarsePointer] = useState(false);
  const drag = useRef<{ key?: SemanticLandmarkKey; pan?: { x: number; y: number; px: number; py: number } } | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    const apply = () => setCoarsePointer(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    const measure = () => {
      const next = node.clientWidth;
      setRenderedWidth((current) => (Math.abs(current - next) < 1 ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [natural.width, natural.height]);

  useEffect(() => {
    const node = frame.current;
    if (!node || !interactive) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((current) => Math.min(6, Math.max(1, current * (event.deltaY > 0 ? 0.92 : 1.08))));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [interactive]);

  function localPoint(event: React.PointerEvent) {
    const svg = svgRef.current;
    if (!svg) return null;
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    return {
      x: Math.min(1, Math.max(0, local.x / natural.width)),
      y: Math.min(1, Math.max(0, local.y / natural.height)),
    };
  }

  function move(event: React.PointerEvent) {
    if (!drag.current) return;
    if (drag.current.pan) {
      const start = drag.current.pan;
      setPan({ x: start.x + (event.clientX - start.px), y: start.y + (event.clientY - start.py) });
      return;
    }
    if (!drag.current.key) return;
    const point = localPoint(event);
    if (!point) return;
    onMove?.(drag.current.key, point);
  }

  const fittedWidth = Math.max(1, natural.width);
  const fittedHeight = Math.max(1, natural.height);
  const cssRadius = coarsePointer ? (interactive ? 12 : 7) : interactive ? 6 : 4;
  const pointRadius = renderedWidth > 0 ? (cssRadius * fittedWidth) / renderedWidth : interactive ? 8 : 5;

  return (
    <div
      ref={frame}
      className="relative overflow-hidden border border-line bg-[#d5dee6]"
      style={{ touchAction: interactive ? "none" : "pan-y" }}
    >
      <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "center center" }}>
        <div
          ref={stage}
          className="relative mx-auto"
          style={{
            aspectRatio: `${fittedWidth} / ${fittedHeight}`,
            width: `min(100%, calc(min(78dvh, 960px) * ${fittedWidth} / ${fittedHeight}))`,
            maxHeight: "min(78dvh, 960px)",
          }}
        >
        {/* Private analysis photos must not pass through the public image optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain select-none"
          onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
        />
        <svg
          ref={svgRef}
          viewBox={`0 0 ${natural.width} ${natural.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
          onPointerDown={(event) => {
            if (!interactive) return;
            if ((event.target as SVGElement).dataset.landmark) return;
            drag.current = { pan: { ...pan, px: event.clientX, py: event.clientY } };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={move}
          onPointerUp={() => {
            const committed = Boolean(drag.current?.key);
            drag.current = null;
            if (committed) onCommit?.();
          }}
        >
          <Registration width={natural.width} height={natural.height} />
          {overlay ? <OverlayDrawing overlay={overlay} landmarks={landmarks} width={natural.width} height={natural.height} /> : null}
          {landmarks.map((landmark) => {
            const active = landmark.key === selected;
            return (
              <circle
                key={landmark.key}
                data-landmark={landmark.key}
                cx={landmark.x * natural.width}
                cy={landmark.y * natural.height}
                r={active ? pointRadius * 1.35 : pointRadius}
                fill={active ? "#1c4e6e" : "#f7f9fb"}
                stroke="#1c4e6e"
                strokeWidth={Math.max(1.4, pointRadius * 0.18)}
                className={interactive ? "cursor-grab" : ""}
                role={interactive ? "button" : undefined}
                aria-label={LANDMARK_GUIDE[landmark.key]?.label ?? landmark.key}
                tabIndex={interactive ? 0 : undefined}
                onPointerDown={(event) => {
                  if (!interactive) return;
                  event.stopPropagation();
                  drag.current = { key: landmark.key };
                  onSelect?.(landmark.key);
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onKeyDown={(event) => {
                  if (!interactive) return;
                  const step = event.shiftKey ? 0.01 : 0.002;
                  const delta = { x: 0, y: 0 };
                  if (event.key === "ArrowLeft") delta.x = -step;
                  if (event.key === "ArrowRight") delta.x = step;
                  if (event.key === "ArrowUp") delta.y = -step;
                  if (event.key === "ArrowDown") delta.y = step;
                  if (!delta.x && !delta.y) return;
                  event.preventDefault();
                  onSelect?.(landmark.key);
                  onMove?.(landmark.key, {
                    x: Math.min(1, Math.max(0, landmark.x + delta.x)),
                    y: Math.min(1, Math.max(0, landmark.y + delta.y)),
                  });
                  onCommit?.();
                }}
              >
                <title>{LANDMARK_GUIDE[landmark.key]?.label ?? landmark.key}</title>
              </circle>
            );
          })}
        </svg>
        </div>
      </div>
      {interactive ? (
        <div className="absolute bottom-3 right-3 flex gap-2">
          <button type="button" className="bg-panel px-2 py-1 text-xs" onClick={() => setZoom((value) => Math.max(1, value / 1.2))}>
            −
          </button>
          <button type="button" className="bg-panel px-2 py-1 text-xs" onClick={() => setZoom((value) => Math.min(6, value * 1.2))}>
            +
          </button>
          <button type="button" className="bg-panel px-2 py-1 text-xs" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
            Fit
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Registration({ width, height }: { width: number; height: number }) {
  const inset = Math.min(width, height) * 0.03;
  const size = inset * 1.4;
  return (
    <g stroke="#1c4e6e" strokeWidth="1.2" fill="none" opacity="0.8">
      <path d={`M ${inset} ${inset + size} V ${inset} H ${inset + size}`} />
      <path d={`M ${width - inset} ${inset + size} V ${inset} H ${width - inset - size}`} />
      <path d={`M ${inset} ${height - inset - size} V ${height - inset} H ${inset + size}`} />
      <path d={`M ${width - inset} ${height - inset - size} V ${height - inset} H ${width - inset - size}`} />
    </g>
  );
}

function OverlayDrawing({
  overlay,
  landmarks,
  width,
  height,
}: {
  overlay: MetricOverlay;
  landmarks: SemanticLandmark[];
  width: number;
  height: number;
}) {
  const at = (key: SemanticLandmarkKey) => {
    const landmark = landmarks.find((item) => item.key === key);
    if (!landmark) return null;
    return { x: landmark.x * width, y: landmark.y * height };
  };
  const stroke = "#8d3b1f";
  if (overlay.type === "line") {
    const points = overlay.points.map(at).filter((point): point is { x: number; y: number } => Boolean(point));
    return <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke={stroke} strokeWidth="2" />;
  }
  if (overlay.type === "distance-pair") {
    return (
      <g fill="none" strokeWidth="2">
        <Pair points={overlay.numerator} at={at} stroke={stroke} />
        <Pair points={overlay.denominator} at={at} stroke="#1c4e6e" />
      </g>
    );
  }
  if (overlay.type === "vertical-spans") {
    return (
      <g stroke={stroke} strokeWidth="2">
        {overlay.spans.map((span) => {
          const [a, b] = span;
          const start = a ? at(a) : null;
          const end = b ? at(b) : null;
          if (!start || !end) return null;
          const x = (start.x + end.x) / 2;
          return <line key={span.join("-")} x1={x} y1={start.y} x2={x} y2={end.y} />;
        })}
      </g>
    );
  }
  if (overlay.type === "midline-offset") {
    const point = at(overlay.point);
    const a = at(overlay.midline[0]);
    const b = at(overlay.midline[1]);
    if (!point || !a || !b) return null;
    const x = (a.x + b.x) / 2;
    return (
      <g stroke={stroke} strokeWidth="2">
        <line x1={x} y1={Math.min(a.y, b.y) - 20} x2={x} y2={point.y} />
        <line x1={x} y1={point.y} x2={point.x} y2={point.y} />
      </g>
    );
  }
  const [a, vertex, b] = overlay.points;
  const start = at(a);
  const mid = at(vertex);
  const end = at(b);
  if (!start || !mid || !end) return null;
  return (
    <g stroke={stroke} fill="none" strokeWidth="2">
      <line x1={start.x} y1={start.y} x2={mid.x} y2={mid.y} />
      <line x1={end.x} y1={end.y} x2={mid.x} y2={mid.y} />
      <path d={arcPath(start, mid, end, 36)} />
    </g>
  );
}

function Pair({
  points,
  at,
  stroke,
}: {
  points: SemanticLandmarkKey[];
  at: (key: SemanticLandmarkKey) => { x: number; y: number } | null;
  stroke: string;
}) {
  const [a, b] = points;
  if (!a || !b) return null;
  const start = at(a);
  const end = at(b);
  if (!start || !end) return null;
  return <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={stroke} />;
}

function arcPath(a: { x: number; y: number }, vertex: { x: number; y: number }, b: { x: number; y: number }, radius: number) {
  const start = Math.atan2(a.y - vertex.y, a.x - vertex.x);
  const end = Math.atan2(b.y - vertex.y, b.x - vertex.x);
  let delta = end - start;
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  const x1 = vertex.x + Math.cos(start) * radius;
  const y1 = vertex.y + Math.sin(start) * radius;
  const x2 = vertex.x + Math.cos(end) * radius;
  const y2 = vertex.y + Math.sin(end) * radius;
  const sweep = delta > 0 ? 1 : 0;
  return `M ${x1} ${y1} A ${radius} ${radius} 0 0 ${sweep} ${x2} ${y2}`;
}
