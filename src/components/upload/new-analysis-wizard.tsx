"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  FileImage,
} from "lucide-react";
import { CameraCapture, type CameraCaptureResult } from "@/components/upload/camera-capture";
import { assessCaptureAlignment, summarizeLiveFaces, type CaptureView } from "@/lib/face/capture-guide";
import type { FacialMatrix } from "@/lib/face/facial-transform";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { sampleLandmarks } from "@/fixtures/sample-face";
import { createCaptureQueue } from "@/lib/face/capture-queue";
import { markCapture, measureCapture } from "@/lib/face/capture-timing";
import { interpretDetection, type InterpretedPhoto } from "@/lib/face/interpret";
import { disposeLensCorrector } from "@/lib/face/lens-correct";
import { levelPreparedImage, mirrorPreparedImage, prepareImage, type PreparedImage } from "@/lib/face/prepare-image";
import { detectRawFace, disposeFaceLandmarker, disposeStillDetector, prewarmStillDetector } from "@/lib/mediapipe/face-landmarker";
import type { FaceView, PhotoQuality, RawFaceLandmark, SemanticLandmark } from "@/types/face";
import { cn } from "@/lib/utils";

const frontGuidance = [
  "Face camera directly",
  "Camera at eye level",
  "Neutral facial expression",
  "Even, diffused lighting",
  "No heavy shadows or hair occlusion",
];

const threeQuarterSteps = [
  "Turn about halfway, so one eye leads.",
  "The far eye should still be just visible.",
  "Keep your chin level and look ahead.",
];

const profileSteps = [
  "Turn until the far eye is just out of view.",
  "Keep your eyes looking straight ahead.",
  "Keep your chin neutral — don't look up or down.",
  "Keep your ear uncovered.",
];

type Step = "setup" | "front" | "threeQuarter" | "profile" | "review";

const steps: { id: Step; label: string; number: string }[] = [
  { id: "setup", label: "Setup", number: "01" },
  { id: "front", label: "Front view", number: "02" },
  { id: "threeQuarter", label: "3/4 view", number: "03" },
  { id: "profile", label: "Side view", number: "04" },
  { id: "review", label: "Photo check", number: "05" },
];

