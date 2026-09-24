import { getExistingAnalysisCaller, jsonError } from "@/lib/api";
import { getStore } from "@/lib/data/store";
import { landmarkSaveSchema } from "@/lib/validation/analysis";
import type { SemanticLandmark, SemanticLandmarkKey } from "@/types/face";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ analysisId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const caller = await getExistingAnalysisCaller();
  if (!caller) return jsonError("Sign in required.", 401);
  const { analysisId } = await context.params;
  const parsed = landmarkSaveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Landmark data was not valid.", 400);
  const landmarks = parsed.data.landmarks.map((landmark) => ({
    ...landmark,
    key: landmark.key as SemanticLandmarkKey,
  })) as SemanticLandmark[];
  const store = getStore();
  if (parsed.data.quality) {
    await store.updatePhotoQuality(caller.id, analysisId, parsed.data.view, parsed.data.quality);
  }
  const saved = await store.saveLandmarks(caller.id, analysisId, parsed.data.view, landmarks, {
    detected: parsed.data.detected,
  });
  if (!saved) return jsonError("Analysis not found.", 404);
  return Response.json({ ok: true });
}
