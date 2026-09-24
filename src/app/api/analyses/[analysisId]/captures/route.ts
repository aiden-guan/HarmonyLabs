import { getExistingAnalysisCaller, jsonError } from "@/lib/api";
import { getStore } from "@/lib/data/store";
import { assertUploadSize, landmarkInputSchema, photoQualitySchema, sniffImageType } from "@/lib/validation/analysis";
import type { FaceView, SemanticLandmark, SemanticLandmarkKey } from "@/types/face";
import { z } from "zod";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ analysisId: string }> };

const landmarksSchema = z.array(landmarkInputSchema).min(1).max(80);

/**
 * One client request stores the photograph, its quality, and its landmarks.
 * Stores under the signed-in account or the active guest session.
 */
export async function POST(request: Request, context: RouteContext) {
  const caller = await getExistingAnalysisCaller();
  if (!caller) return jsonError("Sign in required.", 401);
  const { analysisId } = await context.params;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const view = form?.get("view");
  const width = Number(form?.get("width"));
  const height = Number(form?.get("height"));
  if (!(file instanceof File) || (view !== "front" && view !== "profile")) {
    return jsonError("Choose a front or profile image.", 400);
  }
  const sizeError = assertUploadSize(file.size);
  if (sizeError) return jsonError(sizeError, 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = sniffImageType(bytes);
  if (!contentType) return jsonError("Use a JPEG, PNG, or WebP image.", 400);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 32 || height < 32) {
    return jsonError("The image dimensions could not be read.", 400);
  }

  let qualityJson: unknown;
  let landmarkJson: unknown;
  try {
    qualityJson = JSON.parse(String(form?.get("quality") ?? ""));
    landmarkJson = JSON.parse(String(form?.get("landmarks") ?? ""));
  } catch {
    return jsonError("Capture data was not valid.", 400);
  }
  const quality = photoQualitySchema.safeParse(qualityJson);
  if (!quality.success) return jsonError("Photo quality data was not valid.", 400);
  const landmarksParsed = landmarksSchema.safeParse(landmarkJson);
  if (!landmarksParsed.success) return jsonError("Landmark data was not valid.", 400);
  const detected = form?.get("detected") === "true";
  const landmarks = landmarksParsed.data.map((landmark) => ({
    ...landmark,
    key: landmark.key as SemanticLandmarkKey,
  })) as SemanticLandmark[];

  const store = getStore();
  const saved = await store.savePhoto(caller.id, analysisId, {
    view: view as FaceView,
    bytes,
    contentType,
    width: Math.round(width),
    height: Math.round(height),
    quality: quality.data,
  });
  if (!saved) return jsonError("Analysis not found.", 404);
  const landmarksSaved = await store.saveLandmarks(caller.id, analysisId, view as FaceView, landmarks, { detected });
  if (!landmarksSaved) return jsonError("Could not save landmarks.", 404);
  return Response.json({ photo: saved, ok: true });
}
