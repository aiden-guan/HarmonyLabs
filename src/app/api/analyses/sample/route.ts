import { getAnalysisCaller, jsonError } from "@/lib/api";
import { getStore } from "@/lib/data/store";
import { sampleLandmarks } from "@/fixtures/sample-face";
import { renderSamplePortrait } from "@/lib/face/synthetic-portrait";
import type { FaceView, PhotoQuality } from "@/types/face";

export const runtime = "nodejs";

export async function POST() {
  const caller = await getAnalysisCaller();
  const store = getStore();
  const analysis = await store.createAnalysis(caller.id, {
    name: "Geometric sample",
    isSample: true,
    adultAcknowledged: true,
    presentationProfile: "neutral",
  });
  for (const view of ["front", "profile"] as FaceView[]) {
    const portrait = renderSamplePortrait(view);
    const saved = await store.savePhoto(caller.id, analysis.id, {
      view,
      bytes: portrait.bytes,
      contentType: "image/png",
      width: portrait.width,
      height: portrait.height,
      quality: sampleQuality(view),
    });
    if (!saved) return jsonError("Could not store the sample image.", 500);
    const landmarksSaved = await store.saveLandmarks(caller.id, analysis.id, view, sampleLandmarks(view), {
      detected: true,
    });
    if (!landmarksSaved) return jsonError("Could not store sample landmarks.", 500);
  }
  return Response.json({ analysisId: analysis.id }, { status: 201 });
}

function sampleQuality(view: FaceView): PhotoQuality {
  return {
    faceDetected: true,
    faceCount: 1,
    yaw: view === "profile" ? 62 : 0,
    pitch: 0,
    roll: 0,
    blurScore: 0.9,
    brightnessScore: 0.7,
    faceCoverage: 0.42,
    warnings: ["This image is a geometric diagram, not a photograph of a person."],
    mirrored: false,
  };
}
