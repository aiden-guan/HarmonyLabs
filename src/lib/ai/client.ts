import "server-only";

import { AI_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import type { AnalysisContext } from "@/lib/ai/prompts";

export async function* streamModelExplanation(
  question: string,
  context: AnalysisContext,
): AsyncGenerator<string> {
  const base = process.env.AI_BASE_URL?.replace(/\/$/, "");
  const key = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  if (!base || !key || !model) {
    throw new Error("The language model is not configured.");
  }
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.2,
      messages: [
        { role: "system", content: AI_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Question: ${question}\n\nStructured analysis JSON:\n${JSON.stringify(context)}`,
        },
      ],
    }),
  });
  if (!response.ok || !response.body) {
    throw new Error(`The language model request failed (${response.status}).`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return;
      const payload = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      const token = payload.choices?.[0]?.delta?.content;
      if (token) yield token;
    }
  }
}
