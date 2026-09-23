"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  cameraProfileNote,
  cameraVideoConstraints,
  detectDeviceClass,
  lensForDevice,
  previewFrameStyle,
  readDeviceSignals,
  undistortLandmarks,
  type LensModel,
} from "@/lib/face/camera-optics";
import { liveMeshIsFresh, resolveCaptureFaces } from "@/lib/face/capture-route";
import { sideGuide, threeQuarterGuide } from "@/lib/face/capture-outline";
import {
  assessCaptureAlignment,
  captureGuideBox,
  summarizeLiveFaces,
  type CaptureAssessment,
  type CaptureView,
  type GuideBox,
  type LiveFaceSummary,
} from "@/lib/face/capture-guide";
import { markCapture, measureCapture } from "@/lib/face/capture-timing";
import { correctCapturedCanvas } from "@/lib/face/lens-correct";
import { scoreImageData, type PreparedImage } from "@/lib/face/prepare-image";
import {
  advanceStability,
  FRONT_STABLE_MS,
  HOLD_STILL_MS,
  nextProfileFacing,
  POSE_GRACE_MS,
  PROFILE_STABLE_MS,
  type StabilityClock,
} from "@/lib/face/profile-pose";
import { detectCanvas, detectLiveFace, retainLiveFaceLandmarker } from "@/lib/mediapipe/face-landmarker";
import { createSessionLease } from "@/lib/mediapipe/session-lease";
import { cn } from "@/lib/utils";
import type { RawFaceLandmark } from "@/types/face";

const cameraLease = createSessionLease<MediaStream>({
  graceMs: 500,
  open: async (key) => {
    const [device, orientation] = key.split(":");
    const portrait = orientation === "portrait";
    const video = cameraVideoConstraints(device === "mobile" ? "mobile" : "desktop", portrait);
    const supported = navigator.mediaDevices.getSupportedConstraints?.() as { resizeMode?: boolean } | undefined;
    if (supported?.resizeMode) {
      (video as MediaTrackConstraints & { resizeMode?: { ideal: "none" } }).resizeMode = { ideal: "none" };
    }
    return openCamera(video);
  },
  close: (stream) => {
    stream.getTracks().forEach((track) => track.stop());
  },
});

export interface CameraCaptureResult {
  width: number;
  height: number;
  /** Landmarks in the same space as a successfully corrected photo. */
  faces: RawFaceLandmark[][];
  /** Landmarks on the raw camera frame, used if lens correction cannot be stored. */
  rawFaces: RawFaceLandmark[][];
  detectedAt: number;
  capturedAt: number;
  lens: LensModel;
  usedLiveMesh: boolean;
  blurScore: number;
  brightnessScore: number;
  image: Promise<PreparedImage & { corrected: boolean }>;
}

type CameraPhase = "starting" | "live" | "blocked" | "missing" | "unavailable";

function idleAssessment(view: CaptureView): CaptureAssessment {
  return assessCaptureAlignment({
    view,
    faceCount: 0,
    pose: { yaw: null, pitch: null, roll: null },
    coverage: 0,
    centerX: null,
    centerY: null,
    facesLeft: false,
    mirroredPreview: true,
  });
}

function cloneFaces(faces: RawFaceLandmark[][]): RawFaceLandmark[][] {
  return faces.map((face) => face.map((point) => ({ ...point })));
}

