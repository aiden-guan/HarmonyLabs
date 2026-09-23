import { jsonError, requireUser } from "@/lib/api";
import { getStore } from "@/lib/data/store";
import { assertUploadSize, photoQualitySchema, sniffImageType } from "@/lib/validation/analysis";
import type { FaceView } from "@/types/face";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ analysisId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await requireUser();
  if (!user) return jsonError("Sign in required.", 401);
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
  const qualityRaw = form?.get("quality");
  let quality;
  if (typeof qualityRaw === "string" && qualityRaw) {
    const parsed = photoQualitySchema.safeParse(JSON.parse(qualityRaw));
    if (!parsed.success) return jsonError("Photo quality data was not valid.", 400);
    quality = parsed.data;
  }
  const saved = await getStore().savePhoto(user.id, analysisId, {
    view: view as FaceView,
    bytes,
    contentType,
    width: Math.round(width),
    height: Math.round(height),
    quality,
  });
  if (!saved) return jsonError("Analysis not found.", 404);
  return Response.json({ photo: saved });
}