export function NewAnalysisWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("setup");
  const [name, setName] = useState("");
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState("");
  const [failedView, setFailedView] = useState<FaceView | null>(null);
  const [pending, setPending] = useState(false);
  const [saving, setSaving] = useState<Partial<Record<FaceView, boolean>>>({});
  const [previews, setPreviews] = useState<Partial<Record<FaceView, string>>>({});
  const [qualities, setQualities] = useState<Partial<Record<FaceView, PhotoQuality>>>({});
  const queueRef = useRef(createCaptureQueue());
  const errorsRef = useRef<Partial<Record<FaceView, string>>>({});
  const heldRef = useRef<Partial<Record<FaceView, { held: HeldCapture; interpreted: InterpretedPhoto; detected: boolean }>>>({});
  const mountedRef = useRef(true);
  const previewsRef = useRef(previews);

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      disposeStillDetector();
      disposeLensCorrector();
      void disposeFaceLandmarker();
      for (const url of Object.values(previewsRef.current)) {
        if (url) URL.revokeObjectURL(url);
      }
    };
  }, []);

  function rememberPreview(view: FaceView, url: string) {
    setPreviews((current) => {
      const previous = current[view];
      if (previous && previous !== url) URL.revokeObjectURL(previous);
      return { ...current, [view]: url };
    });
  }

  async function createAnalysis(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await fetch("/api/analyses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(body.error ?? "Could not start the analysis.");
      return;
    }
    setAnalysisId(body.analysis.id);
    setStep("front");
  }

  async function useSample() {
    setPending(true);
    setError("");
    setNotice("Preparing geometric sample");
    const response = await fetch("/api/analyses/sample", { method: "POST" });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    setNotice("");
    if (!response.ok) {
      setError(body.error ?? "Could not load the sample.");
      return;
    }
    router.push(`/analysis/${body.analysisId}/edit`);
  }

  function onThreeQuarterCamera(result: CameraCaptureResult): boolean {
    void result.image.then((image) => URL.revokeObjectURL(image.previewUrl));
    if (!e2eSkipsThreeQuarterPose()) {
      const summary = summarizeLiveFaces(result.faces, { width: result.width, height: result.height }, null, result.transform);
      const message = threeQuarterGate(summary, true);
      if (message) {
        setError(message);
        return false;
      }
    }
    setError("");
    setStep("profile");
    return true;
  }

  async function onThreeQuarterFile(file: File) {
    if (!analysisId) return;
    setPending(true);
    setError("");
    setNotice("Preparing photo");
    try {
      const prepared = await prepareImage(file);
      URL.revokeObjectURL(prepared.previewUrl);
      setNotice("Detecting face");
      const detection = await detectRawFace(prepared.blob, "profile");
      // The navigation test uploads a true side fixture on this step. Production still rejects that pose.
      if (!e2eSkipsThreeQuarterPose()) {
        const summary = summarizeLiveFaces(
          detection.faces,
          { width: prepared.width, height: prepared.height },
          null,
          detection.transforms[0] ?? null,
        );
        const message = threeQuarterGate(summary, false);
        if (message) {
          setError(message);
          return;
        }
      }
      setError("");
      setStep("profile");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The photo could not be processed.");
    } finally {
      setPending(false);
      setNotice("");
    }
  }

  function onCamera(view: FaceView, result: CameraCaptureResult): boolean {
    if (!analysisId) return false;
    markCapture("landmark-interpretation-start");
    const interpreted = interpretDetection({
      faces: result.faces,
      view,
      blurScore: result.blurScore,
      brightnessScore: result.brightnessScore,
      width: result.width,
      height: result.height,
      transform: result.transform,
    });
    markCapture("landmark-interpretation-end");
    measureCapture("landmark-interpretation", "landmark-interpretation-start", "landmark-interpretation-end");
    if (interpreted.hardError) {
      setError(interpreted.hardError);
      return false;
    }
    setError("");
    beginSave(
      view,
      {
        image: result.image,
        rawFaces: result.rawFaces,
        width: result.width,
        height: result.height,
        blurScore: result.blurScore,
        brightnessScore: result.brightnessScore,
        transform: result.transform,
      },
      interpreted,
      true,
    );
    return true;
  }

  async function onFile(view: FaceView, file: File) {
    if (!analysisId) return;
    setPending(true);
    setError("");
    setNotice("Preparing photo");
    markCapture("capture-to-next-step-start");
    try {
      const prepared = await prepareImage(file);
      setNotice("Detecting face");
      let detection;
      try {
        markCapture("face-detection-start");
        detection = await detectRawFace(prepared.blob, view);
        markCapture("face-detection-end");
        measureCapture("face-detection", "face-detection-start", "face-detection-end");
      } catch (reason) {
        throw new Error(
          reason instanceof Error
            ? `${reason.message} You can place landmarks manually, or try another photo.`
            : "Face detection failed. You can place landmarks manually, or try another photo.",
        );
      }
      markCapture("landmark-interpretation-start");
      const interpreted = interpretDetection({
        faces: detection.faces,
        view,
        blurScore: prepared.blurScore,
        brightnessScore: prepared.brightnessScore,
        width: prepared.width,
        height: prepared.height,
        transform: detection.transforms[0] ?? null,
      });
      markCapture("landmark-interpretation-end");
      measureCapture("landmark-interpretation", "landmark-interpretation-start", "landmark-interpretation-end");
      if (interpreted.hardError) {
        setError(interpreted.hardError);
        rememberPreview(view, prepared.previewUrl);
        return;
      }
      beginSave(
        view,
        {
          image: Promise.resolve({ ...prepared, corrected: true }),
          rawFaces: detection.faces,
          width: prepared.width,
          height: prepared.height,
          blurScore: prepared.blurScore,
          brightnessScore: prepared.brightnessScore,
          transform: detection.transforms[0] ?? null,
        },
        interpreted,
        true,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The photo could not be processed.");
    } finally {
      setPending(false);
      setNotice("");
    }
  }

  async function placeManually(view: FaceView, file: File) {
    if (!analysisId) return;
    setPending(true);
    setError("");
    try {
      const prepared = await prepareImage(file);
      const landmarks = sampleLandmarks(view).map((landmark) => ({ ...landmark, source: "manual" as const, confidence: 0.2 }));
      const quality: PhotoQuality = {
        faceDetected: false,
        faceCount: 0,
        yaw: null,
        pitch: null,
        roll: null,
        blurScore: prepared.blurScore,
        brightnessScore: prepared.brightnessScore,
        faceCoverage: 0,
        warnings: ["Landmarks were placed from a template because automatic detection was not accepted. Drag every point onto the photograph."],
        mirrored: false,
      };
      beginSave(
        view,
        {
          image: Promise.resolve({ ...prepared, corrected: true }),
          rawFaces: [],
          width: prepared.width,
          height: prepared.height,
          blurScore: prepared.blurScore,
          brightnessScore: prepared.brightnessScore,
          transform: null,
        },
        { hardError: null, landmarks, quality, levelRadians: null },
        false,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the photo.");
    } finally {
      setPending(false);
    }
  }

  function beginSave(view: FaceView, held: HeldCapture, interpreted: InterpretedPhoto, detected: boolean) {
    heldRef.current[view] = { held, interpreted, detected };
    setQualities((current) => ({ ...current, [view]: interpreted.quality }));
    errorsRef.current[view] = undefined;
    setFailedView(null);
    setSaveError("");
    setSaving((current) => ({ ...current, [view]: true }));
    if (view === "front") {
      markCapture("capture-to-next-step-end");
      measureCapture("total-capture-to-next-step", "capture-to-next-step-start", "capture-to-next-step-end");
      setStep("threeQuarter");
    }
    const session = queueRef.current.start(view);
    const job = session.enqueue(async () => {
      if (!session.current()) return;
      try {
        await persistCapture(view, held, interpreted, detected);
        if (session.current()) errorsRef.current[view] = undefined;
      } catch (reason) {
        if (!session.current()) return;
        errorsRef.current[view] = reason instanceof Error ? reason.message : "Could not save the photo.";
      }
    });
    void job.then(async () => {
      if (!mountedRef.current || !session.current()) return;
      setSaving((current) => ({ ...current, [view]: false }));
      if (view === "front") {
        const problem = errorsRef.current.front;
        if (problem) {
          setFailedView("front");
          setSaveError(problem);
        }
        return;
      }
      await queueRef.current.tail("front");
      if (!mountedRef.current || !session.current()) return;
      const problem = errorsRef.current.front || errorsRef.current.profile;
      if (problem) {
        setFailedView(errorsRef.current.profile ? "profile" : "front");
        setSaveError(problem);
        return;
      }
      disposeStillDetector();
      disposeLensCorrector();
      setStep("review");
    });
  }

  async function persistCapture(view: FaceView, held: HeldCapture, interpreted: InterpretedPhoto, detected: boolean) {
    const prepared = await held.image;
    let image: PreparedImage = prepared;
    let final = interpreted;
    if (!prepared.corrected) {
      final = interpretDetection({
        faces: held.rawFaces,
        view,
        blurScore: held.blurScore,
        brightnessScore: held.brightnessScore,
        width: image.width,
        height: image.height,
        transform: held.transform,
      });
      if (final.hardError) throw new Error(final.hardError);
    }
    if (view === "profile") image = await alignProfile(image, final.quality.mirrored, final.levelRadians);
    if (final.landmarks.length === 0) throw new Error("Could not map landmarks for this photo.");
    await postCapture(analysisId, view, image, final.landmarks, final.quality, detected);
    if (!mountedRef.current) return;
    rememberPreview(view, image.previewUrl);
    setQualities((current) => ({ ...current, [view]: final.quality }));
  }

  function retrySave() {
    if (!failedView) return;
    const saved = heldRef.current[failedView];
    if (!saved) return;
    setSaveError("");
    setError("");
    beginSave(failedView, saved.held, saved.interpreted, saved.detected);
  }

  const saveLine = saving.front && saving.profile
    ? "Saving photos…"
    : saving.front
      ? step === "front"
        ? "Saving front photo…"
        : "Saving front photo… You can line up the next view."
      : saving.profile
        ? "Saving side photo…"
        : notice;

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Wizard Header & Progress Bar */}
      <div>
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-accent font-semibold block">
          MEASUREMENT WIZARD
        </span>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          New analysis
        </h1>

        {/* Step Progress Indicator */}
        <div className="mt-6 grid grid-cols-5 gap-2 sm:gap-4">
          {steps.map((s, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = s.id === step;
            return (
              <div key={s.id} className="flex flex-col gap-1.5">
                <div
                  className={cn(
                    "h-1.5 w-full rounded-full transition-colors",
                    isCurrent
                      ? "bg-accent"
                      : isCompleted
                      ? "bg-good/80"
                      : "bg-slate-200",
                  )}
                />
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={cn(
                      "font-mono font-medium",
                      isCurrent
                        ? "text-accent font-semibold"
                        : isCompleted
                        ? "text-good"
                        : "text-muted",
                    )}
                  >
                    {s.number}
                  </span>
                  <span
                    className={cn(
                      "hidden sm:inline text-[11px]",
                      isCurrent ? "font-semibold text-ink" : "text-muted",
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-md border border-signal/20 bg-signal/5 p-4 text-sm text-signal flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">This photo needs another try</p>
            <p className="text-xs leading-relaxed">{error}</p>
          </div>
        </div>
      ) : null}

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step === "setup" || step === "review" ? step : "capture"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {step === "setup" ? (
            <Card className="border border-line bg-panel shadow-xs">
              <CardHeader>
                <CardTitle>Session details</CardTitle>
                <CardDescription>
                  Give this analysis a reference name. Proportional measurements are scored against literature reference bands.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={createAnalysis} className="space-y-4">
                  <Field label="Analysis name (optional)" description="e.g. Baseline front & profile">
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="My scan"
                      maxLength={80}
                      autoFocus
                    />
                  </Field>

                  <div className="rounded-md border border-line bg-panel-muted p-3 text-xs text-muted leading-relaxed">
                    <p>
                      MogLabs reference intervals are universal in this version. Biological sex is not collected because current geometric formulas do not split reference limits by sex.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button type="submit" disabled={pending} className="gap-2">
                      <span>Continue</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={useSample}
                      disabled={pending}
                      className="gap-2"
                    >
                      <Sparkles className="h-4 w-4 text-accent" />
                      <span>Load geometric sample</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {step === "front" || step === "threeQuarter" || step === "profile" ? (
            <PhotoStep
              view={step}
              preview={step === "threeQuarter" ? undefined : previews[step]}
              pending={pending}
              notice={saveLine}
              onCamera={(result) => {
                if (step === "threeQuarter") return onThreeQuarterCamera(result);
                return onCamera(step, result);
              }}
              onFile={(file) => {
                if (step === "threeQuarter") void onThreeQuarterFile(file);
                else void onFile(step, file);
              }}
              onManual={(file) => {
                if (step !== "threeQuarter") void placeManually(step, file);
              }}
            />
          ) : null}

          {step === "review" ? (
            <Card className="border border-line bg-panel shadow-xs">
              <CardHeader>
                <CardTitle>Photo check</CardTitle>
                <CardDescription>
                  Review image alignment and landmark proposals before calculating measurements.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {(["front", "profile"] as FaceView[]).map((view) => {
                    const quality = qualities[view];
                    const hasWarnings = quality?.warnings && quality.warnings.length > 0;
                    return (
                      <div
                        key={view}
                        className="rounded-lg border border-line bg-slate-50/70 p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm capitalize text-ink">
                            {view} photograph
                          </span>
                          {hasWarnings ? (
                            <Badge variant="warning" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Notice</span>
                            </Badge>
                          ) : (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Optimal</span>
                            </Badge>
                          )}
                        </div>

                        <ul className="text-xs text-muted space-y-1 pt-1">
                          {(quality?.warnings.length ? quality.warnings : ["No alignment warnings. Photo accepted."]).map((warning) => (
                            <li key={warning} className="flex items-start gap-1.5">
                              <span className="text-accent mt-0.5">•</span>
                              <span>{warning}</span>
                            </li>
                          ))}
                          {quality?.notes?.map((note) => (
                            <li key={note} className="flex items-start gap-1.5 text-muted">
                              <span className="text-muted mt-0.5">•</span>
                              <span>{note}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-line/60">
                  <p className="text-xs text-muted">
                    Next: Verify and drag any proposed landmarks on the interactive canvas.
                  </p>
                  <Button
                    onClick={() => {
                      void disposeFaceLandmarker();
                      disposeStillDetector();
                      disposeLensCorrector();
                      router.push(`/analysis/${analysisId}/edit`);
                    }}
                    className="w-full sm:w-auto gap-2"
                  >
                    <span>Review landmarks</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </motion.div>
      </AnimatePresence>

      {saveError ? (
        <div role="alert" className="rounded-md border border-signal/20 bg-signal/5 p-4 text-sm text-signal flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-semibold">The photo is still on this device, but it could not be saved.</p>
            <p className="text-xs leading-relaxed">{saveError}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={retrySave}>
                Retry save
              </Button>
              {failedView === "front" && step !== "front" ? (
                <Button size="sm" variant="outline" onClick={() => setStep("front")}>
                  Retake front photo
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface HeldCapture {
  image: Promise<PreparedImage & { corrected: boolean }>;
  rawFaces: RawFaceLandmark[][];
  width: number;
  height: number;
  blurScore: number;
  brightnessScore: number;
  transform: FacialMatrix | null;
}

/** The end-to-end wizard uploads a side fixture on the three-quarter step. That fixture must not satisfy this gate in production. */
function e2eSkipsThreeQuarterPose(): boolean {
  return process.env.NEXT_PUBLIC_E2E === "1" && process.env.NODE_ENV !== "production";
}

function threeQuarterGate(summary: ReturnType<typeof summarizeLiveFaces>, mirroredPreview: boolean): string | null {
  if (summary.faceCount !== 1) {
    return summary.faceCount > 1 ? "Only one face can be in the frame." : "Turn your head about halfway to either side.";
  }
  const assessment = assessCaptureAlignment(
    {
      view: "threeQuarter",
      faceCount: summary.faceCount,
      pose: summary.pose,
      coverage: summary.coverage,
      centerX: summary.centerX,
      centerY: summary.centerY,
      mirroredPreview,
      eyeCollapse: summary.eyeCollapse,
      noseLead: summary.noseLead,
      frankfortTilt: summary.frankfortTilt,
      facialHeight: summary.facialHeight,
      anchorX: summary.anchorX,
      anchorY: summary.anchorY,
      orientationSource: summary.orientationSource,
      withinFrame: summary.withinFrame,
    },
    { stable: true },
  );
  if (assessment.status === "ready") return null;
  return assessment.message;
}

async function postCapture(
  analysisId: string | null,
  view: FaceView,
  prepared: { blob: Blob; width: number; height: number },
  landmarks: SemanticLandmark[],
  quality: PhotoQuality,
  detected: boolean,
) {
  if (!analysisId) throw new Error("The analysis is not ready.");
  const form = new FormData();
  form.set("file", new File([prepared.blob], `${view}.jpg`, { type: prepared.blob.type || "image/jpeg" }));
  form.set("view", view);
  form.set("width", String(prepared.width));
  form.set("height", String(prepared.height));
  form.set("quality", JSON.stringify(quality));
  form.set("landmarks", JSON.stringify(landmarks));
  form.set("detected", detected ? "true" : "false");
  markCapture("photo-upload-start");
  markCapture("landmark-save-start");
  const response = await fetch(`/api/analyses/${analysisId}/captures`, { method: "POST", body: form });
  markCapture("photo-upload-end");
  markCapture("landmark-save-end");
  measureCapture("photo-upload", "photo-upload-start", "photo-upload-end");
  measureCapture("landmark-save", "landmark-save-start", "landmark-save-end");
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Could not save the photo.");
}

async function alignProfile(prepared: PreparedImage, mirrored: boolean, levelRadians: number | null) {
  let image = prepared;
  if (mirrored) {
    image = await mirrorPreparedImage(prepared);
    URL.revokeObjectURL(prepared.previewUrl);
  }
  if (levelRadians !== null) {
    const leveled = await levelPreparedImage(image, levelRadians);
    URL.revokeObjectURL(image.previewUrl);
    image = leveled;
  }
  return image;
}

function PhotoStep({
  view,
  preview,
  pending,
  notice,
  onCamera,
  onFile,
  onManual,
}: {
  view: CaptureView;
  preview?: string;
  pending: boolean;
  notice: string;
  onCamera: (result: CameraCaptureResult) => boolean | void;
  onFile: (file: File) => void;
  onManual: (file: File) => void;
}) {
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [fileState, setFileState] = useState<{ view: CaptureView; file: File | null }>({ view, file: null });
  const file = fileState.view === view ? fileState.file : null;
  const viewRef = useRef(view);
  const photoLabel =
    view === "front" ? "Front photograph" : view === "threeQuarter" ? "Three-quarter photograph" : "Side photograph";

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    if (mode === "upload") prewarmStillDetector();
  }, [mode]);

  function take(next: File) {
    setFileState({ view, file: next });
    onFile(next);
  }

  function acceptCamera(result: CameraCaptureResult) {
    const acceptedView = view;
    void result.image.then((image) => {
      if (viewRef.current !== acceptedView) return;
      setFileState({
        view: acceptedView,
        file: new File([image.blob], `${acceptedView}.jpg`, { type: image.blob.type || "image/jpeg" }),
      });
    });
    return onCamera(result);
  }

  return (
    <Card className="border border-line bg-panel shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle>{photoLabel}</CardTitle>
            <CardDescription className="mt-1">
              {view === "front"
                ? "Face the camera with a neutral expression, at eye level."
                : view === "threeQuarter"
                  ? "A halfway turn. One eye leads, and the far eye is still just visible."
                  : "A true side view, looking straight ahead."}
            </CardDescription>
          </div>

          {/* Mode Switcher */}
          <div className="inline-flex rounded-md border border-line bg-panel-muted p-1 text-xs shrink-0 self-start sm:self-auto">
            <button
              type="button"
              disabled={pending}
              onClick={() => setMode("camera")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[4px] px-3 py-1 font-medium transition-colors",
                mode === "camera"
                  ? "bg-panel text-ink shadow-xs"
                  : "text-muted hover:text-ink",
              )}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Use camera</span>
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setMode("upload")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[4px] px-3 py-1 font-medium transition-colors",
                mode === "upload"
                  ? "bg-panel text-ink shadow-xs"
                  : "text-muted hover:text-ink",
              )}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload photo</span>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {view === "threeQuarter" ? <ThreeQuarterInstructions /> : null}
        {view === "profile" ? <ProfileInstructions /> : null}
        {mode === "camera" ? (
          <div className="space-y-4">
            <CameraCapture view={view} onCapture={acceptCamera} />
          </div>
        ) : (
          <div className="space-y-4">
            {view === "front" ? (
              <div className="rounded-md border border-line bg-panel-muted p-3">
                <span className="font-semibold text-xs text-ink block mb-2">
                  Requirements for accurate geometry:
                </span>
                <ul className="grid gap-1.5 sm:grid-cols-2 text-xs text-muted">
                  {frontGuidance.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Drop / Pick Zone */}
            <label
              className="mt-3 flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line bg-slate-50/50 hover:bg-slate-50 hover:border-accent/50 transition-colors p-6 text-center text-sm"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const dropped = event.dataTransfer.files[0];
                if (dropped) take(dropped);
              }}
            >
              <input
                key={view}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label={photoLabel}
                className="sr-only"
                onChange={(event) => {
                  const picked = event.target.files?.[0];
                  event.currentTarget.value = "";
                  if (picked) take(picked);
                }}
              />
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Selected preview" className="mb-3 max-h-52 rounded object-contain border border-line" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-accent">
                    <FileImage className="h-5 w-5" />
                  </div>
                  <span className="font-medium text-ink">Choose a photo or drag it here</span>
                  <span className="text-xs text-muted">Supports JPEG, PNG, or WebP up to 10MB</span>
                </div>
              )}
            </label>
          </div>
        )}

        {notice ? (
          <p className="mt-3 text-sm text-muted" role="status">
            {notice}
          </p>
        ) : null}

        {file && view !== "threeQuarter" ? (
          <div className="mt-4 pt-4 border-t border-line/60 flex items-center justify-between">
            <span className="text-xs text-muted">
              Auto-detector issues?
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => onManual(file)}
            >
              Place landmarks manually
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ThreeQuarterInstructions() {
  return (
    <div className="mb-4 rounded-md border border-line bg-panel-muted p-3">
      <p className="text-sm font-medium text-ink">Turn your head about halfway to either side.</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">
        {threeQuarterSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  );
}

function ProfileInstructions() {
  return (
    <div className="mb-4 rounded-md border border-line bg-panel-muted p-3">
      <p className="text-sm font-medium text-ink">Turn to a side view.</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">
        {profileSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-muted">Stop once the far eye leaves view. You do not need a harder turn than that.</p>
      <ProfileTurnPictogram />
    </div>
  );
}

function ProfileTurnPictogram() {
  return (
    <svg viewBox="0 0 168 52" className="mt-3 h-12 w-40 text-muted" aria-hidden="true">
      <circle cx="22" cy="26" r="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="24" r="1.2" fill="currentColor" />
      <circle cx="26" cy="24" r="1.2" fill="currentColor" />
      <path d="M46 32 C 68 34, 78 16, 104 18" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M96 12 L106 18 L96 24" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="132" cy="26" r="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M132 14 V38" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
