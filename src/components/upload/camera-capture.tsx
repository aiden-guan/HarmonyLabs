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
import { CaptureFrameGuide, TurnTrack } from "@/components/upload/capture-overlay";
import { liveMeshIsFresh, resolveCaptureFaces } from "@/lib/face/capture-route";
import {
  assessCaptureAlignment,
  summarizeLiveFaces,
  type CaptureAssessment,
  type CaptureView,
  type LiveFaceSummary,
} from "@/lib/face/capture-guide";
import { markCapture, measureCapture } from "@/lib/face/capture-timing";
import type { FacialMatrix } from "@/lib/face/facial-transform";
import { correctCapturedCanvas } from "@/lib/face/lens-correct";
import { scoreImageData, type PreparedImage } from "@/lib/face/prepare-image";
import {
  advanceStability,
  HOLD_STILL_MS,
  LIVE_INFERENCE_MS,
  nextProfileFacing,
  POSE_GRACE_MS,
  stableHoldMs,
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
  /** Matrix from the same detection as `rawFaces`, when the landmarker returned one. */
  transform: FacialMatrix | null;
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
    mirroredPreview: true,
  });
}

function cloneFaces(faces: RawFaceLandmark[][]): RawFaceLandmark[][] {
  return faces.map((face) => face.map((point) => ({ ...point })));
}

const GUIDE_PAUSED = "The alignment guide paused. You can still capture, or upload a photo.";
const RETRY_CAPTURE_MS = 1400;

