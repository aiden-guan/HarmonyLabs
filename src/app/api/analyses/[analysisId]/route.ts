import { jsonError, requireUser } from "@/lib/api";
import { getStore } from "@/lib/data/store";
import { profileSchema } from "@/lib/validation/analysis";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ analysisId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireUser();
  if (!user) return jsonError("Sign in required.", 401);
  const { analysisId } = await context.params;
  const analysis = await getStore().getAnalysis(user.id, analysisId);
  if (!analysis) return jsonError("Analysis not found.", 404);
  return Response.json({ analysis });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireUser();
  if (!user) return jsonError("Sign in required.", 401);
  const { analysisId } = await context.params;
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter a name up to 80 characters.", 400);
  const existing = await getStore().getAnalysis(user.id, analysisId);
  if (!existing) return jsonError("Analysis not found.", 404);
  await getStore().renameAnalysis(user.id, analysisId, parsed.data.displayName);
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await requireUser();
  if (!user) return jsonError("Sign in required.", 401);
  const { analysisId } = await context.params;
  const deleted = await getStore().deleteAnalysis(user.id, analysisId);
  if (!deleted) return jsonError("Analysis not found.", 404);
  return Response.json({ ok: true });
}
