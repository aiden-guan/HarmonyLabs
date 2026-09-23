"use client";

import { FormEvent, useState } from "react";
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
import { CameraCapture } from "@/components/upload/camera-capture";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { interpretDetection } from "@/lib/face/interpret";
import { detectRawFace, disposeFaceLandmarker } from "@/lib/mediapipe/face-landmarker";
import { levelPreparedImage, mirrorPreparedImage, prepareImage, type PreparedImage } from "@/lib/face/prepare-image";
import { sampleLandmarks } from "@/fixtures/sample-face";
import type { FaceView, PhotoQuality, SemanticLandmark } from "@/types/face";
import { cn } from "@/lib/utils";

const frontGuidance = [
  "Face camera directly",
  "Camera at eye level",
  "Neutral facial expression",
  "Even, diffused lighting",
  "No heavy shadows or hair occlusion",
];

const profileGuidance = [
  "True 90° side profile",
  "Ear visible & uncovered",
  "Far eyebrow completely hidden",
  "Look straight ahead",
  "Neutral chin position",
];

type Step = "setup" | "front" | "profile" | "review";

const steps: { id: Step; label: string; number: string }[] = [
  { id: "setup", label: "Setup", number: "01" },
  { id: "front", label: "Front view", number: "02" },
  { id: "profile", label: "Profile view", number: "03" },
  { id: "review", label: "Photo check", number: "04" },
];

export function NewAnalysisWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("setup");
  const [name, setName] = useState("");
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [previews, setPreviews] = useState<Partial<Record<FaceView, string>>>({});
  const [qualities, setQualities] = useState<Partial<Record<FaceView, PhotoQuality>>>({});

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
    setStatus("Preparing geometric sample");
    const response = await fetch("/api/analyses/sample", { method: "POST" });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    setStatus("");
    if (!response.ok) {
      setError(body.error ?? "Could not load the sample.");
      return;
    }
    router.push(`/analysis/${body.analysisId}/edit`);
  }

  async function onFile(view: FaceView, file: File) {
    if (!analysisId) return;
    setPending(true);
    setError("");
    try {
      setStatus("Preparing photo");
      const prepared = await prepareImage(file);
      setStatus("Detecting face");
      let detection;
      try {
        detection = await detectRawFace(prepared.blob, view);
      } catch (reason) {
        throw new Error(
          reason instanceof Error
            ? `${reason.message} You can place landmarks manually if the browser cannot start the detector.`
            : "Face detection failed.",
        );
      }
      setStatus("Mapping landmarks");
      const interpreted = interpretDetection({
        faces: detection.faces,
        view,
        blurScore: prepared.blurScore,
        brightnessScore: prepared.brightnessScore,
        width: prepared.width,
        height: prepared.height,
      });
      if (interpreted.hardError) {
        setError(interpreted.hardError);
        rememberPreview(view, prepared.previewUrl);
        setPending(false);
        setStatus("");
        return;
      }
      const image =
        view === "profile"
          ? await alignProfile(prepared, interpreted.quality.mirrored, interpreted.levelRadians)
          : prepared;
      setStatus("Saving analysis");
      await upload(view, image, interpreted.landmarks, interpreted.quality);
      rememberPreview(view, image.previewUrl);
      setQualities((current) => ({ ...current, [view]: interpreted.quality }));
      setStep(view === "front" ? "profile" : "review");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The photo could not be processed.");
    } finally {
      setPending(false);
      setStatus("");
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
      await upload(view, prepared, landmarks, quality);
      rememberPreview(view, prepared.previewUrl);
      setQualities((current) => ({ ...current, [view]: quality }));
      setStep(view === "front" ? "profile" : "review");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the photo.");
    } finally {
      setPending(false);
    }
  }

  async function upload(
    view: FaceView,
    prepared: { blob: Blob; width: number; height: number },
    landmarks: SemanticLandmark[],
    quality: PhotoQuality,
  ) {
    const form = new FormData();
    form.set("file", new File([prepared.blob], `${view}.jpg`, { type: prepared.blob.type }));
    form.set("view", view);
    form.set("width", String(prepared.width));
    form.set("height", String(prepared.height));
    form.set("quality", JSON.stringify(quality));
    const photo = await fetch(`/api/analyses/${analysisId}/photos`, { method: "POST", body: form });
    const photoBody = await photo.json().catch(() => ({}));
    if (!photo.ok) throw new Error(photoBody.error ?? "Upload failed.");
    const saved = await fetch(`/api/analyses/${analysisId}/landmarks`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ view, landmarks, quality, detected: true }),
    });
    const savedBody = await saved.json().catch(() => ({}));
    if (!saved.ok) throw new Error(savedBody.error ?? "Could not save landmarks.");
  }

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
        <div className="mt-6 grid grid-cols-4 gap-2 sm:gap-4">
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

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
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

          {step === "front" || step === "profile" ? (
            <PhotoStep
              key={step}
              view={step}
              preview={previews[step]}
              pending={pending}
              status={status}
              onFile={(file) => onFile(step, file)}
              onManual={(file) => placeManually(step, file)}
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

      {error ? (
        <div role="alert" className="rounded-md border border-signal/20 bg-signal/5 p-4 text-sm text-signal flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Processing error</p>
            <p className="text-xs leading-relaxed">{error}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
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
  status,
  onFile,
  onManual,
}: {
  view: FaceView;
  preview?: string;
  pending: boolean;
  status: string;
  onFile: (file: File) => void;
  onManual: (file: File) => void;
}) {
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [file, setFile] = useState<File | null>(null);
  const photoLabel = view === "front" ? "Front photograph" : "Profile photograph";
  const guidance = view === "front" ? frontGuidance : profileGuidance;

  function take(next: File) {
    setFile(next);
    onFile(next);
  }

  return (
    <Card className="border border-line bg-panel shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle>{photoLabel}</CardTitle>
            <CardDescription className="mt-1">
              {view === "front"
                ? "Direct canonical face photo with neutral expression at eye level."
                : "True 90° side profile with ear visible and far eyebrow hidden."}
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
        {mode === "camera" ? (
          <div className="space-y-4">
            <CameraCapture view={view} pending={pending} onCapture={take} />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Guidance chips */}
            <div className="rounded-md border border-line bg-panel-muted p-3">
              <span className="font-semibold text-xs text-ink block mb-2">
                Requirements for accurate geometry:
              </span>
              <ul className="grid gap-1.5 sm:grid-cols-2 text-xs text-muted">
                {guidance.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

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
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label={photoLabel}
                className="sr-only"
                onChange={(event) => {
                  const picked = event.target.files?.[0];
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

        {status ? (
          <p className="mt-3 text-xs font-mono text-accent animate-pulse">
            Status: {status}…
          </p>
        ) : null}

        {file ? (
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