export function CameraCapture({
  view,
  onCapture,
}: {
  view: CaptureView;
  /** Return false when this photo was rejected and the step did not advance. */
  onCapture: (result: CameraCaptureResult) => boolean | void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCaptureRef = useRef(onCapture);
  const viewRef = useRef(view);
  const facingRef = useRef<"left" | "right" | null>(null);
  const clockRef = useRef<StabilityClock>({ since: null, lastOk: null });
  const stableReady = useRef(false);
  const pauseAuto = useRef(false);
  const retryAtRef = useRef<number | null>(null);
  const liveHoldRef = useRef<{ summary: LiveFaceSummary; at: number } | null>(null);
  const shooting = useRef(false);
  const holdTimer = useRef<number | null>(null);
  const lensRef = useRef<LensModel>(lensForDevice("desktop"));
  const latestFacesRef = useRef<RawFaceLandmark[][]>([]);
  const latestTransformRef = useRef<FacialMatrix | null>(null);
  const latestDetectionTimestampRef = useRef<number | null>(null);
  const latestFrameDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  const applyFacesRef = useRef<(faces: RawFaceLandmark[][], detectedAt: number, transform: FacialMatrix | null) => void>(() => undefined);
  const [session, setSession] = useState(0);
  const [profileNote, setProfileNote] = useState("");
  const [holding, setHolding] = useState("");
  const [pendingCapture, setPendingCapture] = useState(false);
  const [phase, setPhase] = useState<CameraPhase>(() =>
    process.env.NEXT_PUBLIC_E2E === "1" && process.env.NODE_ENV !== "production" ? "unavailable" : "starting",
  );
  const [frame, setFrame] = useState({ width: 960, height: 720 });
  const [assessment, setAssessment] = useState<CaptureAssessment>(() => idleAssessment(view));
  const [live, setLive] = useState<LiveFaceSummary | null>(null);
  const [captureError, setCaptureError] = useState("");
  const [trackedView, setTrackedView] = useState(view);
  if (trackedView !== view) {
    setTrackedView(view);
    setAssessment(idleAssessment(view));
    setCaptureError("");
    setHolding("");
    setPendingCapture(false);
    retryAtRef.current = null;
    liveHoldRef.current = null;
  }

  function disarmHold() {
    if (holdTimer.current === null) return;
    window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setPendingCapture(false);
  }

  function armHold() {
    if (holdTimer.current !== null || pauseAuto.current || shooting.current) return;
    setPendingCapture(true);
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      setPendingCapture(false);
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
    retryAtRef.current = null;
    liveHoldRef.current = null;
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
    let failures = 0;
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
      if (busy || shooting.current || now - last < LIVE_INFERENCE_MS || video.readyState < 2) return;
      last = now;
      busy = true;
      const requestedAt = now;
      void detectLiveFace(video, now)
        .then((detection) => {
          if (cancelled) return;
          if (failures > 0) {
            failures = 0;
            setCaptureError((current) => (current === GUIDE_PAUSED ? "" : current));
          }
          applyFacesRef.current(detection.faces, requestedAt, detection.transforms[0] ?? null);
        })
        .catch(() => {
          if (cancelled) return;
          failures += 1;
          if (failures === 12) setCaptureError(GUIDE_PAUSED);
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
    applyFacesRef.current = (faces, detectedAt, transform) => {
      const video = videoRef.current;
      const width = video?.videoWidth ?? 0;
      const height = video?.videoHeight ?? 0;
      if (width > 1 && height > 1 && faces.length > 0) {
        latestFacesRef.current = cloneFaces(faces);
        latestTransformRef.current = transform;
        latestDetectionTimestampRef.current = detectedAt;
        latestFrameDimensionsRef.current = { width, height };
      }
      let summary = summarizeLiveFaces(faces, { width, height }, lensRef.current, transform);
      if (summary.faceCount === 1) {
        liveHoldRef.current = { summary, at: detectedAt };
      } else if (liveHoldRef.current && detectedAt - liveHoldRef.current.at <= POSE_GRACE_MS) {
        summary = liveHoldRef.current.summary;
      } else {
        liveHoldRef.current = null;
      }
      const currentView = viewRef.current;
      if (currentView !== "front" && summary.faceCount === 1) {
        facingRef.current = nextProfileFacing(facingRef.current, summary.pose.yaw);
      }
      const next = assessCaptureAlignment(
        {
          view: currentView,
          faceCount: summary.faceCount,
          pose: summary.pose,
          coverage: summary.coverage,
          centerX: summary.centerX,
          centerY: summary.centerY,
          mirroredPreview: true,
          eyeCollapse: summary.eyeCollapse,
          noseLead: summary.noseLead,
          frankfortTilt: summary.frankfortTilt,
          facialHeight: summary.facialHeight,
          anchorX: summary.anchorX,
          anchorY: summary.anchorY,
          orientationSource: summary.orientationSource,
          withinFrame: summary.withinFrame,
          committedFacing: facingRef.current,
        },
        { stable: stableReady.current },
      );
      stableReady.current = next.status === "ready";
      setLive(summary.faceCount > 0 ? summary : null);
      setAssessment(next);
      if (next.status !== "ready") {
        if (retryAtRef.current === null) pauseAuto.current = false;
      } else if (retryAtRef.current !== null && detectedAt >= retryAtRef.current) {
        pauseAuto.current = false;
        retryAtRef.current = null;
        clockRef.current = { since: null, lastOk: null };
      }
      const holdMs = stableHoldMs(currentView);
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

      const deliver = (rawFaces: RawFaceLandmark[][], usedLiveMesh: boolean, detectedAt: number, transform: FacialMatrix | null) => {
        const snapshot = cloneFaces(rawFaces);
        const accepted = onCaptureRef.current({
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
          transform,
          image,
        });
        if (accepted === false) {
          retryAtRef.current = performance.now() + RETRY_CAPTURE_MS;
          pauseAuto.current = true;
          clockRef.current = { since: null, lastOk: null };
          stableReady.current = false;
        }
      };

      if (liveMeshIsFresh({ source: "camera", live, capturedAt, captureFrame })) {
        markCapture("face-detection-start");
        markCapture("face-detection-end");
        measureCapture("face-detection", "face-detection-start", "face-detection-end");
        deliver(latestFacesRef.current, true, latestDetectionTimestampRef.current ?? capturedAt, latestTransformRef.current);
        return;
      }

      setHolding("Checking the photo");
      markCapture("face-detection-start");
      let stillTransform: FacialMatrix | null = null;
      let routed: { faces: RawFaceLandmark[][]; path: "live" | "still" };
      try {
        routed = await withTimeout(
          resolveCaptureFaces({
            source: "camera",
            live,
            capturedAt,
            captureFrame,
            detectStill: async () => {
              const detection = await detectCanvas(canvas, viewRef.current === "front" ? "front" : "profile");
              stillTransform = detection.transforms[0] ?? null;
              return detection.faces;
            },
          }),
          4000,
        );
      } catch (error) {
        if (latestFacesRef.current.length === 0) throw error;
        markCapture("face-detection-end");
        measureCapture("face-detection", "face-detection-start", "face-detection-end");
        deliver(latestFacesRef.current, true, latestDetectionTimestampRef.current ?? capturedAt, latestTransformRef.current);
        return;
      }
      markCapture("face-detection-end");
      measureCapture("face-detection", "face-detection-start", "face-detection-end");
      deliver(routed.faces, routed.path === "live", capturedAt, routed.path === "live" ? latestTransformRef.current : stillTransform);
    } catch (error) {
      setCaptureError(error instanceof Error ? error.message : "Could not capture the photo.");
      retryAtRef.current = performance.now() + RETRY_CAPTURE_MS;
      pauseAuto.current = true;
      clockRef.current = { since: null, lastOk: null };
      stableReady.current = false;
    } finally {
      shooting.current = false;
      setHolding("");
    }
  }

  function cancelHold() {
    pauseAuto.current = true;
    retryAtRef.current = null;
    clockRef.current = { since: null, lastOk: null };
    disarmHold();
  }

  const phaseMessage = phaseText(phase);
  const message = holding || captureError || phaseMessage || assessment.message;
  const mirrorStyle = { transform: "scaleX(-1)" };
  const turned = view !== "front";

  return (
    <div className="mt-5">
      <div className="relative mx-auto overflow-hidden bg-[#14202b]" style={previewFrameStyle(frame.width, frame.height)}>
        <video
          ref={videoRef}
          className={cn("absolute inset-0 z-0 h-full w-full object-contain", phase === "live" ? "opacity-100" : "opacity-0")}
          style={mirrorStyle}
          playsInline
          muted
          autoPlay
          disablePictureInPicture
        />
        <div className="pointer-events-none absolute inset-0 z-10" style={{ ...mirrorStyle, isolation: "isolate", transform: "translateZ(0) scaleX(-1)" }}>
          <CaptureFrameGuide
            width={frame.width}
            height={frame.height}
            view={view}
            status={assessment.status}
            live={phase === "live" ? live : null}
          />
        </div>
      </div>
      {turned && assessment.turn ? (
        <TurnTrack amount={assessment.turn.amount} target={assessment.turn.target} status={assessment.status} />
      ) : null}
      {profileNote ? <p className="mt-3 text-xs leading-5 text-muted">{profileNote}</p> : null}
      <p role="status" className="mt-2 text-sm leading-6 text-ink">
        {message}
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {assessment.checks.map((check) => (
          <li
            key={check.id}
            className={cn(
              "border px-2 py-1 text-xs transition-colors",
              check.ok ? "border-good text-good" : check.blocks ? "border-line text-muted" : "border-[#c9842a]/50 text-[#8a5a16]",
              turned && check.id === "pose" && "px-3 py-1.5 text-sm font-medium",
            )}
          >
            {check.label}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button className="w-full sm:w-auto" onClick={() => void takePhoto()} disabled={phase !== "live" || holding !== ""}>
          {assessment.status === "ready" ? "Capture photo" : "Capture anyway"}
        </Button>
        {pendingCapture ? (
          <Button variant="secondary" onClick={cancelHold}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Checking the photo took too long.")), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
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
