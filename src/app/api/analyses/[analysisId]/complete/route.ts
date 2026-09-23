import { jsonError, requireUser } from "@/lib/api";
import { getStore } from "@/lib/data/store";
import { completeAnalysis } from "@/lib/face/complete";
import { completeSchema } from "@/lib/validation/analysis";
import type { SemanticLandmark, SemanticLandmarkKey } from "@/types/face";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ analysisId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await requireUser();
  if (!user) return jsonError("Sign in required.", 401);
  const { analysisId } = await context.params;
  const parsed = completeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Both landmark sets are required.", 400);
  const store = getStore();
  const existing = await store.getAnalysis(user.id, analysisId);
  if (!existing) return jsonError("Analysis not found.", 404);
  const toLandmarks = (items: typeof parsed.data.front) =>
    items.map((landmark) => ({
      ...landmark,
      key: landmark.key as SemanticLandmarkKey,
    })) as SemanticLandmark[];
  await store.saveLandmarks(user.id, analysisId, "front", toLandmarks(parsed.data.front), {});
  await store.saveLandmarks(user.id, analysisId, "profile", toLandmarks(parsed.data.profile), {});
  const result = completeAnalysis({
    front: toLandmarks(parsed.data.front),
    profile: toLandmarks(parsed.data.profile),
    qualities: existing.photos.map((photo) => photo.quality),
  });
  const saved = await store.saveResults(user.id, analysisId, result);
  if (!saved) return jsonError("Analysis not found.", 404);
  if (result.status === "failed") return jsonError(result.errorMessage ?? "Scoring failed.", 422);
  return Response.json({
    harmony: result.harmonyScore,
    front: result.frontScore,
    profile: result.profileScore,
  });
}
