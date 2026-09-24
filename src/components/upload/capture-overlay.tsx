"use client";

import { captureGuideBox, type CaptureAssessment, type CaptureView, type GuideBox } from "@/lib/face/capture-guide";

export interface GuideLive {
  oval: Array<{ x: number; y: number }>;
  eyeLine: [{ x: number; y: number }, { x: number; y: number }] | null;
  nose: { x: number; y: number } | null;
}

const READY = "#d8ffe9";
const ADJUST = "#ffbf5c";
const SEARCH = "#f7fbff";
const INK = "#071018";

function strokeProps(stroke: string, width: number) {
  return {
    fill: "none" as const,
    stroke,
    strokeWidth: width,
    vectorEffect: "non-scaling-stroke" as const,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

function guideColor(status: CaptureAssessment["status"]): string {
  if (status === "ready") return READY;
  if (status === "adjust") return ADJUST;
  return SEARCH;
}

/** Brackets and, for a turned head, the same kind of frame plus the live face contour. Front keeps its simple alignment marks. */
export function CaptureFrameGuide({
  width,
  height,
  view,
  status,
  live,
}: {
  width: number;
  height: number;
  view: CaptureView;
  status: CaptureAssessment["status"];
  live: GuideLive | null;
}) {
  const box = captureGuideBox(width, height, view);
  const weight = Math.max(1.25, Math.min(width, height) / 180);
  const stroke = guideColor(status);
  const liveStroke = status === "ready" ? "#e7fff2" : "#f4fbff";
  const ovalPoints = plottedOval(live, width, height);
  const eye = plottedEyeLine(live, width, height);
  const nose = plottedPoint(live?.nose, width, height);
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 h-full w-full"
      data-status={status}
      aria-hidden="true"
    >
      <path fill="rgba(8,14,20,0.42)" fillRule="evenodd" d={vignette(width, height, box)} />
      {view === "front" ? (
        <FrontGuide box={box} stroke={stroke} weight={weight} />
      ) : (
        <TurnedGuide box={box} stroke={stroke} weight={weight} />
      )}
      {ovalPoints ? (
        <>
          <polygon points={ovalPoints} {...strokeProps(INK, 4.5)} />
          <polygon data-landmark="oval" points={ovalPoints} {...strokeProps(liveStroke, 2.5)} />
        </>
      ) : null}
      {view === "front" && eye ? (
        <>
          <line x1={eye[0].x} y1={eye[0].y} x2={eye[1].x} y2={eye[1].y} {...strokeProps(INK, 4.5)} />
          <line x1={eye[0].x} y1={eye[0].y} x2={eye[1].x} y2={eye[1].y} {...strokeProps(liveStroke, 2.5)} />
        </>
      ) : null}
      {view === "front" && nose ? (
        <circle data-landmark="nose" cx={nose.x} cy={nose.y} r={weight * 1.8} fill={liveStroke} stroke={INK} strokeWidth={3} vectorEffect="non-scaling-stroke" />
      ) : null}
    </svg>
  );
}

export function TurnTrack({
  amount,
  target,
  status,
}: {
  amount: number;
  target: number;
  status: CaptureAssessment["status"];
}) {
  const ready = status === "ready";
  return (
    <div data-guide="turn-progress" className="mt-3" aria-hidden="true">
      <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
        <span>Front</span>
        <div className="relative h-4 flex-1">
          <div className="absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 bg-line-strong" />
          <span
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink/50 bg-panel"
            style={{ left: `${target * 100}%` }}
          />
          <span
            data-guide="turn-current"
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left,background-color] duration-200 ease-out"
            style={{ left: `${amount * 100}%`, backgroundColor: ready ? READY : ADJUST }}
          />
        </div>
        <span>Side</span>
      </div>
    </div>
  );
}

