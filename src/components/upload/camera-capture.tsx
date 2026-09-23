"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  assessCaptureAlignment,
  captureGuideBox,
  summarizeLiveFaces,
  type CaptureAssessment,
  type GuideBox,
  type LiveFaceSummary,
} from "@/lib/face/capture-guide";
import { detectLiveFace, retainLiveFaceLandmarker } from "@/lib/mediapipe/face-landmarker";
import { cn } from "@/lib/utils";
import type { FaceView, RawFaceLandmark } from "@/types/face";

const PROFILE_SILHOUETTE =
  "M 0.36 0.18 C 0.46 0.04 0.64 0.06 0.68 0.22 C 0.72 0.34 0.70 0.40 0.74 0.46 C 0.92 0.52 0.78 0.57 0.68 0.60 C 0.76 0.66 0.74 0.72 0.70 0.76 C 0.66 0.86 0.56 0.98 0.44 0.94 C 0.30 0.88 0.20 0.74 0.18 0.58 C 0.16 0.40 0.22 0.26 0.36 0.18 Z";

type CameraPhase = "starting" | "live" | "blocked" | "missing" | "unavailable";

function idleAssessment(view: FaceView): CaptureAssessment {
  return assessCaptureAlignment({
    view,
    faceCount: 0,
    pose: { yaw: null, pitch: null, roll: null },
    coverage: 0,
    centerX: null,
    centerY: null,
    facesLeft: false,
    mirroredPreview: view === "front",
  });
}