export function CameraCapture({
  view,
  onCapture,
}: {
  view: CaptureView;
  onCapture: (result: CameraCaptureResult) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCaptureRef = useRef(onCapture);
  const viewRef = useRef(view);
  const facingRef = useRef<"left" | "right" | null>(null);
  const clockRef = useRef<StabilityClock>({ since: null, lastOk: null });
  const stableReady = useRef(false);
  const pauseAuto = useRef(false);
  const shooting = useRef(false);
  const holdTimer = useRef<number | null>(null);
  const lensRef = useRef<LensModel>(lensForDevice("desktop"));
  const latestFacesRef = useRef<RawFaceLandmark[][]>([]);
  const latestDetectionTimestampRef = useRef<number | null>(null);
  const latestFrameDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  const applyFacesRef = useRef<(faces: RawFaceLandmark[][], detectedAt: number) => void>(() => undefined);
  const [session, setSession] = useState(0);
  const [profileNote, setProfileNote] = useState("");
  const [holding, setHolding] = useState("");
  const [holdLabel, setHoldLabel] = useState("");
  const [phase, setPhase] = useState<CameraPhase>(() =>
    process.env.NEXT_PUBLIC_E2E === "1" && process.env.NODE_ENV !== "production" ? "unavailable" : "starting",
  );
  const [frame, setFrame] = useState({ width: 960, height: 720 });
  const [assessment, setAssessment] = useState<CaptureAssessment>(() => idleAssessment(view));
  const [live, setLive] = useState<LiveFaceSummary | null>(null);
  const [facing, setFacing] = useState<"left" | "right" | null>(null);
  const [captureError, setCaptureError] = useState("");
  const [trackedView, setTrackedView] = useState(view);
  if (trackedView !== view) {
    setTrackedView(view);
    setFacing(null);
    setAssessment(idleAssessment(view));
    setCaptureError("");
    setHolding("");
    setHoldLabel("");
  }

  function disarmHold() {
    if (holdTimer.current === null) return;
    window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHoldLabel("");
  }

  function armHold() {
    if (holdTimer.current !== null || pauseAuto.current || shooting.current) return;
    setHoldLabel("Hold still");
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      setHoldLabel("");
      void takePhoto();
    }, HOLD_STILL_MS);
  }

  useEffect(() => {
    onCaptureRef.current = onCapture;
  });

  useEffect(() => {
    viewRef.current = view;
    clockRef.current = { since: null, lastOk: null };
    stableReady.current = false;
    facingRef.current = null;
    pauseAuto.current = false;
    shooting.current = false;
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, [view]);

  useEffect(() => {
    const query = window.matchMedia("(orientation: portrait)");
    const onChange = () => setSession((value) => value + 1);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_E2E === "1" && process.env.NODE_ENV !== "production") return;
    const video = videoRef.current;
    if (!video || !navigator.mediaDevices?.getUserMedia) {
      setPhase("unavailable");
      return;
    }

    let cancelled = false;
    let busy = false;
    let raf = 0;
    let last = 0;
    let released = false;
    const releaseDetector = retainLiveFaceLandmarker();
    const portrait = window.matchMedia("(orientation: portrait)").matches;
    const device = detectDeviceClass(readDeviceSignals());
    const lens = lensForDevice(device);
    lensRef.current = lens;
    setProfileNote(cameraProfileNote(device));
    const streamKey = `${device}:${portrait ? "portrait" : "landscape"}`;

    const releaseAll = () => {
      if (released) return;
      released = true;
      releaseDetector();
      cameraLease.release();
    };

    const loop = (now: number) => {
      if (cancelled) return;
      raf = requestAnimationFrame(loop);
      if (busy || now - last < 200 || video.readyState < 2) return;
      last = now;
      busy = true;
      const requestedAt = now;
      void detectLiveFace(video, now)
        .then((faces) => {
          if (!cancelled) applyFacesRef.current(faces, requestedAt);
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
        setFrame((current) =>
          current.width === video.videoWidth && current.height === video.videoHeight
            ? current
            : { width: video.videoWidth, height: video.videoHeight },
        );
      }
    };
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("resize", onMeta);

    void cameraLease
      .acquire(streamKey)
      .then(async (stream) => {
        if (cancelled) return;
        video.srcObject = stream;
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
      video.removeEventListener("resize", onMeta);
      video.srcObject = null;
      const finish = () => {
        if (busy) {
          requestAnimationFrame(finish);
          return;
        }
        releaseAll();
      };
      finish();
    };
  }, [session]);

  useEffect(() => {
    applyFacesRef.current = (faces, detectedAt) => {
    const video = videoRef.current;
    const width = video?.videoWidth ?? 0;
    const height = video?.videoHeight ?? 0;
    if (width > 1 && height > 1) {
      latestFacesRef.current = cloneFaces(faces);
      latestDetectionTimestampRef.current = detectedAt;
      latestFrameDimensionsRef.current = { width, height };
    }
    const summary = summarizeLiveFaces(faces, { width, height }, lensRef.current);
    const currentView = viewRef.current;
    if (currentView !== "front" && summary.faceCount === 1) {
      facingRef.current = nextProfileFacing(
        facingRef.current,
        summary.pose.yaw,
        summary.facesLeft,
        summary.eyeCollapse,
      );
      setFacing(facingRef.current);
    }
    const next = assessCaptureAlignment(
      {
        view: currentView,
        faceCount: summary.faceCount,
        pose: summary.pose,
        coverage: summary.coverage,
        centerX: summary.centerX,
        centerY: summary.centerY,
        facesLeft: summary.facesLeft,
        mirroredPreview: true,
        eyeCollapse: summary.eyeCollapse,
        noseLead: summary.noseLead,
        frankfortTilt: summary.frankfortTilt,
        facialHeight: summary.facialHeight,
        anchorX: summary.anchorX,
        anchorY: summary.anchorY,
      },
      { stable: stableReady.current },
    );
    stableReady.current = next.status === "ready";
    setLive(summary.faceCount > 0 ? summary : null);
    setAssessment(next);
    if (next.status !== "ready") pauseAuto.current = false;
    const holdMs = currentView === "front" ? FRONT_STABLE_MS : PROFILE_STABLE_MS;
    const stepped = advanceStability(clockRef.current, next.status === "ready", detectedAt, holdMs, POSE_GRACE_MS);
    clockRef.current = stepped.clock;
    if (!stepped.armed || pauseAuto.current || shooting.current) {
      if (!stepped.armed) disarmHold();
      return;
    }
    armHold();
    };
  });

  async function takePhoto() {
    if (shooting.current) return;
    const video = videoRef.current;
    if (!video || video.videoWidth < 2) return;
    shooting.current = true;
    pauseAuto.current = true;
    disarmHold();
    setCaptureError("");
    markCapture("capture-to-next-step-start");
    markCapture("camera-snapshot-start");
    try {
      const maxEdge = 1600;
      const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
      const width = Math.max(1, Math.round(video.videoWidth * scale));
      const height = Math.max(1, Math.round(video.videoHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("This browser could not capture the camera frame.");
      context.drawImage(video, 0, 0, width, height);
      markCapture("camera-snapshot-end");
      measureCapture("camera-snapshot", "camera-snapshot-start", "camera-snapshot-end");

      markCapture("image-stats-start");
      const sample = document.createElement("canvas");
      sample.width = 160;
      sample.height = Math.max(1, Math.round((160 * height) / width));
      const sampleContext = sample.getContext("2d", { willReadFrequently: true });
      if (!sampleContext) throw new Error("This browser could not read the camera frame.");
      sampleContext.drawImage(video, 0, 0, sample.width, sample.height);
      const pixels = sampleContext.getImageData(0, 0, sample.width, sample.height);
      const scores = scoreImageData(pixels.data, sample.width, sample.height);
      markCapture("image-stats-end");
      measureCapture("image-stats", "image-stats-start", "image-stats-end");

      const capturedAt = performance.now();
      const lens = lensRef.current;
      const captureFrame = { width: video.videoWidth, height: video.videoHeight };
      const live = {
        faces: latestFacesRef.current,
        detectedAt: latestDetectionTimestampRef.current,
        frame: latestFrameDimensionsRef.current,
      };
      const image = correctCapturedCanvas(canvas, lens).then((corrected) => ({
        blob: corrected.blob,
        width,
        height,
        previewUrl: URL.createObjectURL(corrected.blob),
        blurScore: scores.blurScore,
        brightnessScore: scores.brightnessScore,
        corrected: corrected.corrected,
      }));

      const deliver = (rawFaces: RawFaceLandmark[][], usedLiveMesh: boolean, detectedAt: number) => {
        const snapshot = cloneFaces(rawFaces);
        onCaptureRef.current({
          width,
          height,
          rawFaces: snapshot,
          faces: snapshot.map((face) => undistortLandmarks(face, { width, height }, lens)),
          detectedAt,
          capturedAt,
          lens,
          usedLiveMesh,
          blurScore: scores.blurScore,
          brightnessScore: scores.brightnessScore,
          image,
        });
      };

      if (liveMeshIsFresh({ source: "camera", live, capturedAt, captureFrame })) {
        markCapture("face-detection-start");
        markCapture("face-detection-end");
        measureCapture("face-detection", "face-detection-start", "face-detection-end");
        deliver(latestFacesRef.current, true, latestDetectionTimestampRef.current ?? capturedAt);
        return;
      }

      setHolding("Checking the photo");
      markCapture("face-detection-start");
      const routed = await resolveCaptureFaces({
        source: "camera",
        live,
        capturedAt,
        captureFrame,
        detectStill: async () => (await detectCanvas(canvas, viewRef.current === "front" ? "front" : "profile")).faces,
      });
      markCapture("face-detection-end");
      measureCapture("face-detection", "face-detection-start", "face-detection-end");
      deliver(routed.faces, false, capturedAt);
    } catch (error) {
      setCaptureError(error instanceof Error ? error.message : "Could not capture the photo.");
    } finally {
      shooting.current = false;
      setHolding("");
    }
  }

  function cancelHold() {
    pauseAuto.current = true;
    clockRef.current = { since: null, lastOk: null };
    disarmHold();
  }

  const phaseMessage = phaseText(phase);
  const message = holdLabel || holding || captureError || phaseMessage || assessment.message;
  const mirrorStyle = { transform: "scaleX(-1)" };

  return (
    <div className="mt-5">
      <div className="relative mx-auto overflow-hidden bg-[#14202b]" style={previewFrameStyle(frame.width, frame.height)}>
        <video
          ref={videoRef}
          className={cn("absolute inset-0 h-full w-full object-contain", phase === "live" ? "opacity-100" : "opacity-0")}
          style={mirrorStyle}
          playsInline
          muted
          autoPlay
          disablePictureInPicture
        />
        <div className="pointer-events-none absolute inset-0" style={mirrorStyle}>
          <GuideGraphic
            width={frame.width}
            height={frame.height}
            view={view}
            facing={facing}
            status={assessment.status}
            live={phase === "live" ? live : null}
          />
        </div>
        {holdLabel ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="bg-[#14202b]/70 px-4 py-2 font-mono text-lg text-white">{holdLabel}</span>
          </div>
        ) : null}
      </div>
      {profileNote ? <p className="mt-3 text-xs leading-5 text-muted">{profileNote}</p> : null}
      <p role="status" className="mt-2 text-sm leading-6 text-ink">
        {message}
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {assessment.checks.map((check) => (
          <li
            key={check.id}
            className={cn("border px-2 py-1 text-xs", check.ok ? "border-good text-good" : "border-line text-muted")}
          >
            {check.label}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button className="w-full sm:w-auto" onClick={() => void takePhoto()} disabled={phase !== "live" || holding !== ""}>
          {assessment.status === "ready" ? "Capture photo" : "Capture anyway"}
        </Button>
        {holdLabel ? (
          <Button variant="secondary" onClick={cancelHold}>
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
  view: CaptureView;
  facing: "left" | "right" | null;
  status: CaptureAssessment["status"];
  live: LiveFaceSummary | null;
}) {
  const box = captureGuideBox(width, height, view);
  const weight = Math.max(1.5, width / 480);
  const stroke = status === "ready" ? "#1d6a45" : status === "adjust" ? "#e6c27a" : "#f4f8fb";
  const tracked = status === "ready" ? "#8fd0a8" : "#d5e4ef";
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 h-full w-full [filter:drop-shadow(0_0_2px_rgba(16,24,32,0.9))]"
      aria-hidden="true"
    >
      {view === "front" ? (
        <FrontGuide box={box} stroke={stroke} weight={weight} />
      ) : view === "threeQuarter" ? (
        <ThreeQuarterGuide box={box} stroke={stroke} weight={weight} facing={facing} />
      ) : (
        <SideGuide box={box} stroke={stroke} weight={weight} facing={facing} />
      )}
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
      {live?.nose && live.anchorX != null && live.anchorY != null ? (
        <line
          x1={live.anchorX * width}
          y1={live.anchorY * height}
          x2={live.nose.x * width}
          y2={live.nose.y * height}
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

function ThreeQuarterGuide({
  box,
  stroke,
  weight,
  facing,
}: {
  box: GuideBox;
  stroke: string;
  weight: number;
  facing: "left" | "right" | null;
}) {
  const guide = threeQuarterGuide(facing ?? "right");
  return (
    <g fill="none" stroke={stroke} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
      <path d={brackets(box, weight * 6)} />
      <path d={mapUnitPath(box, guide.head)} />
      <path d={mapUnitPath(box, guide.ear)} />
      <path d={mapUnitPath(box, guide.nose)} />
      <ellipse
        cx={box.left + guide.farEye.cx * box.faceW}
        cy={box.top + guide.farEye.cy * box.faceH}
        rx={guide.farEye.rx * box.faceW}
        ry={guide.farEye.ry * box.faceH}
      />
      <ellipse
        cx={box.left + guide.nearEye.cx * box.faceW}
        cy={box.top + guide.nearEye.cy * box.faceH}
        rx={guide.nearEye.rx * box.faceW}
        ry={guide.nearEye.ry * box.faceH}
      />
      <line
        x1={box.left + guide.mouth.x1 * box.faceW}
        y1={box.top + guide.mouth.y1 * box.faceH}
        x2={box.left + guide.mouth.x2 * box.faceW}
        y2={box.top + guide.mouth.y2 * box.faceH}
      />
      {facing ? null : <TurnCue box={box} facing={null} weight={weight} />}
    </g>
  );
}

function SideGuide({
  box,
  stroke,
  weight,
  facing,
}: {
  box: GuideBox;
  stroke: string;
  weight: number;
  facing: "left" | "right" | null;
}) {
  const guide = sideGuide(facing ?? "right");
  const pupil = weight * 1.6;
  return (
    <g fill="none" stroke={stroke} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
      <path d={brackets(box, weight * 6)} />
      <path d={mapUnitPath(box, guide.outline)} />
      <path d={mapUnitPath(box, guide.ear)} />
      <path d={mapUnitPath(box, guide.brow)} />
      <line
        x1={box.left + guide.frankfort.x1 * box.faceW}
        y1={box.top + guide.frankfort.y1 * box.faceH}
        x2={box.left + guide.frankfort.x2 * box.faceW}
        y2={box.top + guide.frankfort.y2 * box.faceH}
        strokeDasharray={`${weight * 1.5} ${weight * 2.5}`}
      />
      <ellipse
        cx={box.left + guide.eye.cx * box.faceW}
        cy={box.top + guide.eye.cy * box.faceH}
        rx={guide.eye.rx * box.faceW}
        ry={guide.eye.ry * box.faceH}
      />
      <circle cx={box.left + guide.eye.cx * box.faceW} cy={box.top + guide.eye.cy * box.faceH} r={pupil} fill={stroke} />
      {facing ? null : <TurnCue box={box} facing={null} weight={weight} />}
    </g>
  );
}

function mapUnitPath(box: GuideBox, path: string): string {
  return path.replace(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g, (_match, x: string, y: string) => {
    const px = box.left + Number(x) * box.faceW;
    const py = box.top + Number(y) * box.faceH;
    return `${px.toFixed(1)} ${py.toFixed(1)}`;
  });
}

function TurnCue({
  box,
  facing,
  weight,
}: {
  box: GuideBox;
  facing: "left" | "right" | null;
  weight: number;
}) {
  const y = box.top + box.faceH * 0.42;
  const size = weight * 7;
  if (!facing) {
    return (
      <g>
        <Chevron x={box.left + box.faceW * 0.22} y={y} direction={-1} size={size} weight={weight} />
        <Chevron x={box.left + box.faceW * 0.78} y={y} direction={1} size={size} weight={weight} />
      </g>
    );
  }
  const direction = facing === "left" ? -1 : 1;
  const x = facing === "left" ? box.left + box.faceW * 0.2 : box.left + box.faceW * 0.8;
  return <Chevron x={x} y={y} direction={direction} size={size} weight={weight} />;
}

function Chevron({
  x,
  y,
  direction,
  size,
  weight,
}: {
  x: number;
  y: number;
  direction: -1 | 1;
  size: number;
  weight: number;
}) {
  return (
    <path
      d={`M ${x - direction * size} ${y - size * 0.7} L ${x} ${y} L ${x - direction * size} ${y + size * 0.7}`}
      fill="none"
      strokeWidth={weight * 1.6}
    />
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

async function openCamera(video: MediaTrackConstraints): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: false, video });
  } catch (error) {
    if (error instanceof DOMException && (error.name === "OverconstrainedError" || error.name === "ConstraintNotSatisfiedError")) {
      return navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "user" } } });
    }
    throw error;
  }
}
