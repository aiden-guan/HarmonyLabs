import { jsonError, requireUser } from "@/lib/api";
import { explainStructured } from "@/lib/ai/explain";
import { streamModelExplanation } from "@/lib/ai/client";
import { buildAnalysisContext } from "@/lib/ai/prompts";
import { getStore } from "@/lib/data/store";
import { isAiConfigured } from "@/lib/env";
import { METRICS } from "@/lib/face/metrics";
import { chatSchema } from "@/lib/validation/analysis";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return jsonError("Sign in required.", 401);
  const parsed = chatSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter a question about this analysis.", 400);
  const store = getStore();
  const analysis = await store.getAnalysis(user.id, parsed.data.analysisId);
  if (!analysis) return jsonError("Analysis not found.", 404);
  if (analysis.status !== "complete") {
    return jsonError("Finish the analysis before asking about scores.", 409);
  }
  const history = await store.listAnalyses(user.id);
  const previousId = history.find((item) => item.id !== analysis.id && item.status === "complete")?.id;
  const previous = previousId ? await store.getAnalysis(user.id, previousId) : null;
  const labels = new Map(METRICS.map((metric) => [metric.id, metric.label]));
  const context = buildAnalysisContext(analysis, previous, labels);
  const mode = isAiConfigured() ? "model" : "structured";
  const encoder = new TextEncoder();
  let full = "";
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      try {
        send({ mode });
        if (mode === "model") {
          for await (const token of streamModelExplanation(parsed.data.message, context)) {
            full += token;
            send({ token });
          }
        } else {
          const text = explainStructured(parsed.data.message, context);
          const parts = text.split(/(\s+)/);
          for (const part of parts) {
            full += part;
            send({ token: part });
          }
        }
        await store.addExchange(user.id, analysis.id, parsed.data.message, full, { context, mode });
        send({ done: true });
      } catch (error) {
        send({
          error: error instanceof Error ? error.message : "The assistant could not answer.",
        });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
    },
  });
}
