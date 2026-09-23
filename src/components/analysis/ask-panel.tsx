"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";

const suggestions = [
  "Explain my profile score.",
  "What measurements are furthest from reference?",
  "Why is my front score higher?",
  "What changed between my last analysis and this one?",
  "Which measurements have the most impact?",
];

export function AskPanel({ analysisId, disabled }: { analysisId: string; disabled: boolean }) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string; mode?: string }>>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function ask(question: string) {
    if (!question.trim() || disabled) return;
    setPending(true);
    setError("");
    setMessages((current) => [...current, { role: "user", content: question }]);
    setDraft("");
    let assistant = "";
    let mode = "";
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId, message: question }),
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "The assistant could not answer.");
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
          if (!line.startsWith("data: ")) continue;
          const payload = JSON.parse(line.slice(6)) as { token?: string; error?: string; mode?: string };
          if (payload.error) throw new Error(payload.error);
          if (payload.mode) mode = payload.mode;
          if (payload.token) {
            assistant += payload.token;
            const snapshot = assistant;
            const snapshotMode = mode;
            setMessages((current) => {
              const next = [...current];
              const last = next[next.length - 1];
              if (last?.role === "assistant") next[next.length - 1] = { role: "assistant", content: snapshot, mode: snapshotMode };
              else next.push({ role: "assistant", content: snapshot, mode: snapshotMode });
              return next;
            });
          }
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The assistant could not answer.");
    } finally {
      setPending(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(draft);
  }

  return (
    <div className="mt-6 space-y-4">
      {disabled ? <p className="text-sm text-muted">Calculate the analysis before asking about it.</p> : null}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((prompt) => (
          <button key={prompt} type="button" disabled={disabled || pending} onClick={() => void ask(prompt)} className="border border-line bg-panel px-3 py-2 text-left text-sm">
            {prompt}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className="border border-line bg-panel p-4 text-sm leading-6">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">
              {message.role === "user" ? "You" : message.mode === "model" ? "Assistant" : "Structured explanation"}
            </p>
            <p className="mt-2 whitespace-pre-wrap">{message.content}</p>
          </article>
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input value={draft} onChange={(event) => setDraft(event.target.value)} className="h-10 flex-1 border border-line bg-white px-3 text-sm" placeholder="Ask about these measurements" disabled={disabled || pending} />
        <Button type="submit" disabled={disabled || pending}>Ask</Button>
      </form>
      {error ? <p role="alert" className="text-sm text-signal">{error}</p> : null}
    </div>
  );
}
