"use client";

import { captureGuideBox, type CaptureAssessment, type CaptureView, type GuideBox } from "@/lib/face/capture-guide";

export interface GuideLive {
  oval: Array<{ x: number; y: number }>;
  eyeLine: [{ x: number; y: number }, { x: number; y: number }] | null;
  nose: { x: number; y: number } | null;
}

const READY = "#1f7a4d";
const ADJUST = "#c9842a";
const SEARCH = "#d7e3ec";

function guideColor(status: CaptureAssessment["status"]): string {
  if (status === "ready") return READY;
  if (status === "adjust") return ADJUST;
  return SEARCH;
}

/** Brackets and, for a turned head, a generic scale oval. Front keeps its simple alignment marks. */
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
  const weight = Math.max(1.25, width / 520);
  const stroke = guideColor(status);
  const maskId = "moglabs-capture-mask";
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 h-full w-full"
      data-status={status}
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          <rect width={width} height={height} fill="white" />
          <rect x={box.left} y={box.top} width={box.faceW} height={box.faceH} rx={width * 0.02} fill="black" />
        </mask>
      </defs>
      <rect width={width} height={height} fill="rgba(8,14,20,0.42)" mask={`url(#${maskId})`} />
      {view === "front" ? (
        <FrontGuide box={box} stroke={stroke} weight={weight} />
      ) : (
        <g fill="none" stroke={stroke} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 180ms ease" }}>
          <ellipse data-guide="frame-oval" cx={box.cx} cy={box.cy} rx={box.faceW / 2} ry={box.faceH / 2} strokeOpacity={0.22} />
          <path data-guide="brackets" d={brackets(box, weight * 4)} />
          <circle data-guide="center" cx={box.cx} cy={box.cy} r={weight * 1.4} fill={stroke} stroke="none" />
        </g>
      )}
      {view === "front" && live && live.oval.length > 2 ? (
        <polygon
          data-landmark="oval"
          points={live.oval.map((point) => `${point.x * width},${point.y * height}`).join(" ")}
          fill="none"
          stroke={status === "ready" ? "#8fd0a8" : "#d5e4ef"}
          strokeWidth={weight}
          strokeLinejoin="round"
        />
      ) : null}
      {view === "front" && live?.eyeLine ? (
        <line
          x1={live.eyeLine[0].x * width}
          y1={live.eyeLine[0].y * height}
          x2={live.eyeLine[1].x * width}
          y2={live.eyeLine[1].y * height}
          stroke={status === "ready" ? "#8fd0a8" : "#d5e4ef"}
          strokeWidth={weight}
        />
      ) : null}
      {view === "front" && live?.nose ? (
        <circle data-landmark="nose" cx={live.nose.x * width} cy={live.nose.y * height} r={weight * 1.8} fill={status === "ready" ? "#8fd0a8" : "#d5e4ef"} />
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

function FrontGuide({ box, stroke, weight }: { box: GuideBox; stroke: string; weight: number }) {
  const { cx, left, top, faceW, faceH } = box;
  const eyeY = top + faceH * 0.4;
  const mouthY = top + faceH * 0.72;
  return (
    <g fill="none" stroke={stroke} strokeWidth={weight} strokeLinecap="round" style={{ transition: "stroke 180ms ease" }}>
      <ellipse cx={cx} cy={box.cy} rx={faceW / 2} ry={faceH / 2} />
      <path data-guide="brackets" d={brackets(box, weight * 6)} />
      <line x1={cx} y1={top + faceH * 0.1} x2={cx} y2={top + faceH * 0.94} strokeDasharray={`${weight * 1.5} ${weight * 2.5}`} />
      <line x1={left + faceW * 0.16} y1={eyeY} x2={left + faceW * 0.84} y2={eyeY} />
      <ellipse cx={left + faceW * 0.35} cy={eyeY} rx={faceW * 0.09} ry={faceH * 0.032} />
      <ellipse cx={left + faceW * 0.65} cy={eyeY} rx={faceW * 0.09} ry={faceH * 0.032} />
      <line x1={cx} y1={top + faceH * 0.48} x2={cx} y2={top + faceH * 0.62} />
      <line x1={left + faceW * 0.38} y1={mouthY} x2={left + faceW * 0.62} y2={mouthY} />
    </g>
  );
}

function brackets(box: GuideBox, pad: number): string {
  const left = box.left - pad;
  const top = box.top - pad;
  const right = box.left + box.faceW + pad;
  const bottom = box.top + box.faceH + pad;
  const arm = Math.min(box.faceW, box.faceH) * 0.1;
  return [
    `M ${left} ${top + arm} L ${left} ${top} L ${left + arm} ${top}`,
    `M ${right - arm} ${top} L ${right} ${top} L ${right} ${top + arm}`,
    `M ${right} ${bottom - arm} L ${right} ${bottom} L ${right - arm} ${bottom}`,
    `M ${left + arm} ${bottom} L ${left} ${bottom} L ${left} ${bottom - arm}`,
  ].join(" ");
}