function plottedPoint(
  point: { x: number; y: number } | null | undefined,
  width: number,
  height: number,
): { x: number; y: number } | null {
  if (!point) return null;
  const x = point.x * width;
  const y = point.y * height;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function plottedOval(live: GuideLive | null, width: number, height: number): string {
  if (!live || live.oval.length < 3) return "";
  const parts: string[] = [];
  for (const point of live.oval) {
    const plotted = plottedPoint(point, width, height);
    if (!plotted) return "";
    parts.push(`${plotted.x},${plotted.y}`);
  }
  return parts.join(" ");
}

function plottedEyeLine(
  live: GuideLive | null,
  width: number,
  height: number,
): [{ x: number; y: number }, { x: number; y: number }] | null {
  if (!live?.eyeLine) return null;
  const start = plottedPoint(live.eyeLine[0], width, height);
  const end = plottedPoint(live.eyeLine[1], width, height);
  if (!start || !end) return null;
  return [start, end];
}

function TurnedGuide({ box, stroke, weight }: { box: GuideBox; stroke: string; weight: number }) {
  const { cx, top, faceH } = box;
  const marks = (marked: boolean) => (
    <>
      <ellipse
        {...(marked ? { "data-guide": "frame-oval" } : {})}
        cx={cx}
        cy={box.cy}
        rx={box.faceW / 2}
        ry={box.faceH / 2}
      />
      <path {...(marked ? { "data-guide": "brackets" } : {})} d={brackets(box, weight * 6, 0.16)} />
      <line
        x1={cx}
        y1={top + faceH * 0.12}
        x2={cx}
        y2={top + faceH * 0.88}
        strokeDasharray={`${weight * 1.5} ${weight * 2.5}`}
      />
      <circle {...(marked ? { "data-guide": "center" } : {})} cx={cx} cy={box.cy} r={weight * 1.8} fill={marked ? stroke : INK} stroke="none" />
    </>
  );
  return (
    <>
      <g {...strokeProps(INK, 8)}>{marks(false)}</g>
      <g {...strokeProps(stroke, 3.5)}>{marks(true)}</g>
    </>
  );
}

function FrontGuide({ box, stroke, weight }: { box: GuideBox; stroke: string; weight: number }) {
  const { cx, left, top, faceW, faceH } = box;
  const eyeY = top + faceH * 0.4;
  const mouthY = top + faceH * 0.72;
  const marks = (marked: boolean) => (
    <>
      <ellipse cx={cx} cy={box.cy} rx={faceW / 2} ry={faceH / 2} />
      <path {...(marked ? { "data-guide": "brackets" } : {})} d={brackets(box, weight * 6)} />
      <line x1={cx} y1={top + faceH * 0.1} x2={cx} y2={top + faceH * 0.94} strokeDasharray={`${weight * 1.5} ${weight * 2.5}`} />
      <line x1={left + faceW * 0.16} y1={eyeY} x2={left + faceW * 0.84} y2={eyeY} />
      <ellipse cx={left + faceW * 0.35} cy={eyeY} rx={faceW * 0.09} ry={faceH * 0.032} />
      <ellipse cx={left + faceW * 0.65} cy={eyeY} rx={faceW * 0.09} ry={faceH * 0.032} />
      <line x1={cx} y1={top + faceH * 0.48} x2={cx} y2={top + faceH * 0.62} />
      <line x1={left + faceW * 0.38} y1={mouthY} x2={left + faceW * 0.62} y2={mouthY} />
    </>
  );
  return (
    <>
      <g {...strokeProps(INK, 8)}>{marks(false)}</g>
      <g {...strokeProps(stroke, 3.5)}>{marks(true)}</g>
    </>
  );
}

function vignette(width: number, height: number, box: GuideBox): string {
  const radius = Math.min(width * 0.02, box.faceW / 5, box.faceH / 5);
  return `M 0 0 H ${width} V ${height} H 0 Z ${roundedRect(box.left, box.top, box.faceW, box.faceH, radius)}`;
}

function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
  return `M ${x + r} ${y} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} V ${y + h - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + h - r} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
}

function brackets(box: GuideBox, pad: number, armFraction = 0.1): string {
  const left = box.left - pad;
  const top = box.top - pad;
  const right = box.left + box.faceW + pad;
  const bottom = box.top + box.faceH + pad;
  const arm = Math.min(box.faceW, box.faceH) * armFraction;
  return [
    `M ${left} ${top + arm} L ${left} ${top} L ${left + arm} ${top}`,
    `M ${right - arm} ${top} L ${right} ${top} L ${right} ${top + arm}`,
    `M ${right} ${bottom - arm} L ${right} ${bottom} L ${right - arm} ${bottom}`,
    `M ${left + arm} ${bottom} L ${left} ${bottom} L ${left} ${bottom - arm}`,
  ].join(" ");
}