export function CameraCapture({
  view,
  pending,
  onCapture,
}: {
  view: FaceView;
  pending: boolean;
  onCapture: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCaptureRef = useRef(onCapture);
  const pendingRef = useRef(pending);
  const countdownRef = useRef<number | null>(null);
  const readyStreak = useRef(0);
  const stableReady = useRef(false);
  const pauseAuto = useRef(false);
  const shooting = useRef(false);
  const facing = useRef<"left" | "right">("right");
  const [phase, setPhase] = useState<CameraPhase>(() =>
    process.env.NEXT_PUBLIC_E2E === "1" && process.env.NODE_ENV !== "production" ? "unavailable" : "starting",
  );
  const [frame, setFrame] = useState({ width: 4, height: 3 });
  const [assessment, setAssessment] = useState<CaptureAssessment>(() => idleAssessment(view));
  const [live, setLive] = useState<LiveFaceSummary | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [captureError, setCaptureError] = useState("");

  onCaptureRef.current = onCapture;
  pendingRef.current = pending;

  useEffect(() => {
    if (!pending) shooting.current = false;
  }, [pending]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_E2E === "1" && process.env.NODE_ENV !== "production") {
      setPhase("unavailable");
      return;
    }
    const video = videoRef.current;
    if (!video || !navigator.mediaDevices?.getUserMedia) {
      setPhase("unavailable");
      return;
    }

    let cancelled = false;
    let busy = false;
    let raf = 0;
    let last = 0;
    let stream: MediaStream | null = null;
    const release = retainLiveFaceLandmarker();

    const loop = (now: number) => {
      if (cancelled) return;
      raf = requestAnimationFrame(loop);
      if (busy || now - last < 200 || video.readyState < 2) return;
      last = now;
      busy = true;
      void detectLiveFace(video, now)
        .then((faces) => {
          if (!cancelled) applyFaces(faces);
        })
        .catch(() => {
          if (!cancelled) setCaptureError("The alignment guide stopped. You can still capture, or upload a photo.");
          cancelled = true;
        })
        .finally(() => {
          busy = false;
        });
    };

    const onMeta = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setFrame({ width: video.videoWidth, height: video.videoHeight });
      }
    };
    video.addEventListener("loadedmetadata", onMeta);

    void navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
      })
      .then(async (next) => {
        if (cancelled) {
          next.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = next;
        video.srcObject = next;
        await video.play();
        onMeta();
        if (cancelled) return;
        setPhase("live");
        raf = requestAnimationFrame(loop);
      })
      .catch((error: unknown) => {
        if (!cancelled) setPhase(cameraPhase(error));
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      video.removeEventListener("loadedmetadata", onMeta);
      stream?.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
      const finish = () => {
        if (busy) {
          requestAnimationFrame(finish);
          return;
        }
        release();
      };
      finish();
    };
    // The session is restarted by remounting this component for each view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      void takePhoto();
      return;
    }
    const id = window.setTimeout(() => {
      setCountdown((value) => {
        const next = value === null ? null : value - 1;
        countdownRef.current = next;
        return next;
      });
    }, 800);
    return () => window.clearTimeout(id);
  }, [countdown]);

  function applyFaces(faces: RawFaceLandmark[][]) {
    const summary = summarizeLiveFaces(faces);
    if (view === "profile" && summary.faceCount === 1 && Math.abs(summary.pose.yaw ?? 0) > 25) {
      facing.current = summary.facesLeft ? "left" : "right";
    }
    const next = assessCaptureAlignment(
      {
        view,
        faceCount: summary.faceCount,
        pose: summary.pose,
        coverage: summary.coverage,
        centerX: summary.centerX,
        centerY: summary.centerY,
        facesLeft: summary.facesLeft,
        mirroredPreview: view === "front",
      },
      { stable: stableReady.current },
    );
    stableReady.current = next.status === "ready";
    setLive(summary.faceCount > 0 ? summary : null);
    setAssessment(next);
    if (next.status !== "ready") pauseAuto.current = false;
    if (next.status === "ready") {
      readyStreak.current += 1;
      if (
        readyStreak.current >= 3 &&
        countdownRef.current === null &&
        !pauseAuto.current &&
        !shooting.current &&
        !pendingRef.current
      ) {
        countdownRef.current = 3;
        setCountdown(3);
      }
      return;
    }
    readyStreak.current = 0;
    if (countdownRef.current !== null) {
      countdownRef.current = null;
      setCountdown(null);
    }
  }

  async function takePhoto() {
    if (shooting.current || pendingRef.current) return;
    const video = videoRef.current;
    if (!video || video.videoWidth < 2) return;
    shooting.current = true;
    pauseAuto.current = true;
    countdownRef.current = null;
    setCountdown(null);
    setCaptureError("");
    try {
      onCaptureRef.current(await captureFrame(video));
    } catch (error) {
      shooting.current = false;
      setCaptureError(error instanceof Error ? error.message : "Could not capture the photo.");
    }
  }

  function cancelCountdown() {
    pauseAuto.current = true;
    countdownRef.current = null;
    readyStreak.current = 0;
    setCountdown(null);
  }

  const phaseMessage = phaseText(phase);
  const message = captureError || phaseMessage || assessment.message;
  const mirror = view === "front";

  return (
    <div className="mt-5">
      <div className="relative overflow-hidden bg-[#14202b]" style={{ aspectRatio: `${frame.width} / ${frame.height}` }}>
        <div className="absolute inset-0" style={mirror ? { transform: "scaleX(-1)" } : undefined}>
          <video ref={videoRef} className={cn("h-full w-full object-fill", phase === "live" ? "opacity-100" : "opacity-0")} playsInline muted autoPlay />
          <GuideGraphic
            width={frame.width}
            height={frame.height}
            view={view}
            facing={facing.current}
            status={assessment.status}
            live={phase === "live" ? live : null}
          />
        </div>
        {countdown !== null && countdown > 0 ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-6xl text-white">{countdown}</span>
          </div>
        ) : null}
      </div>
      <p role="status" className="mt-3 text-sm leading-6 text-ink">
        {message}
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {assessment.checks.map((check) => (
          <li
            key={check.id}
            className={cn(
              "border px-2 py-1 text-xs",
              check.ok ? "border-good text-good" : "border-line text-muted",
            )}
          >
            {check.label}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => void takePhoto()} disabled={pending || phase !== "live"}>
          {assessment.status === "ready" ? "Capture photo" : "Capture anyway"}
        </Button>
        {countdown !== null ? (
          <Button variant="secondary" onClick={cancelCountdown}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function GuideGraphic({
  width,
  height,
  view,
  facing,
  status,
  live,
}: {
  width: number;
  height: number;
  view: FaceView;
  facing: "left" | "right";
  status: CaptureAssessment["status"];
  live: LiveFaceSummary | null;
}) {
  const box = captureGuideBox(width, height, view);
  const weight = Math.max(1.5, width / 480);
  const stroke = status === "ready" ? "#1d6a45" : status === "adjust" ? "#e6c27a" : "#f4f8fb";
  const tracked = status === "ready" ? "#8fd0a8" : "#d5e4ef";
  const flip = view === "profile" && facing === "left";
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="pointer-events-none absolute inset-0 h-full w-full [filter:drop-shadow(0_0_2px_rgba(16,24,32,0.9))]"
      aria-hidden="true"
    >
      <g transform={flip ? `translate(${width} 0) scale(-1 1)` : undefined}>
        {view === "front" ? (
          <FrontGuide box={box} stroke={stroke} weight={weight} />
        ) : (
          <ProfileGuide box={box} stroke={stroke} weight={weight} />
        )}
      </g>
      {live && live.oval.length > 2 ? (
        <polygon
          points={live.oval.map((point) => `${point.x * width},${point.y * height}`).join(" ")}
          fill="none"
          stroke={tracked}
          strokeWidth={weight}
          strokeLinejoin="round"
        />
      ) : null}
      {live?.eyeLine ? (
        <line
          x1={live.eyeLine[0].x * width}
          y1={live.eyeLine[0].y * height}
          x2={live.eyeLine[1].x * width}
          y2={live.eyeLine[1].y * height}
          stroke={tracked}
          strokeWidth={weight}
        />
      ) : null}
      {live?.nose ? <circle cx={live.nose.x * width} cy={live.nose.y * height} r={weight * 1.8} fill={tracked} /> : null}
    </svg>
  );
}

function FrontGuide({ box, stroke, weight }: { box: GuideBox; stroke: string; weight: number }) {
  const { cx, left, top, faceW, faceH } = box;
  const eyeY = top + faceH * 0.4;
  const mouthY = top + faceH * 0.72;
  return (
    <g fill="none" stroke={stroke} strokeWidth={weight} strokeLinecap="round">
      <ellipse cx={cx} cy={box.cy} rx={faceW / 2} ry={faceH / 2} />
      <path d={brackets(box, weight * 6)} />
      <line x1={cx} y1={top + faceH * 0.1} x2={cx} y2={top + faceH * 0.94} strokeDasharray={`${weight * 1.5} ${weight * 2.5}`} />
      <line x1={left + faceW * 0.16} y1={eyeY} x2={left + faceW * 0.84} y2={eyeY} />
      <ellipse cx={left + faceW * 0.35} cy={eyeY} rx={faceW * 0.09} ry={faceH * 0.032} />
      <ellipse cx={left + faceW * 0.65} cy={eyeY} rx={faceW * 0.09} ry={faceH * 0.032} />
      <line x1={cx} y1={top + faceH * 0.48} x2={cx} y2={top + faceH * 0.62} />
      <line x1={left + faceW * 0.38} y1={mouthY} x2={left + faceW * 0.62} y2={mouthY} />
    </g>
  );
}

function ProfileGuide({ box, stroke, weight }: { box: GuideBox; stroke: string; weight: number }) {
  const eyeY = box.top + box.faceH * 0.4;
  return (
    <g fill="none" stroke={stroke} strokeWidth={weight} strokeLinecap="round">
      <path d={brackets(box, weight * 6)} />
      <path d={mapUnitPath(box, PROFILE_SILHOUETTE)} />
      <line x1={box.left + box.faceW * 0.48} y1={eyeY} x2={box.left + box.faceW * 0.7} y2={eyeY} />
    </g>
  );
}

function brackets(box: GuideBox, pad: number): string {
  const left = box.left - pad;
  const top = box.top - pad;
  const right = box.left + box.faceW + pad;
  const bottom = box.top + box.faceH + pad;
  const arm = Math.min(box.faceW, box.faceH) * 0.08;
  return [
    `M ${left} ${top + arm} L ${left} ${top} L ${left + arm} ${top}`,
    `M ${right - arm} ${top} L ${right} ${top} L ${right} ${top + arm}`,
    `M ${right} ${bottom - arm} L ${right} ${bottom} L ${right - arm} ${bottom}`,
    `M ${left + arm} ${bottom} L ${left} ${bottom} L ${left} ${bottom - arm}`,
  ].join(" ");
}

function mapUnitPath(box: GuideBox, path: string): string {
  return path.replace(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g, (_match, x: string, y: string) => {
    const px = box.left + Number(x) * box.faceW;
    const py = box.top + Number(y) * box.faceH;
    return `${px.toFixed(1)} ${py.toFixed(1)}`;
  });
}

function phaseText(phase: CameraPhase): string {
  if (phase === "starting") return "Starting the camera and the alignment guide.";
  if (phase === "blocked") return "Camera access is blocked. Allow it in the browser, or upload a photo.";
  if (phase === "missing") return "No camera was found. Upload a photo instead.";
  if (phase === "unavailable") return "This browser could not open a camera. Upload a photo instead.";
  return "";
}

function cameraPhase(error: unknown): CameraPhase {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") return "blocked";
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") return "missing";
  }
  return "unavailable";
}

async function captureFrame(video: HTMLVideoElement): Promise<File> {
  const maxEdge = 1600;
  const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
  const width = Math.max(1, Math.round(video.videoWidth * scale));
  const height = Math.max(1, Math.round(video.videoHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not capture the camera frame.");
  // Saved pixels stay unmirrored. The preview mirror is only for lining up,
  // and the landmark model reads an unmirrored photograph.
  context.drawImage(video, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("Could not capture the photo."))),
      "image/jpeg",
      0.92,
    );
  });
  return new File([blob], "camera.jpg", { type: "image/jpeg" });
}
