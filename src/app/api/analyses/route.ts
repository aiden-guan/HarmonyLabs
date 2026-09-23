import { jsonError, requireUser } from "@/lib/api";
import { getStore } from "@/lib/data/store";
import { createAnalysisSchema } from "@/lib/validation/analysis";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  if (!user) return jsonError("Sign in required.", 401);
  const analyses = await getStore().listAnalyses(user.id);
  return Response.json({ analyses });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return jsonError("Sign in required.", 401);
  const parsed = createAnalysisSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Enter a shorter analysis name.", 400);
  const name = parsed.data.name || defaultName();
  const analysis = await getStore().createAnalysis(user.id, { name });
  return Response.json({ analysis }, { status: 201 });
}

function defaultName() {
  return `Analysis ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date())}`;
}
