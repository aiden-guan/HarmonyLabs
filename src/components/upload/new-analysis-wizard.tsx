"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { CameraCapture } from "@/components/upload/camera-capture";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { interpretDetection } from "@/lib/face/interpret";
import { detectRawFace, disposeFaceLandmarker } from "@/lib/mediapipe/face-landmarker";
import { levelPreparedImage, mirrorPreparedImage, prepareImage, type PreparedImage } from "@/lib/face/prepare-image";
import { sampleLandmarks } from "@/fixtures/sample-face";
import type { FaceView, PhotoQuality, SemanticLandmark } from "@/types/face";

const guidance = [
  "Neutral expression",
  "Face clearly visible",
  "Camera near eye level",
  "Minimal perspective distortion",
  "Even lighting",
  "No heavy occlusion",
  "Avoid an extreme close-up",
];

type Step = "setup" | "front" | "profile" | "review";

const steps: Step[] = ["setup", "front", "profile", "review"];
const stepLabels = ["Setup", "Front", "Profile", "Check"];

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

  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">New analysis</p>
      <ol className="mt-4 flex gap-4 text-sm text-muted">
        {stepLabels.map((label, index) => (
          <li key={label} className={index === steps.indexOf(step) ? "text-accent" : ""}>
            {label}
          </li>
        ))}
      </ol>
      <motion.div key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      {step === "setup" ? (
        <form onSubmit={createAnalysis} className="mt-8 space-y-4 border border-line bg-panel p-5">
          <Field label="Analysis name">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Optional" maxLength={80} />
          </Field>
          <p className="text-sm leading-6 text-muted">
            Reference ranges in this version are universal. Sex is not collected, because the scoring engine does not use sex-specific bands yet.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={pending}>Continue</Button>
            <Button type="button" variant="secondary" onClick={useSample} disabled={pending}>
              Load geometric sample
            </Button>
          </div>
        </form>
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
        <section className="mt-8 space-y-4 border border-line bg-panel p-5">
          <h2 className="text-xl">Photo check</h2>
          {(["front", "profile"] as FaceView[]).map((view) => (
            <div key={view}>
              <p className="text-sm font-medium capitalize">{view}</p>
              <ul className="mt-1 text-sm text-muted">
                {(qualities[view]?.warnings.length ? qualities[view]?.warnings : ["No warnings."])?.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
                {qualities[view]?.notes?.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ))}
          <Button onClick={() => { void disposeFaceLandmarker(); router.push(`/analysis/${analysisId}/edit`); }}>
            Review landmarks
          </Button>
        </section>
      ) : null}
      </motion.div>
      {error ? <p role="alert" className="mt-4 text-sm text-signal">{error}</p> : null}
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

  function take(next: File) {
    setFile(next);
    onFile(next);
  }

  return (
    <section className="mt-8 border border-line bg-panel p-5">
      <h2 className="text-xl">{photoLabel}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        {mode === "camera"
          ? view === "profile"
            ? "Turn to one side and look straight ahead, with the ear uncovered. If the far eyebrow is still visible, turn a little more. A small tilt is leveled from the ear to the lower eyelid, and you can move the points on the next screen."
            : "Look straight ahead and settle your face inside the outline. The guide checks distance, level, and pose."
          : view === "profile"
            ? "Use one true side view: look straight ahead, ear uncovered, far eyebrow hidden. A small head tilt is leveled automatically, and a left-facing photo is mirrored before measurement."
            : "Use one face, looking at the camera."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant={mode === "camera" ? "primary" : "secondary"} disabled={pending} onClick={() => setMode("camera")}>
          Use camera
        </Button>
        <Button variant={mode === "upload" ? "primary" : "secondary"} disabled={pending} onClick={() => setMode("upload")}>
          Upload photo
        </Button>
      </div>
      {mode === "camera" ? (
        <CameraCapture view={view} pending={pending} onCapture={take} />
      ) : (
        <>
          <ul className="mt-4 grid gap-1 text-sm text-muted sm:grid-cols-2">
            {guidance.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <label
            className="mt-5 flex min-h-40 cursor-pointer flex-col items-center justify-center border border-dashed border-line bg-white px-4 py-8 text-center text-sm"
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
              <img src={preview} alt="" className="mb-3 max-h-48" />
            ) : (
              <span>Drop a JPEG, PNG, or WebP here, or click to choose one.</span>
            )}
          </label>
        </>
      )}
      {status ? <p className="mt-3 text-sm text-muted">{status}</p> : null}
      {file ? (
        <Button variant="secondary" className="mt-3" disabled={pending} onClick={() => onManual(file)}>
          Place landmarks manually
        </Button>
      ) : null}
    </section>
  );
}
