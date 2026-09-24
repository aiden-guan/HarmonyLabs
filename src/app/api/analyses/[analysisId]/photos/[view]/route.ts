import { getExistingAnalysisCaller, jsonError } from "@/lib/api";
import { getStore } from "@/lib/data/store";
import type { FaceView } from "@/types/face";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ analysisId: string; view: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const caller = await getExistingAnalysisCaller();
  if (!caller) return jsonError("Sign in required.", 401);
  const { analysisId, view } = await context.params;
  if (view !== "front" && view !== "profile") return jsonError("Unknown photo view.", 404);
  const photo = await getStore().readPhoto(caller.id, analysisId, view as FaceView);
  if (!photo) return jsonError("Photo not found.", 404);
  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "private, no-store",
    },
  });
}
